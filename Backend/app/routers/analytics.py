from datetime import datetime, timedelta, date
from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.budget import UserPreference, BudgetCategory
from app.models.transaction import Transaction
from app.schemas.analytics import (
    AnalyticsSummaryResponse, CategorySpendingItem, MerchantSpendingItem, DailyTrendItem
)
from app.services.auth_service import get_current_user
from app.services.budget_engine import BudgetEngine

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics & Insights"])

@router.get("/overview", response_model=AnalyticsSummaryResponse)
def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    month_start = datetime(today.year, today.month, 1)

    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    monthly_income = pref.monthly_income if pref else 100000.0

    # 1. Fetch all expense transactions for the month
    month_expenses = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_date >= month_start,
        Transaction.direction == "debit",
        Transaction.type == "expense",
        Transaction.is_pending == False
    ).all()

    total_spent_month = sum(tx.amount for tx in month_expenses)
    net_savings_month = max(0.0, monthly_income - total_spent_month)
    savings_rate = round((net_savings_month / monthly_income) * 100, 1) if monthly_income > 0 else 0.0

    days_passed = max(1, today.day)
    daily_avg_spend = round(total_spent_month / days_passed, 2)

    # 2. Category Distribution
    cat_caps = {
        c.category_name: c.monthly_limit for c in db.query(BudgetCategory).filter(
            BudgetCategory.user_id == current_user.id
        ).all()
    }

    cat_map: Dict[str, Dict] = {}
    for tx in month_expenses:
        c_name = tx.category or "General"
        if c_name not in cat_map:
            cat_map[c_name] = {"total": 0.0, "count": 0}
        cat_map[c_name]["total"] += tx.amount
        cat_map[c_name]["count"] += 1

    category_items = []
    for cat_name, data in sorted(cat_map.items(), key=lambda x: x[1]["total"], reverse=True):
        pct = round((data["total"] / total_spent_month) * 100, 1) if total_spent_month > 0 else 0.0
        category_items.append(CategorySpendingItem(
            category=cat_name,
            total_spent=round(data["total"], 2),
            percentage=pct,
            transaction_count=data["count"],
            monthly_budget_cap=cat_caps.get(cat_name, 0.0)
        ))

    # 3. Top Merchants
    merchant_map: Dict[str, Dict] = {}
    for tx in month_expenses:
        m_name = tx.merchant or tx.title
        if m_name not in merchant_map:
            merchant_map[m_name] = {"total": 0.0, "count": 0, "category": tx.category}
        merchant_map[m_name]["total"] += tx.amount
        merchant_map[m_name]["count"] += 1

    top_merchants = []
    for m_name, data in sorted(merchant_map.items(), key=lambda x: x[1]["total"], reverse=True)[:10]:
        top_merchants.append(MerchantSpendingItem(
            merchant=m_name,
            category=data["category"],
            total_spent=round(data["total"], 2),
            transaction_count=data["count"]
        ))

    # 4. Daily Spending Trend (Last 7 Days)
    daily_allowance, _, _ = BudgetEngine.calculate_starting_daily_allowance(
        monthly_income=pref.monthly_income if pref else 100000.0,
        fixed_expenses=pref.fixed_expenses if pref else 20000.0,
        savings_target=pref.savings_target if pref else 20000.0,
        emergency_reserve=pref.emergency_reserve if pref else 0.0,
        budget_mode=pref.budget_mode if pref else "smart",
        calculation_period=pref.calculation_period if pref else "month_calendar"
    )

    daily_trend = []
    highest_spend_day = today.strftime("%Y-%m-%d")
    highest_spend_amount = 0.0

    for i in range(6, -1, -1):
        target_d = today - timedelta(days=i)
        d_start = datetime.combine(target_d, datetime.min.time())
        d_end = datetime.combine(target_d, datetime.max.time())
        
        day_txs = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= d_start,
            Transaction.transaction_date <= d_end,
            Transaction.direction == "debit",
            Transaction.type == "expense"
        ).all()

        day_total = sum(t.amount for t in day_txs)
        if day_total > highest_spend_amount:
            highest_spend_amount = day_total
            highest_spend_day = target_d.strftime("%Y-%m-%d")

        daily_trend.append(DailyTrendItem(
            date=target_d.strftime("%Y-%m-%d"),
            day_name=target_d.strftime("%a"),
            total_spent=round(day_total, 2),
            daily_budget_allowance=daily_allowance,
            is_overbudget=day_total > daily_allowance
        ))

    return AnalyticsSummaryResponse(
        currency_symbol="₹",
        total_income_month=round(monthly_income, 2),
        total_spent_month=round(total_spent_month, 2),
        net_savings_month=round(net_savings_month, 2),
        savings_rate_achieved_pct=savings_rate,
        daily_average_spend=daily_avg_spend,
        highest_spend_day=highest_spend_day,
        highest_spend_amount=round(highest_spend_amount, 2),
        categories=category_items,
        top_merchants=top_merchants,
        daily_trend=daily_trend
    )
