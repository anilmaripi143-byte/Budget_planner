from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UserPreferenceBase(BaseModel):
    monthly_income: float = Field(default=100000.0, ge=0)
    fixed_expenses: float = Field(default=20000.0, ge=0)
    savings_target: float = Field(default=20000.0, ge=0)
    emergency_reserve: float = Field(default=0.0, ge=0)
    budget_mode: str = Field(default="smart", description="'smart' or 'simple'")
    calculation_period: str = Field(default="month_calendar", description="'month_calendar' or 'rolling_30'")
    rollover_enabled: bool = False
    morning_reminder_time: str = "08:00"
    evening_summary_time: str = "21:00"
    warning_thresholds: str = "50,75,90,100"
    notifications_enabled: bool = True
    currency: str = "INR"

class UserPreferenceUpdate(BaseModel):
    monthly_income: Optional[float] = None
    fixed_expenses: Optional[float] = None
    savings_target: Optional[float] = None
    emergency_reserve: Optional[float] = None
    budget_mode: Optional[str] = None
    calculation_period: Optional[str] = None
    rollover_enabled: Optional[bool] = None
    morning_reminder_time: Optional[str] = None
    evening_summary_time: Optional[str] = None
    warning_thresholds: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    currency: Optional[str] = None

class UserPreferenceResponse(UserPreferenceBase):
    id: str
    user_id: str
    webhook_key: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DailyBudgetSummary(BaseModel):
    date: str
    greeting: str
    currency_symbol: str = "₹"
    
    # Monthly Baseline
    monthly_income: float
    monthly_fixed_expenses: float
    monthly_planned_savings: float
    monthly_emergency_reserve: float
    remaining_flexible_monthly_budget: float
    
    # Days Calculation
    days_in_period: int
    days_remaining_in_period: int
    day_of_month: int
    
    # Daily Numbers
    starting_daily_allowance: float
    spent_today: float
    refunds_today: float
    net_spent_today: float
    remaining_allowance: float
    percentage_consumed: float
    
    # Overspending & Warning State
    is_overbudget: bool
    overspent_amount: float
    warning_level: str  # "normal", "50_percent", "75_percent", "90_percent", "exceeded"
    warning_message: Optional[str] = None
    
    # Notification Previews
    morning_notification_preview: str
    evening_summary_preview: str
    
    # Month to Date Tracking
    month_to_date_spent: float
    month_to_date_expected_budget: float

class BudgetCategoryCreate(BaseModel):
    category_name: str
    monthly_limit: float = 0.0
    icon: Optional[str] = "category"
    color_hex: Optional[str] = "#10B981"

class BudgetCategoryResponse(BudgetCategoryCreate):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True
