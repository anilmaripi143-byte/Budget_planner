import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, logout, saveSession, getUsers, saveUsers } from '../lib/auth';
import { SUPPORTED_CURRENCIES, detectAutoCurrency } from '../lib/currency';
import { parseBankSms, categorise } from '../lib/smsParser';
import DailySpendingHero from '../components/DailySpendingHero';
import CsvImportModal from '../components/CsvImportModal';
import AccountAggregatorModal from '../components/AccountAggregatorModal';
import NotificationPreviewsCard from '../components/NotificationPreviewsCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const session = getSession();

  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);

  // Currency state (Default Indian Rupee ₹)
  const [currency, setCurrency] = useState(SUPPORTED_CURRENCIES[0] || { symbol: '₹', code: 'INR', name: 'Indian Rupee' });

  // User financial configuration as per Master Prompt specifications:
  // Monthly income: ₹1,00,000 | Planned savings: ₹20,000 | Fixed expenses: ₹20,000 | Flexible: ₹60,000 | Daily: ₹2,000
  const [userPrefs, setUserPrefs] = useState(session?.preferences || {
    goal: 'Save Money & Stay on Daily Budget',
    salary: 100000,
    totalIncome: 100000,
    fixedExpenses: 20000,
    savingsTarget: 20000,
    emergencyReserve: 0,
    savingsRate: '20% of Income (Standard)',
    budgetStrategy: 'Smart Daily Allowance'
  });

  const [fixedExpenses, setFixedExpenses] = useState(userPrefs.fixedExpenses || 20000);
  const [savingsTarget, setSavingsTarget] = useState(userPrefs.savingsTarget || 20000);
  const monthlyIncome = Number(userPrefs.totalIncome || 100000);

  // Modals state for Bank CSV Import & RBI Account Aggregator
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAaModalOpen, setIsAaModalOpen] = useState(false);

  // Active tab navigation ('Overview' | 'Transactions' | 'Budgets' | 'Analytics' | 'Settings')
  const [activeTab, setActiveTab] = useState('Overview');

  // Transactions state pre-seeded with Master Prompt test scenario:
  // ₹250 coffee + ₹600 Blinkit + ₹400 Zepto + ₹500 Swiggy = ₹1,750 spent, ₹250 remaining!
  const [transactions, setTransactions] = useState([
    { id: 'mp-1', title: 'Coffee with Colleague', merchant: 'Starbucks Coffee', category: 'Dining', amount: -250, date: 'Today, 9:30 AM', method: 'UPI', status: 'confirmed', source: 'demo', icon: 'local_cafe', type: 'expense', account_last4: '4431' },
    { id: 'mp-2', title: 'Groceries Delivery', merchant: 'Blinkit', category: 'Groceries', amount: -600, date: 'Today, 11:15 AM', method: 'UPI', status: 'confirmed', source: 'demo', icon: 'shopping_cart', type: 'expense', account_last4: '4431' },
    { id: 'mp-3', title: 'Quick Snacks & Fruits', merchant: 'Zepto', category: 'Groceries', amount: -400, date: 'Today, 2:45 PM', method: 'UPI', status: 'confirmed', source: 'demo', icon: 'shopping_bag', type: 'expense', account_last4: '4431' },
    { id: 'mp-4', title: 'Dinner Order', merchant: 'Swiggy', category: 'Dining', amount: -500, date: 'Today, 8:15 PM', method: 'UPI', status: 'confirmed', source: 'demo', icon: 'restaurant', type: 'expense', account_last4: '4431' },
    { id: 'mp-5', title: 'Mutual Fund SIP Auto-Debit', merchant: 'Mutual Fund SIP', category: 'Investment', amount: -5000, date: '22 Sep 2026', method: 'Bank Transfer', status: 'confirmed', source: 'manual', icon: 'trending_up', type: 'expense', account_last4: '1234' },
    { id: 'mp-6', title: 'Monthly Salary Credit', merchant: 'Employer Direct Deposit', category: 'Income', amount: 100000, date: '01 Sep 2026', method: 'Direct Deposit', status: 'confirmed', source: 'manual', icon: 'account_balance', type: 'income', account_last4: '1234' }
  ]);

  // Webhook Key & Custom Merchant Rules state
  const [webhookKey, setWebhookKey] = useState(() => {
    return localStorage.getItem('sb_webhook_key') || '8f3b2a1c9e4d5f6a7b8c9d0e1f2a3b4c';
  });

  const [merchantRules, setMerchantRules] = useState([
    { id: 1, merchant_keyword: 'sree lakshmi', category_name: 'Food' },
    { id: 2, merchant_keyword: 'swiggy', category_name: 'Food' },
    { id: 3, merchant_keyword: 'uber', category_name: 'Transport' }
  ]);

  // Realtime Toast Alert State
  const [toastAlert, setToastAlert] = useState(null);
  const [highlightedCategory, setHighlightedCategory] = useState(null);

  // Manual Paste SMS Box State
  const [pasteSmsText, setPasteSmsText] = useState('');
  const [pasteParsedResult, setPasteParsedResult] = useState(null);

  // Settings UI States
  const [isSetupAndroidOpen, setIsSetupAndroidOpen] = useState(false);
  const [isSetupIosOpen, setIsSetupIosOpen] = useState(false);
  const [testSmsStatus, setTestSmsStatus] = useState(null);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  // Search & Filter state for Transactions tab
  const [txSearch, setTxSearch] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('All');
  const [txTypeFilter, setTxTypeFilter] = useState('All');

  // Needs Review Category Change Modal / Selection State
  const [alwaysRuleChecked, setAlwaysRuleChecked] = useState(true);

  // Budget Caps State
  const [budgetCaps, setBudgetCaps] = useState({
    Housing: 15000,
    Groceries: 8000,
    Transportation: 4000,
    Dining: 5000,
    Investment: 11000,
    Shopping: 6000,
    Food: 8000
  });

  // Modal State for Adding New Transaction
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Groceries');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState('expense');
  const [newMethod, setNewMethod] = useState('Credit Card');

  // Settings State
  const [settingsName, setSettingsName] = useState(session?.name || 'Lakshmi Venkat');
  const [settingsEmail, setSettingsEmail] = useState(session?.email || 'maripilakshmivenkat@gmail.com');
  const [settingsSalary, setSettingsSalary] = useState(userPrefs.salary || 45000);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');

  useEffect(() => {
    async function initCurr() {
      const detected = await detectAutoCurrency();
      if (detected) setCurrency(detected);
    }
    initCurr();
  }, []);

  // Parse manual paste box in real-time
  useEffect(() => {
    if (!pasteSmsText.trim()) {
      setPasteParsedResult(null);
      return;
    }
    const parsed = parseBankSms(pasteSmsText);
    if (parsed) {
      const catRes = categorise(session?.email || 'user', parsed.merchant, merchantRules);
      setPasteParsedResult({ ...parsed, category: catRes.category, status: catRes.status });
    } else {
      setPasteParsedResult(null);
    }
  }, [pasteSmsText, merchantRules, session]);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const triggerRealtimeToast = (msg, cat) => {
    setToastAlert(msg);
    if (cat) {
      setHighlightedCategory(cat);
      setTimeout(() => setHighlightedCategory(null), 3000);
    }
    setTimeout(() => setToastAlert(null), 5000);
  };

  // Process and save parsed SMS expense (from paste box or test SMS webhook simulation)
  const handleSaveSmsExpense = (parsedObj) => {
    if (!parsedObj) return;

    const newTx = {
      id: Date.now(),
      title: parsedObj.merchant,
      merchant: parsedObj.merchant,
      category: parsedObj.category || 'Food',
      amount: parsedObj.type === 'expense' ? -Math.abs(parsedObj.amount) : Math.abs(parsedObj.amount),
      date: 'Just now (SMS)',
      method: parsedObj.paymentMethod || 'UPI',
      status: parsedObj.status || 'confirmed',
      source: 'sms',
      icon: parsedObj.type === 'income' ? 'payments' : 'shopping_bag',
      type: parsedObj.type || 'expense',
      account_last4: parsedObj.accountLast4 || ''
    };

    setTransactions([newTx, ...transactions]);
    setPasteSmsText('');
    setPasteParsedResult(null);

    triggerRealtimeToast(`${currency.symbol}${parsedObj.amount} added to ${parsedObj.category} (auto)`, parsedObj.category);
  };

  // Send Test SMS Simulator
  const handleSendTestSms = () => {
    const sampleSms = "Rs.50.00 debited from A/c XX1234 to SREE LAKSHMI GENERAL STORES on 28-09-26 via UPI.";
    const parsed = parseBankSms(sampleSms);

    if (parsed) {
      const catRes = categorise(session?.email || 'user', parsed.merchant, merchantRules);
      const testResult = { ...parsed, category: catRes.category, status: catRes.status };
      
      handleSaveSmsExpense(testResult);
      setTestSmsStatus({
        success: true,
        message: `✅ Test Webhook Success! Received SMS for "Sree Lakshmi General Stores". Categorized as Food (${currency.symbol}50.00).`
      });
      setTimeout(() => setTestSmsStatus(null), 6000);
    }
  };

  // Regenerate Webhook Key
  const handleRegenerateKey = () => {
    const newKey = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setWebhookKey(newKey);
    localStorage.setItem('sb_webhook_key', newKey);
    setIsRegenerateModalOpen(false);
    triggerRealtimeToast("Webhook authorization key regenerated successfully", null);
  };

  // Handle one-tap category assignment for Needs Review expenses
  const handleConfirmCategory = (txId, categoryName) => {
    const txToUpdate = transactions.find(t => t.id === txId);
    if (!txToUpdate) return;

    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, category: categoryName, status: 'confirmed' };
      }
      return t;
    }));

    if (alwaysRuleChecked && txToUpdate.merchant) {
      const keyword = txToUpdate.merchant.toLowerCase();
      if (!merchantRules.some(r => r.merchant_keyword === keyword)) {
        setMerchantRules(prev => [...prev, { id: Date.now(), merchant_keyword: keyword, category_name: categoryName }]);
      }
    }

    triggerRealtimeToast(`${currency.symbol}${Math.abs(txToUpdate.amount)} categorized as ${categoryName} and confirmed`, categoryName);
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!newTitle || !newAmount) return;

    const numAmount = Number(newAmount);
    const finalAmount = newType === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

    const newTx = {
      id: Date.now(),
      title: newTitle,
      merchant: newTitle,
      category: newCategory,
      amount: finalAmount,
      date: 'Just now',
      method: newMethod,
      status: 'confirmed',
      source: 'manual',
      icon: newType === 'income' ? 'payments' : 'shopping_cart',
      type: newType,
      account_last4: ''
    };

    setTransactions([newTx, ...transactions]);
    setNewTitle('');
    setNewAmount('');
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...session,
      name: settingsName,
      email: settingsEmail,
      preferences: {
        ...userPrefs,
        salary: Number(settingsSalary),
        totalIncome: Number(settingsSalary) + 10000
      }
    };
    saveSession(updatedUser, true);
    setUserPrefs(updatedUser.preferences);

    const users = getUsers();
    const updatedUsers = users.map(u => {
      if (u.email?.toLowerCase() === session?.email?.toLowerCase()) {
        return { ...u, name: settingsName, preferences: updatedUser.preferences };
      }
      return u;
    });
    saveUsers(updatedUsers);

    setSettingsSavedMsg('Settings updated successfully!');
    setTimeout(() => setSettingsSavedMsg(''), 3000);
  };

  // Master Prompt Scenario Seeder:
  // Monthly income ₹1,00,000, Planned savings ₹20,000, Fixed expenses ₹20,000, Flexible ₹60,000, Daily budget ₹2,000
  // Today's spent: ₹250 coffee + ₹600 Blinkit + ₹400 Zepto + ₹500 Swiggy = ₹1,750 spent, ₹250 remaining (87.5% used)
  const handleSeedMasterDemo = () => {
    setUserPrefs(prev => ({
      ...prev,
      totalIncome: 100000,
      salary: 100000,
      fixedExpenses: 20000,
      savingsTarget: 20000,
      emergencyReserve: 0,
      goal: 'Save Money & Stay on Daily Budget',
      budgetStrategy: 'Smart Daily Allowance'
    }));
    setFixedExpenses(20000);
    setSavingsTarget(20000);

    const demoTxs = [
      { id: 'mp-1', title: 'Coffee with Colleague', merchant: 'Starbucks Coffee', category: 'Dining', amount: -250, date: 'Today, 9:30 AM', method: 'UPI', status: 'confirmed', source: 'demo', icon: 'local_cafe', type: 'expense', account_last4: '4431' },
      { id: 'mp-2', title: 'Groceries Delivery', merchant: 'Blinkit', category: 'Groceries', amount: -600, date: 'Today, 11:15 AM', method: 'UPI', status: 'confirmed', source: 'demo', icon: 'shopping_cart', type: 'expense', account_last4: '4431' },
      { id: 'mp-3', title: 'Quick Snacks & Fruits', merchant: 'Zepto', category: 'Groceries', amount: -400, date: 'Today, 2:45 PM', method: 'UPI', status: 'confirmed', source: 'demo', icon: 'shopping_bag', type: 'expense', account_last4: '4431' },
      { id: 'mp-4', title: 'Dinner Order', merchant: 'Swiggy', category: 'Dining', amount: -500, date: 'Today, 8:15 PM', method: 'UPI', status: 'confirmed', source: 'demo', icon: 'restaurant', type: 'expense', account_last4: '4431' }
    ];

    setTransactions(prev => [
      ...demoTxs,
      ...prev.filter(t => t.source !== 'demo' && !t.date.includes('Today'))
    ]);

    triggerRealtimeToast("Loaded Master Prompt Scenario: ₹1,750 spent today out of ₹2,000 allowance (₹250 remaining)", "Dining");
  };

  // Calculations
  const currentHour = new Date().getHours();
  const greeting = currentHour >= 4 && currentHour < 12 
    ? 'Good morning!' 
    : currentHour >= 12 && currentHour < 17 
    ? 'Good afternoon!' 
    : currentHour >= 17 && currentHour < 22 
    ? 'Good evening!' 
    : 'Good night!';

  // Smart Daily Allowance Formula: (Income - Fixed - Savings) / 30
  const flexibleMonthlyBudget = Math.max(0, monthlyIncome - fixedExpenses - savingsTarget);
  const daysInMonth = 30;
  const dailyAllowance = Math.round(flexibleMonthlyBudget / daysInMonth);

  // Today's Eligible Expenses Calculation
  const todayTxs = transactions.filter(t => (t.date.includes('Today') || t.date.includes('Just now')) && t.type === 'expense');
  const spentToday = todayTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const remainingAllowance = dailyAllowance - spentToday;
  const percentageConsumed = dailyAllowance > 0 ? Math.round((spentToday / dailyAllowance) * 1000) / 10 : 0;
  const isOverbudget = spentToday > dailyAllowance;

  // Warning Level
  let warningMessage = null;
  if (isOverbudget) {
    warningMessage = `You've exceeded today's budget by ${currency.symbol}${(spentToday - dailyAllowance).toLocaleString()}.`;
  } else if (percentageConsumed >= 90) {
    warningMessage = `Warning: 90% of today's budget consumed. Only ${currency.symbol}${remainingAllowance.toLocaleString()} left!`;
  } else if (percentageConsumed >= 75) {
    warningMessage = `Only ${currency.symbol}${remainingAllowance.toLocaleString()} remains in your daily allowance.`;
  } else if (percentageConsumed >= 50) {
    warningMessage = `You've used 50% of today's budget.`;
  }

  const totalSpent = Math.abs(
    transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0)
  );

  const totalEarned = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSavings = Math.round(monthlyIncome * 0.20);
  const totalBalance = 342850 + (totalEarned - totalSpent);

  // Category Spent Map
  const categorySpent = {
    Housing: 12500,
    Groceries: 6200 + (transactions.find(t => t.category === 'Groceries')?.amount ? Math.abs(transactions.find(t => t.category === 'Groceries').amount) : 0),
    Transportation: 2450,
    Dining: 3000 + (transactions.find(t => t.category === 'Dining')?.amount ? Math.abs(transactions.find(t => t.category === 'Dining').amount) : 0),
    Investment: 5000,
    Shopping: 2890,
    Food: 50
  };

  // Filtered Transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.title.toLowerCase().includes(txSearch.toLowerCase()) ||
                          tx.category.toLowerCase().includes(txSearch.toLowerCase());
    const matchesCategory = txCategoryFilter === 'All' || tx.category === txCategoryFilter;
    const matchesType = txTypeFilter === 'All' || tx.type === txTypeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const needsReviewTxList = transactions.filter(t => t.status === 'needs_review');

  const webhookUrl = `https://api.smartbudgetplanner.app/api/sms-webhook`;

  return (
    <div className="min-h-screen w-full bg-[#f4f7f6] dark:bg-[#121517] text-[#191c1e] dark:text-white flex flex-col font-sans selection:bg-[#89f5e7] selection:text-[#00201d]">
      
      {/* REALTIME TOAST NOTIFICATION */}
      {toastAlert && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#00685f] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-teal-400 font-bold text-xs">
          <span className="material-symbols-outlined text-[20px] text-[#89f5e7]">notifications_active</span>
          <span>{toastAlert}</span>
        </div>
      )}

      {/* --- TOP FULL NAVBAR --- */}
      <header className="w-full bg-white dark:bg-[#1e2326] border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('Overview')}>
            <div className="w-9 h-9 rounded-xl bg-[#00685f] text-white flex items-center justify-center font-bold shadow-md shadow-[#00685f]/20">
              <svg className="w-5.5 h-5.5 fill-current" viewBox="0 0 24 24">
                <path d="M5 9.2h3V19H5V9.2zm6-4h3V19h-3V5.2zm6 8h3V19h-3v-5.8zM19 4l-4.5 4.5h3.2v2h2.6V4h-1.3zM4 21h16v1.5H4V21z"></path>
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-[#191c1e] dark:text-white">Smart Budget Planner</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[#89f5e7] text-[#00201d] font-bold text-[0.6rem] uppercase tracking-wider">PRO 2.0</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4">
            {['Overview', 'Transactions', 'Budgets', 'Analytics', 'Settings'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#e6f7f5] dark:bg-[#005049]/40 text-[#00685f] dark:text-[#6bd8cb]'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Nav Action Controls */}
        <div className="flex items-center gap-3">
          
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title="Toggle dark mode"
          >
            <span className="material-symbols-outlined text-[18px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
            <div className="w-8 h-8 rounded-full bg-[#00685f] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {session?.name ? session.name[0].toUpperCase() : 'L'}
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-bold text-[#191c1e] dark:text-white leading-tight">
                {session?.name || 'Lakshmi Venkat'}
              </span>
              <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                {session?.email || 'maripilakshmivenkat@gmail.com'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* --- MOBILE TAB NAV BAR --- */}
      <div className="md:hidden bg-white dark:bg-[#1e2326] border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between overflow-x-auto">
        {['Overview', 'Transactions', 'Budgets', 'Analytics', 'Settings'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-[#e6f7f5] dark:bg-[#005049]/40 text-[#00685f] dark:text-[#6bd8cb]'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* --- MAIN DASHBOARD CONTENT AREA --- */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ======================================================== */}
        {/* NEEDS REVIEW UNUNCATEGORIZED SMS EXPENSES BANNER          */}
        {/* ======================================================== */}
        {needsReviewTxList.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-extrabold text-sm tracking-tight">
                <span className="material-symbols-outlined text-[20px] text-amber-600">warning</span>
                <span>{needsReviewTxList.length} Uncategorized SMS Expense{needsReviewTxList.length === 1 ? '' : 's'} Needs Review</span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100">
                Action Required
              </span>
            </div>

            {needsReviewTxList.map(tx => (
              <div key={tx.id} className="bg-white dark:bg-[#1e2326] p-4 rounded-xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-sm text-[#191c1e] dark:text-white">{tx.merchant || tx.title}</span>
                    <span className="text-xs text-gray-400 block font-mono">
                      {currency.symbol}{Math.abs(tx.amount)} debited • {tx.date} • {tx.method} {tx.account_last4 ? `(A/c XX${tx.account_last4})` : ''}
                    </span>
                  </div>
                  <span className="font-mono text-base font-extrabold text-rose-600">
                    -{currency.symbol}{Math.abs(tx.amount)}
                  </span>
                </div>

                <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Category:</span>
                    
                    <label className="flex items-center gap-1.5 cursor-pointer text-[0.7rem] font-bold text-[#00685f] dark:text-[#6bd8cb] select-none">
                      <input
                        type="checkbox"
                        checked={alwaysRuleChecked}
                        onChange={(e) => setAlwaysRuleChecked(e.target.checked)}
                        className="rounded text-[#00685f] focus:ring-[#00685f]"
                      />
                      <span>Always use this category for "{tx.merchant}"</span>
                    </label>
                  </div>

                  {/* One-Tap Category Chips */}
                  <div className="flex flex-wrap gap-2">
                    {['Food', 'Transport', 'Health', 'Bills', 'Shopping', 'Entertainment'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleConfirmCategory(tx.id, cat)}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-[#00685f] hover:text-white text-xs font-bold text-gray-700 dark:text-gray-200 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>{cat === 'Food' ? '🛒' : cat === 'Transport' ? '🚗' : cat === 'Health' ? '🏥' : cat === 'Bills' ? '⚡' : cat === 'Shopping' ? '🛍️' : '🎬'}</span>
                        <span>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: OVERVIEW TAB                                     */}
        {/* ======================================================== */}
        {activeTab === 'Overview' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* HERO DAILY BUDGET ALLOWANCE ENGINE */}
            <DailySpendingHero
              dailyBudget={dailyAllowance}
              spentToday={spentToday}
              remainingToday={remainingAllowance}
              percentageUsed={percentageConsumed}
              isOverbudget={isOverbudget}
              warningMessage={warningMessage}
              greeting={greeting}
              currencySymbol={currency.symbol}
              onSeedDemo={handleSeedMasterDemo}
              onOpenAddExpense={() => setIsModalOpen(true)}
            />

            {/* QUICK ACTIONS BAR: CSV STATEMENT IMPORT & RBI ACCOUNT AGGREGATOR */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1e2326] p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00685f] dark:text-[#6bd8cb] text-[20px]">sync_alt</span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Transaction Ingestion Architecture
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-teal-600">upload_file</span>
                  <span>Import Bank CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAaModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#e6f7f5] hover:bg-[#ccfbf1] dark:bg-[#005049]/40 dark:hover:bg-[#005049]/60 text-xs font-bold text-[#00685f] dark:text-[#6bd8cb] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">account_balance</span>
                  <span>RBI Account Aggregator (AA)</span>
                </button>
              </div>
            </div>

            {/* DAILY NOTIFICATION SCHEDULE PREVIEW CARD */}
            <NotificationPreviewsCard
              dailyBudget={dailyAllowance}
              spentToday={spentToday}
              remainingToday={remainingAllowance}
              isOverbudget={isOverbudget}
              currencySymbol={currency.symbol}
            />

            {/* PASTE BANK SMS MANUAL FALLBACK BOX CARD */}
            <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-5 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#e6f7f5] dark:bg-[#005049]/40 text-[#00685f] dark:text-[#6bd8cb] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[18px]">sms</span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#191c1e] dark:text-white">Paste Bank SMS (Manual Fallback)</h3>
                    <p className="text-[11px] text-gray-400">Paste raw bank SMS text to instantly parse and record the expense into your planner.</p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold text-[0.65rem] uppercase">
                  Zero-Knowledge Parser
                </span>
              </div>

              <div className="space-y-2">
                <textarea
                  rows="2"
                  value={pasteSmsText}
                  onChange={(e) => setPasteSmsText(e.target.value)}
                  placeholder="e.g. Rs.50.00 debited from A/c XX1234 to SREE LAKSHMI GENERAL STORES on 28-09-26 via UPI."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs font-mono outline-none border border-gray-200 dark:border-gray-700 focus:border-[#00685f]"
                ></textarea>

                {pasteParsedResult && (
                  <div className="p-3 rounded-xl bg-[#f4fffc] dark:bg-[#005049]/30 border border-[#00685f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#191c1e] dark:text-white">{pasteParsedResult.merchant}</span>
                        <span className="px-2 py-0.5 rounded bg-[#89f5e7] text-[#00201d] font-bold text-[10px]">
                          {pasteParsedResult.category}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 block font-mono">
                        Method: {pasteParsedResult.paymentMethod} {pasteParsedResult.accountLast4 ? `(A/c XX${pasteParsedResult.accountLast4})` : ''} • Date: {pasteParsedResult.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-extrabold text-[#00685f] dark:text-[#6bd8cb]">
                        {currency.symbol}{pasteParsedResult.amount.toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSaveSmsExpense(pasteParsedResult)}
                        className="px-4 py-2 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Save Expense
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4 KPI SUMMARY BENTO CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Net Balance */}
              <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-5 shadow-xs border border-gray-200/80 dark:border-gray-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Net Balance</span>
                  <div className="w-9 h-9 rounded-xl bg-[#e6f7f5] dark:bg-[#005049]/40 text-[#00685f] dark:text-[#6bd8cb] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">account_balance</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#191c1e] dark:text-white">
                    {currency.symbol}{totalBalance.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-xs text-[#006947] dark:text-[#6ffbbe] font-bold">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    <span>+14.2% vs last month</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Monthly Income */}
              <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-5 shadow-xs border border-gray-200/80 dark:border-gray-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Monthly Net Income</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#191c1e] dark:text-white">
                    {currency.symbol}{monthlyIncome.toLocaleString()}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    Fixed salary + side incomes
                  </div>
                </div>
              </div>

              {/* Card 3: Monthly Expenses */}
              <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-5 shadow-xs border border-gray-200/80 dark:border-gray-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Monthly Expenses</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#191c1e] dark:text-white">
                    {currency.symbol}{totalSpent.toLocaleString()}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    {Math.round((totalSpent / monthlyIncome) * 100)}% of monthly income used
                  </div>
                </div>
              </div>

              {/* Card 4: Total Savings Target */}
              <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-5 shadow-xs border border-gray-200/80 dark:border-gray-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Savings Target (20%)</span>
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#00685f] dark:text-[#6bd8cb] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">savings</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#00685f] dark:text-[#6bd8cb]">
                    {currency.symbol}{totalSavings.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-xs text-[#00685f] dark:text-[#6bd8cb] font-bold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>On track for monthly goal</span>
                  </div>
                </div>
              </div>

            </div>

            {/* DUAL COLUMN MIDDLE SECTION: CATEGORY BUDGETS & TRANSACTIONS FEED */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT 7 COLS: Category Expense Allocation & 50/30/20 Rule */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Category Limits Card */}
                <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-6 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-lg text-[#191c1e] dark:text-white">Budget Allocation & Category Limits</h3>
                      <p className="text-xs text-gray-400">Strategy: {userPrefs.budgetStrategy}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('Budgets')}
                      className="px-2.5 py-1 rounded-full bg-[#e6f7f5] dark:bg-[#005049]/40 text-[#00685f] dark:text-[#6bd8cb] font-extrabold text-[0.65rem] uppercase cursor-pointer hover:bg-[#ccfbf1]"
                    >
                      Manage Budgets →
                    </button>
                  </div>

                  {/* Category Progress List */}
                  <div className="space-y-4">
                    {/* Food */}
                    <div className={`space-y-1.5 p-2 rounded-xl transition-colors ${
                      highlightedCategory === 'Food' ? 'bg-[#e6f7f5] dark:bg-[#005049]/40 ring-2 ring-[#00685f]' : ''
                    }`}>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-2 text-[#191c1e] dark:text-white">
                          <span>🛒</span> Groceries & Food
                        </span>
                        <span className="font-mono text-gray-500">
                          {currency.symbol}{categorySpent.Groceries.toLocaleString()} / {currency.symbol}{budgetCaps.Groceries.toLocaleString()} ({Math.round((categorySpent.Groceries / budgetCaps.Groceries)*100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#00685f] h-full rounded-full transition-all duration-500" style={{ width: `${(categorySpent.Groceries / budgetCaps.Groceries)*100}%` }}></div>
                      </div>
                    </div>

                    {/* Housing */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-2 text-[#191c1e] dark:text-white">
                          <span>🏠</span> Housing & Utilities
                        </span>
                        <span className="font-mono text-gray-500">
                          {currency.symbol}{categorySpent.Housing.toLocaleString()} / {currency.symbol}{budgetCaps.Housing.toLocaleString()} ({Math.round((categorySpent.Housing / budgetCaps.Housing)*100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#00685f] h-full rounded-full" style={{ width: `${(categorySpent.Housing / budgetCaps.Housing)*100}%` }}></div>
                      </div>
                    </div>

                    {/* Transportation */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-2 text-[#191c1e] dark:text-white">
                          <span>🚗</span> Transportation & Fuel
                        </span>
                        <span className="font-mono text-gray-500">
                          {currency.symbol}{categorySpent.Transportation.toLocaleString()} / {currency.symbol}{budgetCaps.Transportation.toLocaleString()} ({Math.round((categorySpent.Transportation / budgetCaps.Transportation)*100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(categorySpent.Transportation / budgetCaps.Transportation)*100}%` }}></div>
                      </div>
                    </div>

                    {/* Entertainment */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-2 text-[#191c1e] dark:text-white">
                          <span>🎬</span> Dining & Entertainment
                        </span>
                        <span className="font-mono text-gray-500">
                          {currency.symbol}{categorySpent.Dining.toLocaleString()} / {currency.symbol}{budgetCaps.Dining.toLocaleString()} ({Math.round((categorySpent.Dining / budgetCaps.Dining)*100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(categorySpent.Dining / budgetCaps.Dining)*100}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* 50/30/20 Breakdown Summary Banner */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3 text-center">
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <span className="block text-[0.65rem] font-bold text-gray-400 uppercase">Needs (50%)</span>
                      <span className="font-mono font-bold text-xs text-[#191c1e] dark:text-white mt-0.5 block">
                        {currency.symbol}{(monthlyIncome * 0.5).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <span className="block text-[0.65rem] font-bold text-gray-400 uppercase">Wants (30%)</span>
                      <span className="font-mono font-bold text-xs text-[#191c1e] dark:text-white mt-0.5 block">
                        {currency.symbol}{(monthlyIncome * 0.3).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#e6f7f5] dark:bg-[#005049]/30">
                      <span className="block text-[0.65rem] font-bold text-[#00685f] dark:text-[#6bd8cb] uppercase">Savings (20%)</span>
                      <span className="font-mono font-bold text-xs text-[#00685f] dark:text-[#6bd8cb] mt-0.5 block">
                        {currency.symbol}{(monthlyIncome * 0.2).toLocaleString()}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Smart Insights Callout */}
                <div className="bg-gradient-to-r from-[#00685f] to-[#005049] text-white rounded-2xl p-5 shadow-md flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[26px] text-[#89f5e7]">auto_awesome</span>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-sm tracking-tight">AI Wealth Optimization Guardrail</h4>
                    <p className="text-xs text-teal-100 leading-snug">
                      You are currently saving <span className="font-bold text-white">{currency.symbol}{totalSavings.toLocaleString()}</span> monthly. Keep dining expenses under {currency.symbol}5,000 to maintain your 20% target.
                    </p>
                  </div>
                </div>

              </div>

              {/* RIGHT 5 COLS: Recent Transactions Feed */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-6 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-[#191c1e] dark:text-white">Recent Activity</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Transactions')}
                      className="text-xs font-bold text-[#00685f] dark:text-[#6bd8cb] hover:underline"
                    >
                      View All ({transactions.length}) →
                    </button>
                  </div>

                  {/* Transactions List */}
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {transactions.slice(0, 5).map(tx => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            tx.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            <span className="material-symbols-outlined text-[18px]">{tx.icon}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#191c1e] dark:text-white">{tx.title}</span>
                              {tx.source === 'sms' && (
                                <span className="px-1.5 py-0.2 rounded bg-[#89f5e7] text-[#00201d] font-bold text-[9px] uppercase">Auto</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400">{tx.category} • {tx.date}</div>
                          </div>
                        </div>

                        <span className={`font-mono text-xs font-bold ${
                          tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          {tx.type === 'income' ? '+' : ''}{currency.symbol}{Math.abs(tx.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: TRANSACTIONS TAB WITH PASTE BANK SMS FALLBACK     */}
        {/* ======================================================== */}
        {activeTab === 'Transactions' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header Strip & Search Controls */}
            <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-6 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">Transaction Register</h1>
                  <p className="text-xs text-gray-400 mt-0.5">Audit, categorize, and track all incoming & outgoing funds in real-time.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Transaction</span>
                </button>
              </div>

              {/* PASTE BANK SMS BOX (MANUAL FALLBACK) */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00685f] dark:text-[#6bd8cb] text-[18px]">content_paste</span>
                    <span className="font-extrabold text-xs text-[#191c1e] dark:text-white uppercase tracking-wider">Paste Bank SMS (Manual Fallback)</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Zero-Knowledge Parse</span>
                </div>

                <textarea
                  rows="2"
                  value={pasteSmsText}
                  onChange={(e) => setPasteSmsText(e.target.value)}
                  placeholder="Paste SMS text e.g. Rs.50.00 debited from A/c XX1234 to SREE LAKSHMI GENERAL STORES on 28-09-26 via UPI."
                  className="w-full p-3 rounded-xl bg-white dark:bg-[#1e2326] text-xs font-mono outline-none border border-gray-200 dark:border-gray-700 focus:border-[#00685f]"
                ></textarea>

                {pasteParsedResult && (
                  <div className="p-3 rounded-xl bg-[#f4fffc] dark:bg-[#005049]/30 border border-[#00685f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#191c1e] dark:text-white">{pasteParsedResult.merchant}</span>
                        <span className="px-2 py-0.5 rounded bg-[#89f5e7] text-[#00201d] font-bold text-[10px]">
                          {pasteParsedResult.category}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 block font-mono">
                        Method: {pasteParsedResult.paymentMethod} {pasteParsedResult.accountLast4 ? `(A/c XX${pasteParsedResult.accountLast4})` : ''} • Date: {pasteParsedResult.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-extrabold text-[#00685f] dark:text-[#6bd8cb]">
                        {currency.symbol}{pasteParsedResult.amount.toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSaveSmsExpense(pasteParsedResult)}
                        className="px-4 py-2 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Save Expense
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filters & Search Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <div className="sm:col-span-6 relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-gray-400 text-[18px]">search</span>
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search by merchant, category, or note..."
                    className="w-full h-10 pl-9 pr-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#00685f]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={txCategoryFilter}
                    onChange={(e) => setTxCategoryFilter(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    <option value="Food">Food / Groceries</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Housing">Housing</option>
                    <option value="Dining">Dining</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Investment">Investment</option>
                    <option value="Income">Income</option>
                    <option value="Shopping">Shopping</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="All">All Types (Income & Expenses)</option>
                    <option value="expense">Expenses Only</option>
                    <option value="income">Income Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Transactions Table Card */}
            <div className="bg-white dark:bg-[#1e2326] rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Showing {filteredTransactions.length} of {transactions.length} Transactions
                </span>
                <span className="font-mono text-xs font-bold text-[#00685f] dark:text-[#6bd8cb]">
                  Net Flow: {currency.symbol}{(totalEarned - totalSpent).toLocaleString()}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 text-[0.7rem] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                      <th className="py-3 px-4">Merchant / Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs font-medium">
                    {filteredTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#191c1e] dark:text-white flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            <span className="material-symbols-outlined text-[16px]">{tx.icon}</span>
                          </div>
                          <span>{tx.merchant || tx.title}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-700 dark:text-gray-300">{tx.category}</td>
                        <td className="py-3.5 px-4">
                          {tx.source === 'sms' ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#89f5e7] text-[#00201d] font-bold text-[10px] uppercase">
                              Auto SMS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold uppercase">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">{tx.date}</td>
                        <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-semibold">
                            {tx.method} {tx.account_last4 ? `(XX${tx.account_last4})` : ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {tx.status === 'needs_review' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 font-bold text-[10px]">
                              Needs Review
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-[10px]">
                              Confirmed
                            </span>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                          tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#191c1e] dark:text-white'
                        }`}>
                          {tx.type === 'income' ? '+' : ''}{currency.symbol}{Math.abs(tx.amount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: BUDGETS TAB                                      */}
        {/* ======================================================== */}
        {activeTab === 'Budgets' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-6 shadow-xs border border-gray-200/80 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">Budget Allocation & Envelope Limits</h1>
                <p className="text-xs text-gray-400 mt-0.5">Configured strategy: <span className="font-bold text-[#00685f] dark:text-[#6bd8cb]">{userPrefs.budgetStrategy}</span></p>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#e6f7f5] dark:bg-[#005049]/40 text-[#00685f] dark:text-[#6bd8cb] text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Active Target: {currency.symbol}{monthlyIncome.toLocaleString()} / mo</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Envelope Items */}
              <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-5 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏠</span>
                    <div>
                      <h3 className="font-bold text-sm text-[#191c1e] dark:text-white">Housing & Rent</h3>
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Needs Bucket</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#00685f] dark:text-[#6bd8cb]">83% Used</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Spent: {currency.symbol}12,500</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">Cap: {currency.symbol}{budgetCaps.Housing.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#00685f] h-full rounded-full w-[83%]"></div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-5 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛒</span>
                    <div>
                      <h3 className="font-bold text-sm text-[#191c1e] dark:text-white">Groceries & Food</h3>
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Needs Bucket</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#00685f] dark:text-[#6bd8cb]">77% Used</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Spent: {currency.symbol}6,250</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">Cap: {currency.symbol}{budgetCaps.Groceries.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#00685f] h-full rounded-full w-[77%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: ANALYTICS TAB                                    */}
        {/* ======================================================== */}
        {activeTab === 'Analytics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 bg-white dark:bg-[#1e2326] rounded-2xl p-6 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Financial Health Rating</span>
                <div className="font-mono text-4xl font-extrabold text-[#00685f] dark:text-[#6bd8cb]">88 / 100</div>
                <p className="text-xs text-gray-500">Your resilience score is in the top 5% of members. Keep dining under {currency.symbol}5,000.</p>
              </div>

              <div className="lg:col-span-8 bg-white dark:bg-[#1e2326] rounded-2xl p-6 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-4">
                <h3 className="font-extrabold text-lg text-[#191c1e] dark:text-white">Monthly Cash Flow & Burn Rate</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                    <span className="text-xs font-bold text-emerald-800">Inflow</span>
                    <div className="font-mono text-2xl font-extrabold text-emerald-600">{currency.symbol}{monthlyIncome.toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                    <span className="text-xs font-bold text-rose-800">Outflow</span>
                    <div className="font-mono text-2xl font-extrabold text-rose-600">{currency.symbol}{totalSpent.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: SETTINGS TAB WITH AUTO-TRACK BANK SMS SECTION    */}
        {/* ======================================================== */}
        {activeTab === 'Settings' && (
          <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
            
            {/* 1. AUTO-TRACK BANK SMS SETTINGS SECTION */}
            <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00685f] text-white flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[22px]">phonelink_ring</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">Auto-Track Bank SMS</h2>
                    <p className="text-xs text-gray-400">Automate expense logging by forwarding bank SMS notifications directly to your webhook.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendTestSms}
                  className="px-3.5 py-2 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Send Test SMS</span>
                </button>
              </div>

              {testSmsStatus && (
                <div className="p-3 rounded-xl bg-[#f4fffc] dark:bg-[#005049]/40 border border-[#00685f]/30 text-xs font-bold text-[#00685f] dark:text-[#6bd8cb] flex items-center gap-2 animate-fadeIn">
                  <span>{testSmsStatus.message}</span>
                </div>
              )}

              {/* Webhook Credentials Box */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="space-y-1">
                  <label className="block text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider">
                    Your Webhook Endpoint URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="w-full h-10 px-3 bg-white dark:bg-[#1e2326] rounded-xl text-xs font-mono font-bold text-[#191c1e] dark:text-white border border-gray-200 dark:border-gray-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        triggerRealtimeToast("Webhook URL copied to clipboard", null);
                      }}
                      className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="block text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider">
                    Your Authorization Webhook Key (32-Char Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookKey}
                      className="w-full h-10 px-3 bg-white dark:bg-[#1e2326] rounded-xl text-xs font-mono font-bold text-[#00685f] dark:text-[#6bd8cb] border border-gray-200 dark:border-gray-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookKey);
                        triggerRealtimeToast("Webhook key copied to clipboard", null);
                      }}
                      className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Copy Key
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegenerateModalOpen(true)}
                      className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Regenerate Key
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Setup Guides */}
              <div className="space-y-3 pt-2">
                <h3 className="font-extrabold text-sm text-[#191c1e] dark:text-white uppercase tracking-wider">
                  Mobile Setup Automations
                </h3>

                {/* Android Setup */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsSetupAndroidOpen(prev => !prev)}
                    className="w-full p-3.5 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 flex items-center justify-between text-left text-xs font-bold text-[#191c1e] dark:text-white cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">adb</span>
                      <span>Android Setup (MacroDroid / Tasker / SMS Forwarder)</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">
                      {isSetupAndroidOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {isSetupAndroidOpen && (
                    <div className="p-4 bg-white dark:bg-[#1e2326] text-xs text-gray-600 dark:text-gray-300 space-y-2 font-sans border-t border-gray-200 dark:border-gray-700">
                      <p><strong>Step 1:</strong> Install <em>MacroDroid</em> or <em>Tasker</em> from Google Play Store.</p>
                      <p><strong>Step 2:</strong> Create Trigger: <code>SMS Received</code> &rarr; Filter by Bank IDs (e.g. <code>HDFCBK</code>, <code>ICICIB</code>, <code>SBIIN</code>).</p>
                      <p><strong>Step 3:</strong> Create Action: <code>HTTP POST Request</code> to <code>{webhookUrl}</code>.</p>
                      <p><strong>Step 4:</strong> Set Headers <code>Content-Type: application/json</code> and JSON Body:</p>
                      <pre className="p-2 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-mono">
                        {`{\n  "key": "${webhookKey}",\n  "sms_text": "[sms_body]",\n  "received_at": "[sms_time]"\n}`}
                      </pre>
                    </div>
                  )}
                </div>

                {/* iOS Setup */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsSetupIosOpen(prev => !prev)}
                    className="w-full p-3.5 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 flex items-center justify-between text-left text-xs font-bold text-[#191c1e] dark:text-white cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600 text-[18px]">phone_iphone</span>
                      <span>iPhone Setup (Apple Shortcuts Automation)</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">
                      {isSetupIosOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {isSetupIosOpen && (
                    <div className="p-4 bg-white dark:bg-[#1e2326] text-xs text-gray-600 dark:text-gray-300 space-y-2 font-sans border-t border-gray-200 dark:border-gray-700">
                      <p><strong>Step 1:</strong> Open <em>Shortcuts</em> app &rarr; Navigate to <strong>Automation</strong> tab &rarr; Tap <code>+</code>.</p>
                      <p><strong>Step 2:</strong> Select <strong>Message</strong> &rarr; Set Sender filter to your Bank name (e.g. <code>HDFC</code>, <code>SBI</code>).</p>
                      <p><strong>Step 3:</strong> Add Action: <code>Get Contents of URL</code> &rarr; Set Method to <code>POST</code> URL: <code>{webhookUrl}</code>.</p>
                      <p><strong>Step 4:</strong> Add Request Body JSON with <code>key: {webhookKey}</code> and <code>sms_text: Shortcut Input</code>.</p>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* 2. GENERAL PROFILE & SALARY SETTINGS */}
            <div className="bg-white dark:bg-[#1e2326] rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200/80 dark:border-gray-800 space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-[#191c1e] dark:text-white tracking-tight">Account & Financial Settings</h1>
                <p className="text-xs text-gray-400 mt-0.5">Update profile info, salary baseline, and security options.</p>
              </div>

              {settingsSavedMsg && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{settingsSavedMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="space-y-3">
                  <h3 className="font-extrabold text-sm text-[#191c1e] dark:text-white uppercase tracking-wider text-[#00685f]">
                    Profile Information
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                        className="w-full h-11 px-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#00685f]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={settingsEmail}
                        onChange={(e) => setSettingsEmail(e.target.value)}
                        className="w-full h-11 px-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#00685f]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-[#00685f]">
                    Financial Baseline Calibration
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Monthly Take-Home Salary ({currency.symbol})
                    </label>
                    <input
                      type="number"
                      value={settingsSalary}
                      onChange={(e) => setSettingsSalary(e.target.value)}
                      className="w-full h-11 px-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#00685f]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/onboarding')}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Re-run 5-Question Onboarding
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

      </main>

      {/* --- CONFIRM REGENERATE KEY MODAL --- */}
      {isRegenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#1e2326] rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">key_off</span>
            </div>
            <h3 className="text-lg font-extrabold text-[#191c1e] dark:text-white">Regenerate Webhook Key?</h3>
            <p className="text-xs text-gray-500">
              Regenerating will invalidate your current 32-character key. You will need to update the key in your Tasker / Shortcuts automations.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRegenerateModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateKey}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
              >
                Regenerate Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD TRANSACTION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#1e2326] rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#191c1e] dark:text-white">Add New Transaction</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Title / Merchant
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Grocery Store"
                  className="w-full h-11 px-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#00685f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Amount ({currency.symbol})
                  </label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="1200"
                    className="w-full h-11 px-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#00685f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#00685f]"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#00685f]"
                  >
                    <option value="Groceries">Groceries</option>
                    <option value="Food">Food</option>
                    <option value="Housing">Housing & Utilities</option>
                    <option value="Dining">Dining & Coffee</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Investment">Investment</option>
                    <option value="Income">Income / Salary</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Method
                  </label>
                  <select
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#00685f]"
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI / Wallet">UPI / Wallet</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Add Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bank Statement Importer Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportSuccess={(newItems) => {
          const importedFormatted = newItems.map(i => ({
            id: `csv-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            title: i.description,
            merchant: i.merchant,
            category: i.category,
            amount: i.direction === 'debit' ? -Math.abs(i.amount) : Math.abs(i.amount),
            date: `${i.date} (CSV)`,
            method: i.payment_method,
            status: 'confirmed',
            source: 'csv',
            icon: i.direction === 'credit' ? 'payments' : 'receipt_long',
            type: i.type,
            account_last4: i.account_last4 || ''
          }));
          setTransactions(prev => [...importedFormatted, ...prev]);
          triggerRealtimeToast(`Successfully imported ${newItems.length} transactions from bank statement without duplicates!`, 'Groceries');
        }}
        currencySymbol={currency.symbol}
      />

      {/* RBI Account Aggregator Modal */}
      <AccountAggregatorModal
        isOpen={isAaModalOpen}
        onClose={() => setIsAaModalOpen(false)}
      />

      {/* --- FOOTER --- */}
      <footer className="w-full text-center py-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400 font-medium">
        © 2026 Smart Budget Planner. Encrypted with bank-grade privacy standards.
      </footer>
    </div>
  );
}
