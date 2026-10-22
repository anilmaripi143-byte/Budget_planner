from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models  # Ensures all models are loaded
from app.routers import auth, budget, transactions, analytics, account_aggregator

# Initialize Database Schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Production-grade Personal Finance & Daily Budget API for Indian Users.\n\n"
        "Features:\n"
        "- Smart Daily Spending Allowance Engine (₹1,00,000 income - fixed - savings / days)\n"
        "- Indian Merchant Knowledge Base (Blinkit, Zepto, Swiggy, Zomato, Uber, Ola)\n"
        "- Consented Android Notification & SMS Local Parser\n"
        "- Bank Statement CSV Importer with Deduplication\n"
        "- RBI Account Aggregator (AA) Ecosystem Architecture\n"
        "- Configurable Warning Thresholds (50%, 75%, 90%, 100%)"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local Android emulator, Web frontend, and tests
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(budget.router)
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(account_aggregator.router)

@app.get("/", tags=["Health"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
        "currency": "INR (₹)",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "engine": "FastAPI + SQLAlchemy"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
