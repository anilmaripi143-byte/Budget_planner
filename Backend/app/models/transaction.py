import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("financial_accounts.id", ondelete="SET NULL"), nullable=True)
    
    amount = Column(Float, nullable=False)
    direction = Column(String(20), default="debit")  # "debit" or "credit"
    type = Column(String(20), default="expense")      # "expense", "income", "transfer", "refund"
    
    title = Column(String(255), nullable=False)
    merchant = Column(String(255), nullable=False)
    category = Column(String(100), default="General", index=True)
    
    transaction_date = Column(DateTime, default=datetime.utcnow, index=True)
    payment_method = Column(String(50), default="UPI")  # "UPI", "Card", "Net Banking", "ATM", "Cash"
    account_last4 = Column(String(10), default="")
    
    data_source = Column(String(50), default="manual")  # "manual", "csv", "notification", "account_aggregator", "demo"
    deduplication_hash = Column(String(64), index=True, nullable=True)
    status = Column(String(50), default="confirmed")     # "confirmed", "needs_review"
    is_pending = Column(Boolean, default=False)
    notes = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="transactions")

    __table_args__ = (
        Index("idx_user_date", "user_id", "transaction_date"),
        Index("idx_user_dedup", "user_id", "deduplication_hash"),
    )


class MerchantRule(Base):
    __tablename__ = "merchant_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    keyword = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="merchant_rules")
