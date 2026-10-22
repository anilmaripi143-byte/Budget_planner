from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.budget import UserPreference, BudgetCategory
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse, TokenRefreshRequest
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    hashed = hash_password(payload.password)
    user = User(
        email=payload.email.lower().strip(),
        hashed_password=hashed,
        full_name=payload.full_name.strip()
    )
    db.add(user)
    db.flush()

    # Create default user financial preferences (as per Indian standard master scenario)
    pref = UserPreference(
        user_id=user.id,
        monthly_income=100000.0,
        fixed_expenses=20000.0,
        savings_target=20000.0,
        emergency_reserve=0.0,
        budget_mode="smart",
        calculation_period="month_calendar"
    )
    db.add(pref)

    # Create default budget categories
    default_cats = [
        ("Groceries", 8000.0, "shopping_cart", "#10B981"),
        ("Food & Dining", 6000.0, "restaurant", "#F59E0B"),
        ("Transport", 4000.0, "directions_car", "#3B82F6"),
        ("Shopping", 5000.0, "shopping_bag", "#EC4899"),
        ("Bills & Utilities", 5000.0, "receipt_long", "#8B5CF6"),
        ("Entertainment", 3000.0, "movie", "#6366F1"),
        ("Health", 3000.0, "medical_services", "#EF4444")
    ]
    for name, limit, icon, color in default_cats:
        db.add(BudgetCategory(
            user_id=user.id,
            category_name=name,
            monthly_limit=limit,
            icon=icon,
            color_hex=color
        ))

    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated"
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: TokenRefreshRequest, db: Session = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = decoded.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account deactivated"
        )

    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
