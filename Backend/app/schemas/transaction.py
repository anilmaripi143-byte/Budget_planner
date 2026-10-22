from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TransactionBase(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount in INR")
    direction: str = Field(default="debit", description="'debit' or 'credit'")
    type: str = Field(default="expense", description="'expense', 'income', 'transfer', 'refund'")
    title: str = Field(..., min_length=1)
    merchant: str = Field(..., min_length=1)
    category: str = Field(default="General")
    transaction_date: Optional[datetime] = None
    payment_method: str = Field(default="UPI", description="'UPI', 'Card', 'Net Banking', 'ATM', 'Cash'")
    account_last4: Optional[str] = ""
    data_source: str = Field(default="manual", description="'manual', 'csv', 'notification', 'account_aggregator', 'demo'")
    status: str = Field(default="confirmed", description="'confirmed' or 'needs_review'")
    is_pending: bool = False
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    direction: Optional[str] = None
    type: Optional[str] = None
    title: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    transaction_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    account_last4: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    account_id: Optional[str] = None
    deduplication_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MerchantRuleCreate(BaseModel):
    keyword: str = Field(..., min_length=2)
    category: str = Field(..., min_length=2)

class MerchantRuleResponse(MerchantRuleCreate):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Notification / Webhook Ingestion
class IngestionPayload(BaseModel):
    key: Optional[str] = None
    notification_text: str = Field(..., min_length=5)
    sender: Optional[str] = None
    timestamp: Optional[datetime] = None

class IngestionResult(BaseModel):
    success: bool
    action: str  # "saved", "duplicate_ignored", "non_financial_ignored", "needs_review"
    reason: Optional[str] = None
    parsed_transaction: Optional[TransactionResponse] = None

# CSV Import Schemas
class CsvPreviewItem(BaseModel):
    date: str
    description: str
    merchant: str
    category: str
    amount: float
    direction: str
    type: str
    payment_method: str
    account_last4: str
    is_duplicate: bool = False
    ref_number: Optional[str] = ""

class CsvImportPreviewResponse(BaseModel):
    total_parsed: int
    duplicates_detected: int
    eligible_to_import: int
    preview_items: List[CsvPreviewItem]

class CsvImportConfirmRequest(BaseModel):
    items: List[CsvPreviewItem]
