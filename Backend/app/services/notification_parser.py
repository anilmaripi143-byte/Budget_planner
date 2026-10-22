import re
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any

def parse_bank_notification(text: str) -> Optional[Dict[str, Any]]:
    """
    Parses bank transaction notification or SMS text.
    Extracts amount, merchant, direction, type, payment method, last 4 digits.
    Filters out OTPs, promotional loan offers, and non-financial noise.
    """
    if not text or not isinstance(text, str):
        return None

    clean_text = text.strip()

    # 1. Noise Filter Check
    is_otp = bool(re.search(r'\b(otp|one time password|verification code|security code)\b', clean_text, re.I))
    is_promo = bool(re.search(r'\b(pre-approved|apply for|loan offer|instant loan|credit limit increased|discount offer|claim now)\b', clean_text, re.I))
    has_tx_action = bool(re.search(r'\b(debited|credited|spent|paid|purchase|sent|withdrawn|deposited|received)\b', clean_text, re.I))
    is_balance_only = bool(re.search(r'\b(avail bal|available balance|ac bal|bal is|balance:)\b', clean_text, re.I)) and not has_tx_action

    if is_otp or is_promo or is_balance_only or not has_tx_action:
        return None

    # 2. Amount Extraction
    amount_match = re.search(r'(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)', clean_text, re.I)
    if not amount_match:
        return None

    raw_amount_str = amount_match.group(1).replace(',', '')
    try:
        amount = float(raw_amount_str)
        if amount <= 0:
            return None
    except ValueError:
        return None

    # 3. Direction and Type
    is_debit = bool(re.search(r'\b(debited|spent|paid|purchase|sent|withdrawn|used at)\b', clean_text, re.I))
    is_credit = bool(re.search(r'\b(credited|received|deposited)\b', clean_text, re.I))
    is_refund = bool(re.search(r'\b(refund|reversed|cashback)\b', clean_text, re.I))

    if is_refund:
        direction = "credit"
        tx_type = "refund"
    elif is_credit and not is_debit:
        direction = "credit"
        tx_type = "income"
    else:
        direction = "debit"
        tx_type = "expense"

    # 4. Payment Method
    payment_method = "UPI"
    if re.search(r'\b(upi|vpa|gpay|phonepe|paytm)\b', clean_text, re.I):
        payment_method = "UPI"
    elif re.search(r'\b(card|debit card|credit card|pos)\b', clean_text, re.I):
        payment_method = "Card"
    elif re.search(r'\b(atm|cash withdrawal)\b', clean_text, re.I):
        payment_method = "ATM"
    elif re.search(r'\b(net banking|neft|imps|rtgs)\b', clean_text, re.I):
        payment_method = "Net Banking"

    # 5. Account Last 4
    account_last4 = ""
    last4_match = re.search(r'(?:a\/c|account|card|ending|atm)\s*(?:no\.?|num)?\s*[*xX]*(\d{4})\b', clean_text, re.I)
    if not last4_match:
        last4_match = re.search(r'[*xX]{2,}(\d{4})\b', clean_text, re.I)
    if last4_match:
        account_last4 = last4_match.group(1)

    # 6. Merchant Extraction
    merchant = "Unknown Merchant"
    merchant_match = re.search(r'(?:to|at|towards|vpa|info\/)\s+([A-Za-z0-9\s&\'\.-]+?)(?=\s+(?:on|via|ref|a\/c|bal|\.|\,|$))', clean_text, re.I)
    if merchant_match and merchant_match.group(1):
        extracted = merchant_match.group(1).strip()
        # Clean UPI handles like 'merchant@okaxis' -> 'merchant'
        extracted = re.sub(r'@[a-zA-Z0-9]+', '', extracted).strip()
        if len(extracted) > 1 and not re.match(r'^(your|the|an|a)$', extracted, re.I):
            merchant = extracted.title()

    # 7. Deduplication Hash
    # Hash combines amount, merchant, direction, and approximate timestamp
    dedup_raw = f"{amount:.2f}_{merchant.lower()}_{direction}_{account_last4}"
    dedup_hash = hashlib.sha256(dedup_raw.encode('utf-8')).hexdigest()[:16]

    return {
        "amount": amount,
        "direction": direction,
        "type": tx_type,
        "merchant": merchant,
        "title": merchant,
        "payment_method": payment_method,
        "account_last4": account_last4,
        "dedup_hash": dedup_hash,
        "parsed_at": datetime.utcnow()
    }
