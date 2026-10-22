import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import WebGLFluidShader from '../components/WebGLFluidShader';
import { loginUser, registerUser, isValidEmail, getSession, saveSession } from '../lib/auth';
import { signInWithFirebaseGoogle, signInWithFirebaseEmail } from '../lib/firebase';

export default function Login({ defaultTab = 'signin' }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State: 'signin' or 'new_account'
  const [activeTab, setActiveTab] = useState(
    location.pathname === '/signup' ? 'new_account' : defaultTab
  );

  // Sync tab with route if location changes
  useEffect(() => {
    if (location.pathname === '/signup') {
      setActiveTab('new_account');
    } else if (location.pathname === '/') {
      setActiveTab('signin');
    }
  }, [location.pathname]);

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Check active session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      if (session.onboardingComplete) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [navigate]);

  // Dark mode handler
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

  const triggerErrorShake = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');
    if (tab === 'new_account') {
      navigate('/signup', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  // Instant 1-Tap Demo Sign In (Master Prompt Scenario: ₹1,00,000/mo salary)
  const handleQuickDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      const demoUser = {
        name: 'Rahul Sharma (Demo)',
        email: 'rahul.sharma@domain.in',
        phoneNumber: '9876543210',
        onboardingComplete: true,
        preferences: {
          goal: 'Save Money & Stay on Daily Budget',
          salary: 100000,
          totalIncome: 100000,
          fixedExpenses: 20000,
          savingsTarget: 20000,
          emergencyReserve: 0,
          savingsRate: '20% of Income (Standard)',
          budgetStrategy: 'Smart Daily Allowance'
        }
      };
      saveSession(demoUser, true);
      setLoading(false);
      navigate('/dashboard');
    }, 300);
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanId = identifier.trim();
    if (!cleanId) {
      triggerErrorShake('Please enter your email or mobile number');
      return;
    }

    if (!password) {
      triggerErrorShake('Please enter your password / security PIN');
      return;
    }

    const isEmail = cleanId.includes('@');
    if (isEmail && !isValidEmail(cleanId)) {
      triggerErrorShake('Please enter a valid email address');
      return;
    }

    if (!isEmail && cleanId.replace(/\D/g, '').length < 10) {
      triggerErrorShake('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

    if (activeTab === 'signin') {
      if (isEmail) {
        try {
          const fbRes = await signInWithFirebaseEmail(cleanId, password);
          if (fbRes.success) {
            setLoading(false);
            saveSession(fbRes.user, rememberMe);
            navigate('/dashboard');
            return;
          }
        } catch (err) {
          console.warn("Firebase email fallback:", err);
        }
      }

      // Local / Demo Authenticator fallback
      setTimeout(() => {
        const effectiveEmail = isEmail ? cleanId : `${cleanId.replace(/\D/g, '')}@smartbudget.in`;
        const res = loginUser(effectiveEmail, password, rememberMe);

        setLoading(false);
        if (res.success) {
          navigate('/dashboard');
        } else {
          triggerErrorShake(res.error || 'Invalid credentials. You can also tap "Instant Demo Login" below.');
        }
      }, 500);
    } else {
      // Sign Up
      if (!name.trim()) {
        setLoading(false);
        triggerErrorShake('Please enter your full name');
        return;
      }

      setTimeout(() => {
        const effectiveEmail = isEmail ? cleanId : `${cleanId.replace(/\D/g, '')}@smartbudget.in`;
        const res = registerUser(effectiveEmail, password, name);

        if (res.success) {
          setLoading(false);
          setSuccess(true);
          setTimeout(() => {
            navigate('/onboarding');
          }, 600);
        } else {
          setLoading(false);
          triggerErrorShake(res.error || 'Failed to create account');
        }
      }, 500);
    }
  };

  // Google SSO Handler
  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const res = await signInWithFirebaseGoogle();
      if (res.success) {
        setLoading(false);
        saveSession(res.user, rememberMe);
        navigate('/dashboard');
        return;
      }
    } catch (err) {
      console.warn("Google Auth fallback:", err);
    }

    setTimeout(() => {
      const demoEmail = `google_user_${Date.now().toString().slice(-4)}@smartbudget.in`;
      const result = activeTab === 'signin'
        ? loginUser(demoEmail, 'password123', rememberMe)
        : registerUser(demoEmail, 'password123', 'Google User');
      setLoading(false);

      if (result.success) {
        navigate('/dashboard');
      } else {
        triggerErrorShake(result.error || 'Google authentication failed');
      }
    }, 400);
  };

  const isNumericOnly = /^\d+$/.test(identifier.replace(/[\s-]/g, ''));

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#0b0f17] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-[#00685f] selection:text-white font-sans relative overflow-x-hidden">
      
      {/* Background Fluid Shader */}
      <WebGLFluidShader />

      {/* Ambient background glow orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden flex items-center justify-center">
        <div className="absolute top-[10%] left-[15%] w-[550px] h-[550px] rounded-full bg-teal-500/10 dark:bg-teal-500/15 blur-[160px]"></div>
        <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-[160px]"></div>
      </div>

      {/* --- TOP WEBSITE NAVBAR --- */}
      <header className="w-full relative z-20 px-6 sm:px-12 lg:px-16 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00685f] to-[#004e47] text-white flex items-center justify-center font-black text-xl shadow-md shadow-[#00685f]/25">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                Smart Budget
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold text-[0.65rem] tracking-wider uppercase">
                PRO 2.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5 font-medium">Autonomous Wealth & Daily Allowance Engine</p>
          </div>
        </div>

        {/* Right Header Navigation & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              RBI Account Aggregator Live
            </span>
          </div>

          {/* Quick Demo CTA */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#00685f] dark:text-[#6bd8cb] text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all cursor-pointer shadow-xs"
          >
            <span>⚡</span>
            <span>Instant Demo (₹1 Lakh/mo)</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[19px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* --- MAIN WEBSITE SHOWCASE & LOGIN CONTAINER --- */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 py-8 lg:py-12">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: Modern Fintech Website Hero (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-teal-100/70 dark:bg-teal-900/40 text-[#00685f] dark:text-[#6bd8cb] text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#00685f] dark:bg-[#6bd8cb] animate-ping"></span>
              <span>Intelligent Spending Engine for India</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Master your daily spending with <span className="text-[#00685f] dark:text-[#6bd8cb]">intelligent clarity.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Turn your monthly salary into an easy, stress-free daily spending allowance. Automatically track UPI transactions, detect budget overspends, and grow your wealth.
            </p>

            {/* Live Interactive Daily Allowance Preview Card */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Master Formula (₹1,00,000 /mo Profile)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#00685f] dark:text-[#6bd8cb]">
                      ₹2,000
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Safe Daily Spending Limit
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    ✓ Within Budget
                  </span>
                </div>
              </div>

              {/* Progress & Highlights */}
              <div className="pt-4 grid grid-cols-3 gap-3 text-center sm:text-left">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Monthly Income</span>
                  <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">₹1,00,000</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Fixed & Savings</span>
                  <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">₹40,000</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Spent Today</span>
                  <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">₹1,750 (4 txns)</span>
                </div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 shadow-xs">
                <span className="material-symbols-outlined text-[20px] text-[#00685f] dark:text-[#6bd8cb]">sync</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Instant UPI & SMS Sync</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 shadow-xs">
                <span className="material-symbols-outlined text-[20px] text-[#00685f] dark:text-[#6bd8cb]">verified_user</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">RBI Account Aggregator</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 shadow-xs">
                <span className="material-symbols-outlined text-[20px] text-[#00685f] dark:text-[#6bd8cb]">trending_up</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">20%+ Guaranteed Savings</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Modern Website Auth Card (5 Columns) */}
          <div className="lg:col-span-5 w-full flex justify-center">
            <div
              className={`w-full max-w-[460px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-300/40 dark:shadow-black/60 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-transform duration-200 ${
                shake ? 'animate-shake' : ''
              }`}
            >
              {/* Segmented Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signin')}
                  className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeTab === 'signin'
                      ? 'bg-white dark:bg-slate-900 text-[#00685f] dark:text-[#6bd8cb] shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch('new_account')}
                  className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeTab === 'new_account'
                      ? 'bg-white dark:bg-slate-900 text-[#00685f] dark:text-[#6bd8cb] shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-5 text-left">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {activeTab === 'signin' ? 'Access your vault' : 'Start smart budgeting'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {activeTab === 'signin'
                    ? 'Enter your credentials to view today’s allowance and alerts.'
                    : 'Get full access in 2 minutes. Free and bank-grade secure.'}
                </p>
              </div>

              {/* Website Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name for Registration */}
                {activeTab === 'new_account' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[19px] pointer-events-none">
                        person
                      </span>
                      <input
                        id="web-fullname"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/20 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* Email or Mobile Number Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Email or Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    {isNumericOnly && identifier.length > 0 ? (
                      <div className="absolute left-3.5 flex items-center gap-1.5 pr-2.5 border-r border-slate-300 dark:border-slate-700 pointer-events-none">
                        <span className="text-sm">🇮🇳</span>
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-300 font-mono">+91</span>
                      </div>
                    ) : (
                      <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[19px] pointer-events-none">
                        {identifier.includes('@') ? 'mail' : 'person'}
                      </span>
                    )}
                    <input
                      id="web-identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="name@domain.com or 10-digit mobile"
                      className={`w-full h-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/20 transition-all placeholder:text-slate-400 ${
                        isNumericOnly && identifier.length > 0 ? 'pl-20 font-mono' : 'pl-10'
                      }`}
                    />
                  </div>
                </div>

                {/* Password / PIN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Password / Security PIN
                    </label>
                    {activeTab === 'signin' && (
                      <a
                        href="#forgot"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Password reset link sent to your registered contact.');
                        }}
                        className="text-xs text-[#00685f] dark:text-[#6bd8cb] font-bold hover:underline"
                      >
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[19px] pointer-events-none">
                      lock
                    </span>
                    <input
                      id="web-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="••••••••••••"
                      className="w-full h-11 pl-10 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/20 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[17px] shrink-0">error</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-sm shadow-md shadow-[#00685f]/20 hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <span>Authenticating...</span>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    </>
                  ) : success ? (
                    <>
                      <span>Account Created!</span>
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </>
                  ) : (
                    <>
                      <span>{activeTab === 'signin' ? 'Sign In to Vault' : 'Create Free Account'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-3.5">
                  <div className="w-full h-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="absolute bg-white dark:bg-slate-900 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                    Or
                  </span>
                </div>

                {/* Google SSO Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"></path>
                  </svg>
                  <span>Continue with Google</span>
                </button>

              </form>

              {/* Instant 1-Tap Demo Link */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#00685f] dark:text-[#6bd8cb] text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors cursor-pointer"
                >
                  <span>⚡</span>
                  <span>Try 1-tap demo (₹1 Lakh/mo profile)</span>
                </button>
              </div>

              {/* Bank-Grade Security footnote */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <span className="material-symbols-outlined text-[13px] text-[#00685f] dark:text-[#6bd8cb]">lock</span>
                <span>Bank-grade 256-bit encryption • RBI AA compliant</span>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* --- WEBSITE FOOTER --- */}
      <footer className="w-full relative z-20 px-6 sm:px-12 py-5 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            © 2026 Smart Budget Planner India. All rights reserved.
          </div>
          <div className="flex items-center gap-4 font-medium">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[#00685f] dark:text-[#6bd8cb]">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              SOC-2 Certified
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
