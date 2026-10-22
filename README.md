# Smart Daily Budget & Expense Tracking App for India 🇮🇳

A real, production-minded personal finance application designed for Indian users. The system helps individuals understand where their money goes, monitor expenses in real time, and stay strictly within a daily spending allowance.

---

## 1. Product Vision & Daily Spending Engine

The core math follows a transparent, predictable formula:

$$
\text{Flexible Monthly Budget} = \text{Monthly Income} - \text{Fixed Expenses} - \text{Savings Target} - \text{Emergency Reserve}
$$

$$
\text{Starting Daily Spending Allowance} = \frac{\text{Flexible Monthly Budget}}{\text{Days in Period (e.g., 30 Days)}}
$$

### Master Scenario Example:
- **Monthly Net Take-Home Income:** ₹1,00,000
- **Monthly Fixed Expenses (Rent, Bills, Subscriptions):** ₹20,000
- **Monthly Planned Savings:** ₹20,000
- **Remaining Flexible Spending Budget:** ₹60,000
- **Daily Flexible Allowance (30-day period):** **₹2,000 / day**

If the user spends:
1. **Coffee:** ₹250
2. **Blinkit:** ₹600
3. **Zepto:** ₹400
4. **Swiggy:** ₹500
- **Total Spent Today:** **₹1,750**
- **Remaining Daily Allowance:** **₹250**
- **Budget Consumed:** **87.5%**
- **Alert Status:** Amber Warning triggered (75% threshold crossed: *"Only ₹250 remains in your daily allowance."*)

---

## 2. Architecture & Tech Stack

```
Budget_manager/
├── Backend/                 # Python FastAPI REST Backend + Database Engine
│   ├── app/
│   │   ├── config.py        # Settings & JWT configuration
│   │   ├── database.py      # SQLAlchemy Engine (SQLite zero-config or PostgreSQL)
│   │   ├── models/          # User, Preference, Transaction, MerchantRule, AAConsent
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   ├── routers/         # auth, budget, transactions, analytics, account_aggregator
│   │   ├── services/        # budget_engine, categorization, csv_importer, notification_parser
│   │   └── utils/security.py# Bcrypt password hashing & JWT token issuance
│   ├── tests/               # 14 automated unit & integration test cases
│   ├── requirements.txt     # Python dependencies
│   └── .env.example
├── android/                 # Native Android App (Kotlin + Jetpack Compose)
│   ├── app/src/main/
│   │   ├── java/com/smartbudget/app/
│   │   │   ├── data/local/  # Room Database (TransactionEntity, UserProfileEntity, DAOs)
│   │   │   ├── data/remote/ # Retrofit client for FastAPI sync
│   │   │   ├── domain/      # BudgetEngine & IndianMerchantClassifier
│   │   │   ├── service/     # UpiNotificationListenerService (consented on-device parse)
│   │   │   ├── worker/      # WorkManager workers for Morning & Evening reminders
│   │   │   ├── ui/          # Material 3 Theme, Components, and Screens
│   │   │   └── MainActivity.kt # 5-tab Navigation Scaffold
│   │   └── AndroidManifest.xml
│   ├── build.gradle.kts
│   └── settings.gradle.kts
└── Frontend/                # React 19 + Vite Interactive Web Companion
    ├── src/
    │   ├── components/      # DailySpendingHero, CsvImportModal, AccountAggregatorModal, NotificationPreviewsCard
    │   ├── pages/           # Dashboard, Onboarding, Login
    │   └── lib/             # api.js client, auth.js, currency.js, smsParser.js
    └── package.json
```

---

## 3. Transaction Ingestion Pipeline

1. **Manual Entry:** Rapid expense dialog with Indian Rupee presets and instant category suggestion.
2. **CSV Bank Statement Import:** Supports HDFC, ICICI, SBI, Axis, and Kotak statements. Automatically maps columns, normalizes amounts, cleans narrations, and prevents duplicate imports via cryptographic hash matching.
3. **Consented Android Notification Listener (`UpiNotificationListenerService`):**
   - Captures transaction push notifications from Google Pay, PhonePe, Paytm, CRED, and banking apps.
   - **Privacy Guardrail:** Executed strictly on-device. Never stores OTPs, personal identity numbers, or passwords.
4. **RBI-Regulated Account Aggregator (AA) Ecosystem:**
   - Architecture based on ReBIT technical standards.
   - Connects to licensed NBFC-AAs (Setu, OneMoney, Anumati, Finvu) for read-only bank statement feeds.
   - User maintains full consent ownership and can revoke access with one tap.
5. **Interactive Demo Seeder:** One-click simulation preloading the exact Master Prompt benchmark without faking real bank credentials.

---

## 4. Running the Application

### A. Python FastAPI Backend

1. Navigate to the `Backend` directory:
   ```powershell
   cd "Backend"
   ```
2. Start the FastAPI development server:
   ```powershell
   $env:PYTHONPATH="."; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. Interactive Swagger API documentation is available at:
   - `http://localhost:8000/docs`
   - `http://localhost:8000/redoc`

### B. Running Automated Backend Tests

Run all 14 unit and integration test cases covering the budget engine, Indian merchant categorization, CSV bank statements, SMS notification parser, and cross-user isolation:
```powershell
$env:PYTHONPATH="Backend"; python -m unittest discover -s "Backend/tests" -p "test_*.py" -v
```

### C. React + Vite Web Companion

1. Open a terminal and start the Vite dev server:
   ```powershell
   npm --prefix "Frontend" run dev
   ```
2. Open `http://localhost:5173` in your browser.
3. Click **"Seed Master Prompt Demo"** on the dashboard to test the ₹2,000 daily budget and see the live ₹250 coffee + ₹600 Blinkit + ₹400 Zepto + ₹500 Swiggy spending breakdown in action!

### D. Android Jetpack Compose Native App

1. Open Android Studio and choose **Open an Existing Project**, pointing to the `android/` directory.
2. Ensure Android SDK Platform 34 and JDK 17 are selected.
3. Build or run on an Android device/emulator:
   ```powershell
   cd "android"
   ./gradlew assembleDebug
   ```

---

## 5. Security & Privacy Guarantees

- **Zero Credential Storage:** Banking passwords, UPI PINs, card CVVs, and OTPs are **never** requested, stored, or transmitted.
- **Data Minimization:** Financial records are strictly tied to the authenticated user ID with isolated database queries.
- **Read-Only Ingestion:** Financial statement ingestion is read-only; fund transfers or debits are impossible.
- **Revocable Consents:** Account Aggregator links can be revoked instantly at any time.
