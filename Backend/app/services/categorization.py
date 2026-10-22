import re
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.transaction import MerchantRule

# Indian Merchant Knowledge Base
INDIAN_MERCHANT_MAP = {
    # Quick Commerce & Groceries
    "Groceries": [
        "blinkit", "zepto", "instamart", "bigbasket", "bb daily", "dmart", "d-mart",
        "milkbasket", "natures basket", "more retail", "spencers", "reliance fresh",
        "reliance smart", "supermarket", "kirana", "provision", "vegetables", "fruits"
    ],
    # Food & Dining
    "Food & Dining": [
        "swiggy", "zomato", "starbucks", "chai point", "chaayos", "mcdonald", "kfc",
        "domino", "pizza hut", "burger king", "subway", "haldiram", "saravanaa",
        "barbeque nation", "cafe coffee day", "ccd", "eatclub", "box8", "faasos",
        "bikanervala", "restaurant", "cafe", "baker", "biryani", "dhaba"
    ],
    # Transport & Fuel
    "Transport": [
        "uber", "ola", "rapido", "namma yatri", "irctc", "makemytrip", "yatra",
        "goibibo", "redbus", "abhibus", "indigo", "air india", "spicejet",
        "shell", "indian oil", "ioc", "bharat petroleum", "bpcl", "hpcl", "hp petrol",
        "cng station", "fastag", "toll", "metro rail", "fuel"
    ],
    # Shopping & E-Commerce
    "Shopping": [
        "amazon", "flipkart", "myntra", "nykaa", "ajio", "meesho", "tata cliq",
        "zara", "h&m", "uniqlo", "croma", "reliance digital", "vijay sales",
        "decathlon", "lifestyle", "shoppers stop", "pantaloons", "westside", "ikea"
    ],
    # Bills, Recharge & Utilities
    "Bills & Utilities": [
        "bescom", "tata power", "adani electricity", "mahavitaran", "cesc",
        "jio", "airtel", "vodafone", "vi", "bsnl", "act fibernet", "hathway",
        "tata play", "dish tv", "mahanagar gas", "indraprastha gas", "igl",
        "water supply", "electricity", "broadband", "recharge", "utility"
    ],
    # Entertainment & Subscriptions
    "Entertainment": [
        "netflix", "spotify", "bookmyshow", "prime video", "hotstar", "disney",
        "pvr", "inox", "cinepolis", "sonyliv", "zee5", "youtube", "audible", "steam"
    ],
    # Healthcare & Fitness
    "Health": [
        "apollo pharmacy", "netmeds", "tata 1mg", "1mg", "medplus", "pharmeasy",
        "cult.fit", "cult fit", "gold gym", "anytime fitness", "practo", "max healthcare",
        "fortis", "dr lal", "diagnostic", "hospital", "clinic"
    ],
    # Investment & Finance
    "Investment": [
        "zerodha", "groww", "kuvera", "upstox", "angel one", "indmoney", "smallcase",
        "mutual fund", "sip", "uti mf", "hdfc amc", "icici prudential", "sbi mf", "ppfas"
    ]
}

def classify_merchant(
    merchant_name: str,
    user_rules: List[MerchantRule] = None
) -> Tuple[str, str, str]:
    """
    Classifies a merchant into a standard category.
    Returns: (normalized_merchant_name, category_name, status)
    status is 'confirmed' or 'needs_review'
    """
    if not merchant_name:
        return "Unknown Merchant", "General", "needs_review"

    clean_name = merchant_name.strip()
    lower_name = clean_name.lower()

    # 1. Check user-defined custom rules first
    if user_rules:
        for rule in user_rules:
            if rule.is_active and rule.keyword.lower() in lower_name:
                return clean_name.title(), rule.category, "confirmed"

    # 2. Check built-in Indian merchant knowledge base
    for category, keywords in INDIAN_MERCHANT_MAP.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', lower_name) or kw in lower_name:
                return clean_name.title(), category, "confirmed"

    # 3. Default fallback
    return clean_name.title(), "General", "needs_review"
