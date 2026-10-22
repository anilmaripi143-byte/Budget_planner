import hashlib
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.budget import UserPreference
from app.models.transaction import Transaction, MerchantRule
from app.schemas.transaction import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    MerchantRuleCreate, MerchantRuleResponse, IngestionPayload, IngestionResult,
    CsvImportPreviewResponse, CsvImportConfirmRequest
)
from app.services.auth_service import get_current_user
from app.services.categorization import classify_merchant
from app.services.csv_importer import CsvImporter
from app.services.notification_parser import parse_bank_notification

router = APIRouter(prefix="/api/v1/transactions", tags=["Transactions & Ingestion"])

@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    search: Optional[str] = Query(None, description="Search title or merchant"),
    category: Optional[str] = Query(None, description="Filter by category"),
    type: Optional[str] = Query(None, description="Filter by type ('expense', 'income', 'refund', 'transfer')"),
    direction: Optional[str] = Query(None, description="Filter by 'debit' or 'credit'"),
    data_source: Optional[str] = Query(None, description="Filter by data source"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter((Transaction.title.ilike(search_filter)) | (Transaction.merchant.ilike(search_filter)))

    if category and category != "All":
        query = query.filter(Transaction.category == category)

    if type and type != "All":
        query = query.filter(Transaction.type == type)

    if direction and direction != "All":
        query = query.filter(Transaction.direction == direction)

    if data_source:
        query = query.filter(Transaction.data_source == data_source)

    if start_date:
        try:
            s_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Transaction.transaction_date >= s_dt)
        except ValueError:
            pass

    if end_date:
        try:
            e_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(Transaction.transaction_date < e_dt)
        except ValueError:
            pass

    results = query.order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit).all()
    return [TransactionResponse.model_validate(t) for t in results]

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch user custom rules
    user_rules = db.query(MerchantRule).filter(MerchantRule.user_id == current_user.id, MerchantRule.is_active == True).all()
    
    # Auto-classify category if general or default
    category = payload.category
    status_val = payload.status
    if category == "General" or not category:
        merchant_name, auto_cat, auto_status = classify_merchant(payload.merchant, user_rules)
        category = auto_cat
        status_val = auto_status

    tx_date = payload.transaction_date or datetime.now()
    
    # Generate deduplication hash
    clean_desc = payload.merchant.lower()[:30]
    date_str = tx_date.strftime("%Y-%m-%d")
    raw_hash = f"{date_str}_{payload.amount:.2f}_{payload.direction}_{clean_desc}"
    dedup_hash = hashlib.sha256(raw_hash.encode('utf-8')).hexdigest()[:24]

    # Check for duplicate within 2 minutes for same user & amount
    two_mins_ago = datetime.utcnow() - timedelta(minutes=2)
    recent_dup = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.amount == payload.amount,
        Transaction.direction == payload.direction,
        Transaction.created_at >= two_mins_ago
    ).first()

    if recent_dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A transaction with the exact same amount and direction was recorded within the last 2 minutes."
        )

    tx = Transaction(
        user_id=current_user.id,
        amount=payload.amount,
        direction=payload.direction,
        type=payload.type,
        title=payload.title,
        merchant=payload.merchant,
        category=category,
        transaction_date=tx_date,
        payment_method=payload.payment_method,
        account_last4=payload.account_last4 or "",
        data_source=payload.data_source,
        status=status_val,
        is_pending=payload.is_pending,
        deduplication_hash=dedup_hash,
        notes=payload.notes
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)

@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TransactionResponse.model_validate(tx)

@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(tx, field, val)

    tx.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return None

# CSV Bank Statement Import Endpoints
@router.post("/import-csv/preview", response_model=CsvImportPreviewResponse)
async def preview_csv_import(
    file: Optional[UploadFile] = File(None),
    csv_raw_text: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = ""
    if file:
        content_bytes = await file.read()
        content = content_bytes.decode('utf-8', errors='ignore')
    elif csv_raw_text:
        content = csv_raw_text
    else:
        raise HTTPException(status_code=400, detail="Either a CSV file or csv_raw_text must be provided")

    return CsvImporter.preview_csv_content(csv_text=content, db=db, user_id=current_user.id)

@router.post("/import-csv/confirm")
def confirm_csv_import(
    payload: CsvImportConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    imported_count = 0
    now = datetime.utcnow()

    for item in payload.items:
        if item.is_duplicate:
            continue

        try:
            tx_dt = datetime.strptime(item.date, "%Y-%m-%d")
        except ValueError:
            tx_dt = now

        dedup_hash = CsvImporter.generate_dedup_hash(
            item.date, item.amount, item.direction, item.description
        )

        tx = Transaction(
            user_id=current_user.id,
            amount=item.amount,
            direction=item.direction,
            type=item.type,
            title=item.description[:250],
            merchant=item.merchant,
            category=item.category,
            transaction_date=tx_dt,
            payment_method=item.payment_method,
            account_last4=item.account_last4,
            data_source="csv",
            status="confirmed",
            deduplication_hash=dedup_hash,
            notes=f"Ref: {item.ref_number}" if item.ref_number else None
        )
        db.add(tx)
        imported_count += 1

    db.commit()
    return {
        "success": True,
        "imported_count": imported_count,
        "message": f"Successfully imported {imported_count} bank statement transactions without duplicates."
    }

# Notification Ingestion (Consented Android Notification & Bank SMS Ingest)
@router.post("/ingest", response_model=IngestionResult)
def ingest_notification(
    payload: IngestionPayload,
    db: Session = Depends(get_db)
):
    # 1. Look up user by webhook_key
    if not payload.key:
        raise HTTPException(status_code=401, detail="Missing authorization key for notification ingestion")

    pref = db.query(UserPreference).filter(UserPreference.webhook_key == payload.key).first()
    if not pref:
        raise HTTPException(status_code=401, detail="Unauthorized webhook key")

    user_id = pref.user_id

    # 2. Parse Notification text locally
    parsed = parse_bank_notification(payload.notification_text)
    if not parsed:
        return IngestionResult(
            success=False,
            action="non_financial_ignored",
            reason="Notification is not a financial debit/credit transaction, or is an OTP/marketing alert"
        )

    # 3. Categorize Merchant
    user_rules = db.query(MerchantRule).filter(MerchantRule.user_id == user_id, MerchantRule.is_active == True).all()
    norm_merchant, category, status_val = classify_merchant(parsed["merchant"], user_rules)

    # 4. Deduplication Check (Window: 2 minutes)
    two_mins_ago = datetime.utcnow() - timedelta(minutes=2)
    existing = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.amount == parsed["amount"],
        Transaction.direction == parsed["direction"],
        Transaction.created_at >= two_mins_ago
    ).first()

    if existing:
        return IngestionResult(
            success=True,
            action="duplicate_ignored",
            reason="Transaction with same amount and direction was already captured within 2-minute window"
        )

    # 5. Insert Transaction
    tx = Transaction(
        user_id=user_id,
        amount=parsed["amount"],
        direction=parsed["direction"],
        type=parsed["type"],
        title=norm_merchant,
        merchant=norm_merchant,
        category=category,
        transaction_date=payload.timestamp or datetime.utcnow(),
        payment_method=parsed["payment_method"],
        account_last4=parsed["account_last4"],
        data_source="notification",
        status=status_val,
        deduplication_hash=parsed["dedup_hash"]
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    return IngestionResult(
        success=True,
        action="saved",
        parsed_transaction=TransactionResponse.model_validate(tx)
    )

# Custom Merchant Category Rules
@router.get("/rules/merchant", response_model=List[MerchantRuleResponse])
def get_merchant_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rules = db.query(MerchantRule).filter(MerchantRule.user_id == current_user.id).all()
    return [MerchantRuleResponse.model_validate(r) for r in rules]

@router.post("/rules/merchant", response_model=MerchantRuleResponse, status_code=status.HTTP_201_CREATED)
def create_merchant_rule(
    payload: MerchantRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rule = MerchantRule(
        user_id=current_user.id,
        keyword=payload.keyword.strip().lower(),
        category=payload.category.strip()
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return MerchantRuleResponse.model_validate(rule)
