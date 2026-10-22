import unittest
from app.services.notification_parser import parse_bank_notification

class TestNotificationParser(unittest.TestCase):
    def test_bank_sms_parsing(self):
        sms_text = (
            "Dear Customer, your A/c *4431 is debited for Rs. 600.00 on 22-Oct-26 "
            "towards BLINKIT via UPI ref 42938174. Avail Bal: Rs. 45,200.00 - HDFC Bank"
        )
        parsed = parse_bank_notification(sms_text)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["amount"], 600.0)
        self.assertEqual(parsed["direction"], "debit")
        self.assertEqual(parsed["type"], "expense")
        self.assertEqual(parsed["payment_method"], "UPI")
        self.assertEqual(parsed["account_last4"], "4431")
        self.assertIn("Blinkit", parsed["merchant"])

    def test_upi_push_notification(self):
        notification_text = "Paid ₹ 250 to Starbucks Coffee via Google Pay"
        parsed = parse_bank_notification(notification_text)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["amount"], 250.0)
        self.assertEqual(parsed["direction"], "debit")
        self.assertEqual(parsed["type"], "expense")
        self.assertIn("Starbucks", parsed["merchant"])

    def test_credit_refund_detection(self):
        refund_text = "Rs. 400.00 credited to your A/c *8890 on 22-Oct-26 as refund from Zepto. Avail Bal: Rs. 45,600.00"
        parsed = parse_bank_notification(refund_text)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["amount"], 400.0)
        self.assertEqual(parsed["direction"], "credit")
        self.assertEqual(parsed["type"], "refund")

    def test_noise_and_otp_filter(self):
        otp_text = "Your OTP for HDFC Bank NetBanking login is 849201. Do not share with anyone."
        self.assertIsNone(parse_bank_notification(otp_text))

        promo_text = "Congratulations! You are pre-approved for an instant personal loan of Rs. 5,00,000. Apply now!"
        self.assertIsNone(parse_bank_notification(promo_text))

        balance_query_text = "Dear Customer, Avail Bal in A/c *1234 is Rs. 50,000.00 as on 22-Oct-26."
        self.assertIsNone(parse_bank_notification(balance_query_text))

if __name__ == "__main__":
    unittest.main()
