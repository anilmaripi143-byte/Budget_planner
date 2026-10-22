import unittest
from datetime import date
from app.services.budget_engine import BudgetEngine

class TestBudgetEngine(unittest.TestCase):
    def test_master_prompt_calculation(self):
        """
        Verify the exact scenario in the Master Prompt:
        Income: ₹1,00,000
        Savings: ₹20,000
        Fixed expenses: ₹20,000
        Remaining flexible: ₹60,000
        Daily flexible budget: ₹2,000 (30 days)
        Spent: ₹250 (coffee) + ₹600 (Blinkit) + ₹400 (Zepto) + ₹500 (Swiggy) = ₹1,750
        Remaining: ₹250
        Percentage used: 87.5%
        """
        monthly_income = 100000.0
        fixed_expenses = 20000.0
        savings_target = 20000.0
        emergency_reserve = 0.0

        daily_allowance, days, flexible_budget = BudgetEngine.calculate_starting_daily_allowance(
            monthly_income=monthly_income,
            fixed_expenses=fixed_expenses,
            savings_target=savings_target,
            emergency_reserve=emergency_reserve,
            budget_mode="smart",
            calculation_period="rolling_30"
        )

        self.assertEqual(days, 30)
        self.assertEqual(flexible_budget, 60000.0)
        self.assertEqual(daily_allowance, 2000.0)

        # Spending math
        coffee = 250.0
        blinkit = 600.0
        zepto = 400.0
        swiggy = 500.0
        total_spent = coffee + blinkit + zepto + swiggy

        self.assertEqual(total_spent, 1750.0)
        remaining = daily_allowance - total_spent
        self.assertEqual(remaining, 250.0)

        percentage_consumed = (total_spent / daily_allowance) * 100
        self.assertEqual(percentage_consumed, 87.5)

    def test_calendar_days_and_leap_years(self):
        """Test calendar month lengths including leap year February."""
        # Non-leap year February (2025)
        feb_2025 = date(2025, 2, 1)
        self.assertEqual(BudgetEngine.get_days_in_month(feb_2025), 28)

        # Leap year February (2024)
        feb_2024 = date(2024, 2, 1)
        self.assertEqual(BudgetEngine.get_days_in_month(feb_2024), 29)

        # 30-day month (April)
        apr_2026 = date(2026, 4, 1)
        self.assertEqual(BudgetEngine.get_days_in_month(apr_2026), 30)

        # 31-day month (October)
        oct_2026 = date(2026, 10, 1)
        self.assertEqual(BudgetEngine.get_days_in_month(oct_2026), 31)

    def test_simple_vs_smart_budget_mode(self):
        """Test simple allowance mode (income / days) vs smart allowance mode."""
        income = 90000.0
        fixed = 15000.0
        savings = 15000.0
        emergency = 0.0

        # Simple mode
        daily_simple, _, _ = BudgetEngine.calculate_starting_daily_allowance(
            monthly_income=income,
            fixed_expenses=fixed,
            savings_target=savings,
            emergency_reserve=emergency,
            budget_mode="simple",
            calculation_period="rolling_30"
        )
        self.assertEqual(daily_simple, 3000.0)  # 90000 / 30

        # Smart mode
        daily_smart, _, _ = BudgetEngine.calculate_starting_daily_allowance(
            monthly_income=income,
            fixed_expenses=fixed,
            savings_target=savings,
            emergency_reserve=emergency,
            budget_mode="smart",
            calculation_period="rolling_30"
        )
        self.assertEqual(daily_smart, 2000.0)  # (90000 - 15000 - 15000) / 30

if __name__ == "__main__":
    unittest.main()
