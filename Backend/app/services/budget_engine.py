import calendar
from datetime import datetime, date, time
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.budget import UserPreference
from app.models.transaction import Transaction
from app.schemas.budget import DailyBudgetSummary

class BudgetEngine:
    @staticmethod
    def get_days_in_month(target_date: date) -> int:
        """Returns the actual number of days in the given month, accounting for leap years."""
        _, num_days = calendar.monthrange(target_date.year, target_date.month)
        return num_days

    @staticmethod
    def calculate_starting_daily_allowance(
        monthly_income: float,
        fixed_expenses: float,
        savings_target: float,
        emergency_reserve: float,
        budget_mode: str = "smart",
        calculation_period: str = "month_calendar",
        target_date: Optional[date] = None
    ) -> tuple[float, int, float]:
        """
        Calculates:
        1. Starting daily allowance
        2. Total days in the budget period
        3. Remaining flexible monthly budget
        """
        ref_date = target_date or date.today()
        
        if calculation_period == "rolling_30":
            days_in_period = 30
        else:
            days_in_period = BudgetEngine.get_days_in_month(ref_date)

        if budget_mode == "simple":
            flexible_monthly_budget = max(0.0, monthly_income)
        else:
            # Smart Mode: Income minus fixed expenses, savings targets, and emergency reserves
            flexible_monthly_budget = max(0.0, monthly_income - fixed_expenses - savings_target - emergency_reserve)

        daily_allowance = flexible_monthly_budget / days_in_period if days_in_period > 0 else 0.0
        return round(daily_allowance, 2), days_in_period, round(flexible_monthly_budget, 2)

    @classmethod
    def compute_daily_summary(
        cls,
        db: Session,
        user_id: str,
        target_date: Optional[date] = None
    ) -> DailyBudgetSummary:
        ref_date = target_date or date.today()
        now = datetime.now()
        
        # Determine Greeting based on hour
        current_hour = now.hour
        if 4 <= current_hour < 12:
            greeting = "Good morning!"
        elif 12 <= current_hour < 17:
            greeting = "Good afternoon!"
        elif 17 <= current_hour < 22:
            greeting = "Good evening!"
        else:
            greeting = "Good night!"

        # Fetch User Preferences
        pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        if not pref:
            # Default fallback preference
            pref = UserPreference(
                user_id=user_id,
                monthly_income=100000.0,
                fixed_expenses=20000.0,
                savings_target=20000.0,
                emergency_reserve=0.0,
                budget_mode="smart",
                calculation_period="month_calendar"
            )

        daily_allowance, days_in_period, flexible_budget = cls.calculate_starting_daily_allowance(
            monthly_income=pref.monthly_income,
            fixed_expenses=pref.fixed_expenses,
            savings_target=pref.savings_target,
            emergency_reserve=pref.emergency_reserve,
            budget_mode=pref.budget_mode,
            calculation_period=pref.calculation_period,
            target_date=ref_date
        )

        # Query today's transactions
        day_start = datetime.combine(ref_date, time.min)
        day_end = datetime.combine(ref_date, time.max)

        transactions_today: List[Transaction] = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= day_start,
            Transaction.transaction_date <= day_end,
            Transaction.is_pending == False
        ).all()

        spent_today = 0.0
        refunds_today = 0.0

        for tx in transactions_today:
            # Transfers are not expenses
            if tx.type == "transfer":
                continue
            # Salary and income are not expenses
            if tx.type == "income" or tx.direction == "credit" and tx.type != "refund":
                continue
            # Refunds reduce spending
            if tx.type == "refund" or (tx.direction == "credit" and "refund" in tx.title.lower()):
                refunds_today += tx.amount
            elif tx.direction == "debit" and tx.type == "expense":
                spent_today += tx.amount

        net_spent_today = max(0.0, spent_today - refunds_today)
        remaining_allowance = round(daily_allowance - net_spent_today, 2)
        
        if daily_allowance > 0:
            percentage_consumed = round((net_spent_today / daily_allowance) * 100, 1)
        else:
            percentage_consumed = 100.0 if net_spent_today > 0 else 0.0

        is_overbudget = net_spent_today > daily_allowance
        overspent_amount = round(max(0.0, net_spent_today - daily_allowance), 2)

        # Warning level evaluation based on configurable thresholds
        thresholds = [int(t.strip()) for t in pref.warning_thresholds.split(",") if t.strip().isdigit()]
        if not thresholds:
            thresholds = [50, 75, 90, 100]

        warning_level = "normal"
        warning_message = None

        if is_overbudget:
            warning_level = "exceeded"
            warning_message = f"You've exceeded today's budget by ₹{overspent_amount:,.0f}."
        elif percentage_consumed >= 90:
            warning_level = "90_percent"
            warning_message = f"Warning: 90% of today's budget consumed. Only ₹{max(0.0, remaining_allowance):,.0f} left!"
        elif percentage_consumed >= 75:
            warning_level = "75_percent"
            warning_message = f"Only ₹{max(0.0, remaining_allowance):,.0f} remains in your daily allowance."
        elif percentage_consumed >= 50:
            warning_level = "50_percent"
            warning_message = "You've used 50% of today's budget."

        # Notification Previews
        morning_notification = (
            f"Good morning! Your spending allowance for today is ₹{daily_allowance:,.0f}. Let's make it count."
        )
        if is_overbudget:
            evening_summary = (
                f"You spent ₹{net_spent_today:,.0f} today against a ₹{daily_allowance:,.0f} budget. "
                f"You're ₹{overspent_amount:,.0f} over budget."
            )
        else:
            evening_summary = (
                f"You spent ₹{net_spent_today:,.0f} today. "
                f"You saved ₹{remaining_allowance:,.0f} of your ₹{daily_allowance:,.0f} daily allowance!"
            )

        # Month-to-date calculation
        month_start = datetime(ref_date.year, ref_date.month, 1)
        month_txs = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date <= day_end,
            Transaction.direction == "debit",
            Transaction.type == "expense",
            Transaction.is_pending == False
        ).all()
        month_to_date_spent = sum(t.amount for t in month_txs)
        month_to_date_expected = daily_allowance * ref_date.day

        return DailyBudgetSummary(
            date=ref_date.strftime("%Y-%m-%d"),
            greeting=greeting,
            currency_symbol="₹",
            monthly_income=pref.monthly_income,
            monthly_fixed_expenses=pref.fixed_expenses,
            monthly_planned_savings=pref.savings_target,
            monthly_emergency_reserve=pref.emergency_reserve,
            remaining_flexible_monthly_budget=flexible_budget,
            days_in_period=days_in_period,
            days_remaining_in_period=max(0, days_in_period - ref_date.day),
            day_of_month=ref_date.day,
            starting_daily_allowance=daily_allowance,
            spent_today=round(spent_today, 2),
            refunds_today=round(refunds_today, 2),
            net_spent_today=round(net_spent_today, 2),
            remaining_allowance=remaining_allowance,
            percentage_consumed=percentage_consumed,
            is_overbudget=is_overbudget,
            overspent_amount=overspent_amount,
            warning_level=warning_level,
            warning_message=warning_message,
            morning_notification_preview=morning_notification,
            evening_summary_preview=evening_summary,
            month_to_date_spent=round(month_to_date_spent, 2),
            month_to_date_expected_budget=round(month_to_date_expected, 2)
        )
