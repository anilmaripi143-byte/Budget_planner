from pydantic import BaseModel
from typing import List

class CategorySpendingItem(BaseModel):
    category: str
    total_spent: float
    percentage: float
    transaction_count: int
    monthly_budget_cap: float = 0.0

class MerchantSpendingItem(BaseModel):
    merchant: str
    category: str
    total_spent: float
    transaction_count: int

class DailyTrendItem(BaseModel):
    date: str
    day_name: str
    total_spent: float
    daily_budget_allowance: float
    is_overbudget: bool

class AnalyticsSummaryResponse(BaseModel):
    currency_symbol: str = "₹"
    total_income_month: float
    total_spent_month: float
    net_savings_month: float
    savings_rate_achieved_pct: float
    daily_average_spend: float
    highest_spend_day: str
    highest_spend_amount: float
    categories: List[CategorySpendingItem]
    top_merchants: List[MerchantSpendingItem]
    daily_trend: List[DailyTrendItem]
