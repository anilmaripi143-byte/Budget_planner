import unittest
from app.services.categorization import classify_merchant
from app.models.transaction import MerchantRule

class TestCategorization(unittest.TestCase):
    def test_indian_merchant_classification(self):
        cases = [
            ("Blinkit Commerce", "Groceries"),
            ("Zepto Daily Fruits", "Groceries"),
            ("Swiggy Order #1234", "Food & Dining"),
            ("Zomato Delivery", "Food & Dining"),
            ("Uber India Systems", "Transport"),
            ("Ola Cabs Trip", "Transport"),
            ("Amazon Seller Services", "Shopping"),
            ("Flipkart Internet Pvt Ltd", "Shopping"),
            ("Apollo Pharmacy Bangalore", "Health"),
            ("Tata 1mg Healthcare", "Health"),
            ("Netflix Entertainment", "Entertainment"),
            ("Bescom Bill Payment", "Bills & Utilities"),
            ("Jio Prepaid Recharge", "Bills & Utilities"),
            ("Indian Oil Petrol Bunk", "Transport")
        ]

        for merchant_text, expected_category in cases:
            norm_name, cat, status = classify_merchant(merchant_text)
            self.assertEqual(cat, expected_category, f"Failed for {merchant_text}: got {cat}")
            self.assertEqual(status, "confirmed")

    def test_custom_user_rule_override(self):
        custom_rule = MerchantRule(
            id="rule-1",
            user_id="user-1",
            keyword="chaayos",
            category="Office Beverages",
            is_active=True
        )

        norm_name, cat, status = classify_merchant("Chaayos Indiranagar", [custom_rule])
        self.assertEqual(cat, "Office Beverages")
        self.assertEqual(status, "confirmed")

    def test_unknown_merchant_needs_review(self):
        norm_name, cat, status = classify_merchant("XYZ Mystery Enterprise 999")
        self.assertEqual(cat, "General")
        self.assertEqual(status, "needs_review")

if __name__ == "__main__":
    unittest.main()
