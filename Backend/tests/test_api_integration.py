import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# Use in-memory SQLite database with StaticPool for thread-safe test sharing
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestApiIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        cls.client = TestClient(app)

    def test_end_to_end_daily_budget_lifecycle(self):
        # 1. Register User A
        reg_payload = {
            "email": "user.a@example.com",
            "password": "Password123!",
            "full_name": "Arjun Sharma"
        }
        res = self.client.post("/api/v1/auth/register", json=reg_payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        token_a = data["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Configure financial parameters: Income ₹1,00,000, Savings ₹20,000, Fixed ₹20,000
        pref_update = {
            "monthly_income": 100000.0,
            "savings_target": 20000.0,
            "fixed_expenses": 20000.0,
            "emergency_reserve": 0.0,
            "budget_mode": "smart",
            "calculation_period": "rolling_30"
        }
        res = self.client.put("/api/v1/budget/preferences", json=pref_update, headers=headers_a)
        self.assertEqual(res.status_code, 200)

        # 3. Check starting daily budget
        res = self.client.get("/api/v1/budget/daily", headers=headers_a)
        self.assertEqual(res.status_code, 200)
        daily = res.json()
        self.assertEqual(daily["starting_daily_allowance"], 2000.0)
        self.assertEqual(daily["spent_today"], 0.0)
        self.assertEqual(daily["remaining_allowance"], 2000.0)
        self.assertEqual(daily["percentage_consumed"], 0.0)

        # 4. Add transactions:
        # ₹250 coffee + ₹600 Blinkit + ₹400 Zepto + ₹500 Swiggy
        expenses = [
            {"amount": 250.0, "title": "Coffee", "merchant": "Starbucks", "category": "Food & Dining", "direction": "debit", "type": "expense", "payment_method": "UPI"},
            {"amount": 600.0, "title": "Groceries", "merchant": "Blinkit", "category": "Groceries", "direction": "debit", "type": "expense", "payment_method": "UPI"},
            {"amount": 400.0, "title": "Snacks", "merchant": "Zepto", "category": "Groceries", "direction": "debit", "type": "expense", "payment_method": "UPI"},
            {"amount": 500.0, "title": "Dinner", "merchant": "Swiggy", "category": "Food & Dining", "direction": "debit", "type": "expense", "payment_method": "UPI"},
        ]

        created_tx_ids = []
        for exp in expenses:
            res = self.client.post("/api/v1/transactions", json=exp, headers=headers_a)
            self.assertEqual(res.status_code, 201)
            created_tx_ids.append(res.json()["id"])

        # 5. Check daily budget: ₹1,750 spent, ₹250 remaining, 87.5% consumed
        res = self.client.get("/api/v1/budget/daily", headers=headers_a)
        self.assertEqual(res.status_code, 200)
        daily = res.json()
        self.assertEqual(daily["spent_today"], 1750.0)
        self.assertEqual(daily["remaining_allowance"], 250.0)
        self.assertEqual(daily["percentage_consumed"], 87.5)
        self.assertFalse(daily["is_overbudget"])
        self.assertEqual(daily["warning_level"], "75_percent")

        # 6. Add incoming salary: ₹1,00,000 (credit/income). MUST NOT count as expense!
        salary_tx = {
            "amount": 100000.0,
            "title": "Monthly Salary",
            "merchant": "Employer Direct",
            "category": "Salary",
            "direction": "credit",
            "type": "income",
            "payment_method": "Net Banking"
        }
        res = self.client.post("/api/v1/transactions", json=salary_tx, headers=headers_a)
        self.assertEqual(res.status_code, 201)

        # Verify daily budget remains ₹1,750 spent, ₹250 remaining
        res = self.client.get("/api/v1/budget/daily", headers=headers_a)
        daily = res.json()
        self.assertEqual(daily["spent_today"], 1750.0)
        self.assertEqual(daily["remaining_allowance"], 250.0)

        # 7. Add internal transfer: ₹5,000 to Savings. MUST NOT count as expense!
        transfer_tx = {
            "amount": 5000.0,
            "title": "Transfer to Savings",
            "merchant": "Self Account Transfer",
            "category": "Transfer",
            "direction": "debit",
            "type": "transfer",
            "payment_method": "Net Banking"
        }
        res = self.client.post("/api/v1/transactions", json=transfer_tx, headers=headers_a)
        self.assertEqual(res.status_code, 201)

        # Verify daily budget still remains ₹1,750 spent!
        res = self.client.get("/api/v1/budget/daily", headers=headers_a)
        daily = res.json()
        self.assertEqual(daily["spent_today"], 1750.0)

        # 8. Add a refund: ₹250 (e.g. coffee refunded). Should reduce net spent to ₹1,500!
        refund_tx = {
            "amount": 250.0,
            "title": "Coffee Refund",
            "merchant": "Starbucks Refund",
            "category": "Food & Dining",
            "direction": "credit",
            "type": "refund",
            "payment_method": "UPI"
        }
        res = self.client.post("/api/v1/transactions", json=refund_tx, headers=headers_a)
        self.assertEqual(res.status_code, 201)

        res = self.client.get("/api/v1/budget/daily", headers=headers_a)
        daily = res.json()
        self.assertEqual(daily["refunds_today"], 250.0)
        self.assertEqual(daily["net_spent_today"], 1500.0)
        self.assertEqual(daily["remaining_allowance"], 500.0)

    def test_user_data_isolation(self):
        """Verify User B cannot view or access User A's transactions."""
        # Register User A
        res_a = self.client.post("/api/v1/auth/register", json={
            "email": "isolated.a@example.com",
            "password": "Password123!",
            "full_name": "User Alpha"
        })
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # User A creates a transaction
        tx_res = self.client.post("/api/v1/transactions", json={
            "amount": 999.0,
            "title": "Confidential Alpha Spend",
            "merchant": "Alpha Merchant",
            "category": "Shopping",
            "direction": "debit",
            "type": "expense"
        }, headers=headers_a)
        tx_id = tx_res.json()["id"]

        # Register User B
        res_b = self.client.post("/api/v1/auth/register", json={
            "email": "isolated.b@example.com",
            "password": "Password123!",
            "full_name": "User Beta"
        })
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B attempts to access User A's transaction
        get_res = self.client.get(f"/api/v1/transactions/{tx_id}", headers=headers_b)
        self.assertEqual(get_res.status_code, 404)

        # User B lists transactions: should see 0 transactions
        list_res = self.client.get("/api/v1/transactions", headers=headers_b)
        self.assertEqual(len(list_res.json()), 0)

if __name__ == "__main__":
    unittest.main()
