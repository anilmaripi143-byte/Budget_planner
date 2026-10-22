import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Financial Setup
    monthly_income = Column(Float, default=100000.0)
    fixed_expenses = Column(Float, default=20000.0)
    savings_target = Column(Float, default=20000.0)
    emergency_reserve = Column(Float, default=0.0)
    
    # Budgeting Preference
    budget_mode = Column(String(50), default="smart")  # "smart" (income - fixed - savings) or "simple" (income / days)
    calculation_period = Column(String(50), default="month_calendar")  # "month_calendar" (days in current month) or "rolling_30"
    rollover_enabled = Column(Boolean, default=False)
    
    # Notification & Alert Times
    morning_reminder_time = Column(String(10), default="08:00")
    evening_summary_time = Column(String(10), default="21:00")
    warning_thresholds = Column(String(100), default="50,75,90,100")
    notifications_enabled = Column(Boolean, default=True)
    
    # Webhook key for automated sync
    webhook_key = Column(String(64), unique=True, index=True, default=lambda: uuid.uuid4().hex)
    currency = Column(String(10), default="INR")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="preference")


class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_name = Column(String(100), nullable=False)
    monthly_limit = Column(Float, default=0.0)
    icon = Column(String(50), default="category")
    color_hex = Column(String(20), default="#10B981")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="categories")


class FinancialAccount(Base):
    __tablename__ = "financial_accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_name = Column(String(100), nullable=False)
    institution_name = Column(String(100), nullable=False)  # HDFC, ICICI, SBI, GooglePay, etc.
    account_type = Column(String(50), default="savings")    # "savings", "credit_card", "wallet"
    mask_acc_num = Column(String(20), default="XXXX")       # Last 4 digits only
    is_connected = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="accounts")
