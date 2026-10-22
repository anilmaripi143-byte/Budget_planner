import { parseBankSms, categorise } from './smsParser.js';

/**
 * Unit Test Suite for Bank SMS Parser & Categorizer
 */
export function runSmsParserTests() {
  const tests = [
    {
      name: "Benchmark Sree Lakshmi Sample",
      input: "Rs.50.00 debited from A/c XX1234 to SREE LAKSHMI GENERAL STORES on 28-09-26 via UPI.",
      expectedParse: {
        amount: 50,
        type: "expense",
        merchant: "Sree Lakshmi General Stores",
        paymentMethod: "UPI",
        accountLast4: "1234",
        date: "2026-09-28"
      },
      expectedCategory: "Food"
    },
    {
      name: "UPI Debit Transaction",
      input: "Rs. 250.00 debited from A/c XX9988 to SWIGGY FOOD on 15-09-26 via UPI.",
      expectedParse: {
        amount: 250,
        type: "expense",
        merchant: "Swiggy Food",
        paymentMethod: "UPI",
        accountLast4: "9988",
        date: "2026-09-15"
      },
      expectedCategory: "Food"
    },
    {
      name: "Card Purchase Transaction",
      input: "Spent Rs 1,450.00 at AMAZON INDIA on HDFC Card XX8890 on 20-09-26.",
      expectedParse: {
        amount: 1450,
        type: "expense",
        merchant: "Amazon India",
        paymentMethod: "Card",
        accountLast4: "8890",
        date: "2026-09-20"
      },
      expectedCategory: "Shopping"
    },
    {
      name: "ATM Cash Withdrawal",
      input: "Rs.2000.00 withdrawn from ATM XX4431 on 25-09-26.",
      expectedParse: {
        amount: 2000,
        type: "expense",
        paymentMethod: "ATM",
        accountLast4: "4431",
        date: "2026-09-25"
      }
    },
    {
      name: "Salary Credit Transaction",
      input: "INR 45,000.00 credited to A/c XX1234 by Salary Transfer on 01-09-26.",
      expectedParse: {
        amount: 45000,
        type: "income",
        accountLast4: "1234",
        date: "2026-09-01"
      }
    },
    {
      name: "OTP Verification Alert (Ignored)",
      input: "Your OTP for HDFC Bank login is 482019. Do not share with anyone.",
      expectedParse: null
    },
    {
      name: "Balance Inquiry Alert (Ignored)",
      input: "Your available balance in A/c XX1234 is Rs. 12,450.00.",
      expectedParse: null
    },
    {
      name: "Promotional Loan Offer (Ignored)",
      input: "Get instant pre-approved personal loan up to Rs. 5,000,000. Apply now!",
      expectedParse: null
    }
  ];

  console.log("=== RUNNING SMS PARSER UNIT TESTS ===");
  let passedCount = 0;

  tests.forEach((t, index) => {
    const parsed = parseBankSms(t.input);
    let isPass = false;

    if (t.expectedParse === null) {
      isPass = parsed === null;
    } else if (parsed !== null) {
      const matchAmount = parsed.amount === t.expectedParse.amount;
      const matchType = parsed.type === t.expectedParse.type;
      const matchMerchant = !t.expectedParse.merchant || parsed.merchant === t.expectedParse.merchant;
      const matchMethod = !t.expectedParse.paymentMethod || parsed.paymentMethod === t.expectedParse.paymentMethod;
      const matchLast4 = !t.expectedParse.accountLast4 || parsed.accountLast4 === t.expectedParse.accountLast4;
      
      isPass = matchAmount && matchType && matchMerchant && matchMethod && matchLast4;

      if (t.expectedCategory) {
        const catRes = categorise('user_123', parsed.merchant);
        if (catRes.category !== t.expectedCategory) {
          isPass = false;
        }
      }
    }

    if (isPass) {
      passedCount++;
      console.log(`✅ [PASS] Test ${index + 1}: ${t.name}`);
    } else {
      console.error(`❌ [FAIL] Test ${index + 1}: ${t.name}`);
      console.error("   Input:", t.input);
      console.error("   Parsed:", parsed);
      console.error("   Expected:", t.expectedParse);
    }
  });

  console.log(`=== TEST SUMMARY: ${passedCount} / ${tests.length} PASSED ===`);
  return { passedCount, total: tests.length };
}
