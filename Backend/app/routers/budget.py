from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.budget import UserPreference, BudgetCategory
from app.models.transaction import Transaction
from app.schemas.budget import (
    UserPreferenceUpdate, UserPreferenceResponse, DailyBudgetSummary,
    BudgetCategoryCreate, BudgetCategoryResponse
)
from app.services.auth_service import get_current_user
from app.services.budget_engine import BudgetEngine

router = APIRouter(prefix="/api/v1/budget", tags=["Budgeting Engine"])

@router.get("/preferences", response_model=UserPreferenceResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return UserPreferenceResponse.model_validate(pref)

@router.put("/preferences", response_model=UserPreferenceResponse)
def update_preferences(
    payload: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pref, field, value)

    pref.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pref)
    return UserPreferenceResponse.model_validate(pref)

@router.get("/daily", response_model=DailyBudgetSummary)
def get_daily_budget(
    target_date: Optional[str] = Query(None, description="Target date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    parsed_date = None
    if target_date:
        try:
            parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")
    else:
        parsed_date = date.today()

    return BudgetEngine.compute_daily_summary(db=db, user_id=current_user.id, target_date=parsed_date)

@router.get("/categories", response_model=List[BudgetCategoryResponse])
def get_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cats = db.query(BudgetCategory).filter(BudgetCategory.user_id == current_user.id).all()
    return [BudgetCategoryResponse.model_validate(c) for c in cats]

@router.post("/categories", response_model=BudgetCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: BudgetCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cat = BudgetCategory(
        user_id=current_user.id,
        category_name=payload.category_name.strip(),
        monthly_limit=payload.monthly_limit,
        icon=payload.icon or "category",
        color_hex=payload.color_hex or "#10B981"
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return BudgetCategoryResponse.model_validate(cat)

@router.post("/demo-seed")
def seed_master_prompt_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Seeds the exact master prompt scenario:
    - Monthly income: ₹1,00,000
    - Monthly planned savings: ₹20,000
    - Monthly fixed expenses: ₹20,000
    - Remaining flexible: ₹60,000
    - Daily allowance: ₹2,000 (30 days)
    - Today's expenses:
      ₹250 coffee + ₹600 Blinkit + ₹400 Zepto + ₹500 Swiggy = ₹1,750 spent, ₹250 remaining!
    """
    # 1. Update preferences
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)
    
    pref.monthly_income = 100000.0
    pref.savings_target = 20000.0
    pref.fixed_expenses = 20000.0
    pref.emergency_reserve = 0.0
    pref.budget_mode = "smart"
    pref.calculation_period = "rolling_30"  # To give exact ₹2,000 daily
    pref.updated_at = datetime.utcnow()

    # 2. Add today's sample expenses
    today = datetime.now()
    demo_expenses = [
        {"title": "Coffee with Colleague", "merchant": "Starbucks / Third Wave", "category": "Food & Dining", "amount": 250.0, "method": "UPI"},
        {"title": "Groceries Delivery", "merchant": "Blinkit", "category": "Groceries", "amount": 600.0, "method": "UPI"},
        {"title": "Quick Snacks & Fruits", "merchant": "Zepto", "category": "Groceries", "amount": 400.0, "method": "UPI"},
        {"title": "Dinner Order", "merchant": "Swiggy", "category": "Food & Dining", "amount": 500.0, "method": "UPI"},
    ]

    # Delete previous demo transactions for today to prevent duplicates
    db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.data_source == "demo"
    ).delete()

    created_txs = []
    for item in demo_expenses:
        tx = Transaction(
            user_id=current_user.id,
            amount=item["amount"],
            direction="debit",
            type="expense",
            title=item["title"],
            merchant=item["merchant"],
            category=item["category"],
            transaction_date=today,
            payment_method=item["method"],
            data_source="demo",
            status="confirmed",
            deduplication_hash=f"demo_{item['merchant']}_{item['amount']}"
        )
        db.add(tx)
        created_txs.append(tx)

    db.commit()

    # Return freshly computed summary
    summary = BudgetEngine.compute_daily_summary(db=db, user_id=current_user.id, target_date=today.date())
    return {
        "message": "Demo data successfully seeded matching Master Prompt specifications!",
        "daily_summary": summary
    }
