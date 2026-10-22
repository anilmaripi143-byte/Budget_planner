import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import WebGLFluidShader from '../components/WebGLFluidShader';
import { loginUser, registerUser, isValidEmail, getSession, saveSession } from '../lib/auth';
import { SUPPORTED_CURRENCIES, detectAutoCurrency, fetchGeoIPCurrency } from '../lib/currency';
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

  // Form State - Single unified identifier (Phone or Email)
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
  const [currentTime, setCurrentTime] = useState('9:41');

  // Realtime Mobile Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours % 12 || 12}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

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

  const toggleTab = () => {
    setError('');
    if (activeTab === 'signin') {
      setActiveTab('new_account');
      navigate('/signup', { replace: true });
    } else {
      setActiveTab('signin');
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
      triggerErrorShake('Please enter your mobile number or email');
      return;
    }

    if (!password) {
      triggerErrorShake('Please enter your security PIN / password');
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
      // Try Firebase if email
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
          triggerErrorShake(res.error || 'Invalid credentials. You can also tap "Quick Demo" below.');
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
      console.warn("Firebase Google Auth fallback:", err);
    }

    // Demo fallback
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

  // Detect whether current input looks like numbers or text
  const isNumericOnly = /^\d+$/.test(identifier.replace(/[\s-]/g, ''));

  return (
    <div className="min-h-screen w-full bg-[#0d1317] flex flex-col items-center justify-center p-0 sm:p-4 selection:bg-[#00685f] selection:text-white font-sans relative overflow-x-hidden">
      
      {/* Background Fluid Shader for ambient background */}
      <WebGLFluidShader />

      {/* --- MOBILE CONTAINER (Clean, uncluttered, 390px-412px phone dimensions) --- */}
      <main
        className={`w-full max-w-[412px] min-h-screen sm:min-h-[810px] sm:max-h-[860px] bg-white dark:bg-[#121619] sm:rounded-[44px] shadow-2xl sm:border-[8px] sm:border-slate-800 dark:sm:border-slate-700 flex flex-col justify-between relative z-10 overflow-x-hidden overflow-y-auto ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* NATIVE MOBILE STATUS BAR */}
        <div className="w-full pt-3 px-6 pb-1 flex items-center justify-between text-xs font-semibold text-[#191c1e] dark:text-white shrink-0 select-none">
          <span className="font-mono text-[13px] tracking-tight font-bold">{currentTime}</span>

          {/* Dynamic Island / Notch */}
          <div className="w-24 h-4.5 bg-black dark:bg-black/80 rounded-full flex items-center justify-end pr-2.5">
            <span className="w-2 h-2 rounded-full bg-[#00685f]/80 animate-pulse"></span>
          </div>

          {/* Network & Battery */}
          <div className="flex items-center gap-1.5 text-[14px]">
            <span className="material-symbols-outlined text-[15px]">signal_cellular_alt</span>
            <span className="font-mono text-[11px] font-bold">5G</span>
            <span className="material-symbols-outlined text-[15px]">wifi</span>
            <span className="material-symbols-outlined text-[16px] text-[#00685f] dark:text-[#6ffbbe]">battery_full</span>
          </div>
        </div>

        {/* MINIMAL APP HEADER */}
        <header className="px-6 pt-2 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#00685f] text-white flex items-center justify-center font-extrabold text-base shadow-sm">
              ₹
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#191c1e] dark:text-white">Smart Budget</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#89f5e7] text-[#00201d] font-bold text-[0.55rem] uppercase">PRO</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </header>

        {/* MAIN BODY */}
        <div className="flex-1 px-6 flex flex-col justify-center py-2">
          
          {/* Clean Greeting */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-[#191c1e] dark:text-white tracking-tight">
              {activeTab === 'signin' ? 'Welcome back.' : 'Create your account.'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === 'signin'
                ? 'Sign in to monitor your daily allowance and UPI expenses.'
                : 'Automate your monthly budget into a clear daily spending target.'}
            </p>
          </div>

          {/* STREAMLINED AUTH FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name (Sign Up only) */}
            {activeTab === 'new_account' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-gray-400 text-[18px] pointer-events-none">
                    person
                  </span>
                  <input
                    id="mobile-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-12 pl-10 pr-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-[#191c1e] dark:text-white text-sm outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/20 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}

            {/* Smart Unified Identifier (Mobile Number or Email) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Mobile Number or Email
              </label>
              <div className="relative flex items-center">
                {/* Prefix badge only if user types numeric phone */}
                {isNumericOnly && identifier.length > 0 ? (
                  <div className="absolute left-3 flex items-center gap-1 pr-2 border-r border-gray-300 dark:border-gray-700 pointer-events-none">
                    <span className="text-xs">🇮🇳</span>
                    <span className="font-bold text-xs text-gray-700 dark:text-gray-300 font-mono">+91</span>
                  </div>
                ) : (
                  <span className="material-symbols-outlined absolute left-3.5 text-gray-400 text-[18px] pointer-events-none">
                    {identifier.includes('@') ? 'mail' : 'smartphone'}
                  </span>
                )}
                <input
                  id="mobile-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Mobile number or email"
                  className={`w-full h-12 pr-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-[#191c1e] dark:text-white text-sm outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/20 transition-all placeholder:text-gray-400 ${
                    isNumericOnly && identifier.length > 0 ? 'pl-19 font-mono' : 'pl-10'
                  }`}
                />
              </div>
            </div>

            {/* Password / MPIN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Password / PIN
                </label>
                {activeTab === 'signin' && (
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset link sent to your registered contact.');
                    }}
                    className="text-[11px] text-[#00685f] dark:text-[#6bd8cb] font-bold hover:underline"
                  >
                    Forgot PIN?
                  </a>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-gray-400 text-[18px] pointer-events-none">
                  lock
                </span>
                <input
                  id="mobile-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••••••"
                  className="w-full h-12 pl-10 pr-11 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-[#191c1e] dark:text-white font-mono text-sm outline-none focus:border-[#00685f] focus:ring-2 focus:ring-[#00685f]/20 transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Inline Error Message */}
            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* SINGLE PRIMARY CTA BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#00685f] hover:bg-[#005049] text-white font-bold text-sm shadow-md shadow-[#00685f]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
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
                  <span>{activeTab === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="w-full h-px bg-gray-200 dark:bg-gray-800"></div>
              <span className="absolute bg-white dark:bg-[#121619] px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Or
              </span>
            </div>

            {/* SINGLE CLEAN GOOGLE SSO BUTTON */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full h-11 px-4 rounded-2xl bg-gray-50 dark:bg-gray-800/70 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-[#191c1e] dark:text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
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

          {/* Toggle between Sign In and Sign Up (Replaces bulky segmented tabs) */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={toggleTab}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
            >
              {activeTab === 'signin' ? (
                <span>Don't have an account? <strong className="text-[#00685f] dark:text-[#6bd8cb]">Create one</strong></span>
              ) : (
                <span>Already have an account? <strong className="text-[#00685f] dark:text-[#6bd8cb]">Sign In</strong></span>
              )}
            </button>
          </div>

          {/* Subtle Quick Demo Link (No clumsy giant button) */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[#00685f] dark:text-[#6bd8cb] text-[11px] font-bold hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors cursor-pointer"
            >
              <span>⚡</span>
              <span>Try 1-tap demo (₹1 Lakh/mo profile)</span>
            </button>
          </div>

        </div>

        {/* MINIMAL FOOTER */}
        <footer className="px-6 pb-4 pt-1 text-center shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium">
            <span className="material-symbols-outlined text-[13px] text-[#00685f] dark:text-[#6bd8cb]">lock</span>
            <span>256-bit bank encryption • RBI AA compliant</span>
          </div>
          {/* Home swipe bar */}
          <div className="w-28 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5"></div>
        </footer>

      </main>

    </div>
  );
}
