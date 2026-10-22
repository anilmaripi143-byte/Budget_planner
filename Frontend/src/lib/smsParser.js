/**
 * Bank SMS Parser & Intelligent Categorization Engine for Smart Budget Planner
 */

/**
 * Converts a string to Title Case (e.g., "SREE LAKSHMI GENERAL STORES" -> "Sree Lakshmi General Stores")
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parses bank SMS text string into structured transaction object
 * @param {string} text Raw SMS message text
 * @returns {Object|null} Structured transaction or null if message is not a transaction
 */
export function parseBankSms(text) {
  if (!text || typeof text !== 'string') return null;
  const cleanText = text.trim();

  // 1. Noise Filter Check (Return null for OTP, balance-only alerts, loan/promos)
  const isOtp = /\b(otp|one time password|verification code|security code)\b/i.test(cleanText);
  const isPromo = /\b(pre-approved|apply for|loan offer|instant loan|credit limit increased|discount offer|congratulations|claim now)\b/i.test(cleanText);
  const hasTxAction = /\b(debited|credited|spent|paid|purchase|sent|withdrawn|deposited|received)\b/i.test(cleanText);
  const isBalanceOnly = /\b(avail bal|available balance|ac bal|bal is|balance:)\b/i.test(cleanText) && !hasTxAction;

  if (isOtp || isPromo || isBalanceOnly || !hasTxAction) {
    return null;
  }

  // 2. Amount Extraction
  // Matches "Rs.", "Rs ", "INR", "₹" followed by numeric value with optional commas and decimals
  const amountRegex = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const amountMatch = cleanText.match(amountRegex);
  if (!amountMatch) return null;

  const rawAmountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(rawAmountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // 3. Transaction Type (Expense vs Income)
  const isExpense = /\b(debited|spent|paid|purchase|sent|withdrawn|used at)\b/i.test(cleanText);
  const isIncome = /\b(credited|received|deposited)\b/i.test(cleanText);
  const type = isIncome && !isExpense ? 'income' : 'expense';

  // 4. Payment Method Extraction
  let paymentMethod = 'UPI';
  if (/\b(upi|vpa)\b/i.test(cleanText)) {
    paymentMethod = 'UPI';
  } else if (/\b(card|debit card|credit card|pos)\b/i.test(cleanText)) {
    paymentMethod = 'Card';
  } else if (/\b(atm|cash withdrawal)\b/i.test(cleanText)) {
    paymentMethod = 'ATM';
  } else if (/\b(net banking|neft|imps|rtgs)\b/i.test(cleanText)) {
    paymentMethod = 'Net Banking';
  } else if (/\b(cash)\b/i.test(cleanText)) {
    paymentMethod = 'Cash';
  }

  // 5. Account Last 4 Extraction
  let accountLast4 = '';
  const last4Match = cleanText.match(/(?:a\/c|account|card|ending|atm)\s*(?:no\.?|num)?\s*[*xX]*(\d{4})\b/i) ||
                     cleanText.match(/[*xX]{2,}(\d{4})\b/i);
  if (last4Match) {
    accountLast4 = last4Match[1];
  }

  // 6. Date Parsing
  let dateStr = new Date().toISOString().split('T')[0];
  const dateMatch = cleanText.match(/\b(\d{1,2})[-/.](\d{1,2}|[a-z]{3})[-/.](20\d{2}|\d{2})\b/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    let month = dateMatch[2];
    let year = dateMatch[3];
    if (year.length === 2) year = '20' + year;

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    if (isNaN(month)) {
      const idx = monthNames.indexOf(month.toLowerCase().slice(0, 3));
      month = idx !== -1 ? String(idx + 1).padStart(2, '0') : '01';
    } else {
      month = month.padStart(2, '0');
    }
    dateStr = `${year}-${month}-${day}`;
  }

  // 7. Merchant Extraction
  let merchant = 'Unknown Merchant';
  
  // Patterns: "to <MERCHANT>", "at <MERCHANT>", "towards <MERCHANT>", "VPA <MERCHANT>"
  const merchantRegex = /(?:to|at|towards|vpa)\s+([A-Z0-9\s&'-]+?)(?=\s+(?:on|via|ref|a\/c|bal|\.|\,|$))/i;
  const merchantMatch = cleanText.match(merchantRegex);

  if (merchantMatch && merchantMatch[1]) {
    let extracted = merchantMatch[1].trim();
    // Strip trailing keywords like "via", "on", etc if present
    extracted = extracted.replace(/\s+(via|on|ref|vpa|inr|rs).*$/i, '').trim();
    if (extracted.length > 2) {
      merchant = toTitleCase(extracted);
    }
  }

  return {
    amount,
    type,
    merchant,
    paymentMethod,
    date: dateStr,
    accountLast4
  };
}

/**
 * Keyword-based & Rule-based Categorization Engine
 * @param {string} userId User ID (for custom rule lookups)
 * @param {string} merchant Merchant name
 * @param {Array} customRules Optional user-defined merchant rules array
 * @returns {Object} { category: string, status: 'confirmed'|'needs_review' }
 */
export function categorise(userId, merchant, customRules = []) {
  if (!merchant) {
    return { category: 'Other', status: 'needs_review' };
  }

  const cleanMerchant = merchant.toLowerCase().trim();

  // Step a: Check custom merchant rules
  if (Array.isArray(customRules) && customRules.length > 0) {
    const matchedRule = customRules.find(r => 
      cleanMerchant.includes(r.merchant_keyword.toLowerCase())
    );
    if (matchedRule) {
      return { category: matchedRule.category_name, status: 'confirmed' };
    }
  }

  // Step b: Built-in Keyword Dictionaries
  const categoryKeywords = {
    Food: [
      'general store', 'kirana', 'mart', 'supermarket', 'grocery', 'bakery', 
      'restaurant', 'hotel', 'cafe', 'tea', 'juice', 'swiggy', 'zomato', 'biryani'
    ],
    Transport: [
      'petrol', 'fuel', 'diesel', 'uber', 'ola', 'rapido', 'metro', 'bus', 'irctc'
    ],
    Health: [
      'pharmacy', 'medical', 'hospital', 'clinic', 'lab'
    ],
    Bills: [
      'electricity', 'recharge', 'wifi', 'broadband', 'gas', 'water', 'airtel', 'jio'
    ],
    Shopping: [
      'amazon', 'flipkart', 'myntra', 'mall', 'fashion'
    ],
    Entertainment: [
      'movie', 'cinema', 'netflix', 'spotify', 'game'
    ]
  };

  for (const [catName, keywords] of Object.entries(categoryKeywords)) {
    for (const kw of keywords) {
      if (cleanMerchant.includes(kw)) {
        return { category: catName, status: 'confirmed' };
      }
    }
  }

  // Step c: Fallback to "Other" with needs_review status
  return { category: 'Other', status: 'needs_review' };
}
