import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User
from app.models.budget import UserPreference
from app.services.csv_importer import CsvImporter

class TestCsvImporter(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

        # Create test user
        self.user = User(
            id="test-user-csv",
            email="csvtest@example.com",
            hashed_password="hash",
            full_name="CSV Test User"
        )
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_indian_csv_statement_parsing(self):
        csv_sample = """Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
22/10/2026,UPI-BLINKIT COMMERCE-42938174,42938174,22/10/2026,600.00,,45200.00
22/10/2026,POS-STARBUCKS COFFEE INDIRANAGAR,POS8492,22/10/2026,250.00,,44950.00
21/10/2026,UPI-SWIGGY FOOD DELIVERY-991823,991823,21/10/2026,500.00,,44450.00
20/10/2026,SALARY CREDIT FROM EMPLOYER CORP,SAL1001,20/10/2026,,100000.00,144450.00
"""
        preview = CsvImporter.preview_csv_content(csv_sample, self.db, self.user.id)
        self.assertEqual(preview.total_parsed, 4)
        self.assertEqual(preview.duplicates_detected, 0)
        self.assertEqual(preview.eligible_to_import, 4)

        # First item: Blinkit
        item0 = preview.preview_items[0]
        self.assertEqual(item0.amount, 600.0)
        self.assertEqual(item0.direction, "debit")
        self.assertEqual(item0.type, "expense")
        self.assertEqual(item0.category, "Groceries")

        # Salary credit item
        salary_item = preview.preview_items[3]
        self.assertEqual(salary_item.amount, 100000.0)
        self.assertEqual(salary_item.direction, "credit")
        self.assertEqual(salary_item.type, "income")

    def test_csv_duplicate_detection(self):
        # CSV with two identical rows
        csv_sample = """Date,Description,Debit,Credit
22/10/2026,ZEPTO QUICK GROCERY,400.00,
22/10/2026,ZEPTO QUICK GROCERY,400.00,
"""
        preview = CsvImporter.preview_csv_content(csv_sample, self.db, self.user.id)
        self.assertEqual(preview.total_parsed, 2)
        self.assertEqual(preview.duplicates_detected, 1)
        self.assertEqual(preview.eligible_to_import, 1)

if __name__ == "__main__":
    unittest.main()
