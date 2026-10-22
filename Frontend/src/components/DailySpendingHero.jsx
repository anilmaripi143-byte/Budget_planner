import React from 'react';

export default function DailySpendingHero({
  dailyBudget = 2000,
  spentToday = 1750,
  remainingToday = 250,
  percentageUsed = 87.5,
  isOverbudget = false,
  warningMessage = "Only ₹250 remains in your daily allowance.",
  greeting = "Good morning!",
  currencySymbol = "₹",
  onSeedDemo,
  onOpenAddExpense
}) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, percentageUsed) / 100) * circumference;

  const ringColor = isOverbudget
    ? '#EF4444' // Ruby Red
    : percentageUsed >= 90
    ? '#EF4444'
    : percentageUsed >= 75
    ? '#F59E0B' // Amber
    : '#10B981'; // Emerald Green

  return (
    <div className="bg-white dark:bg-[#1e2326] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-6">
      
      {/* Top Header Row with Greeting & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#00685f] dark:text-[#6bd8cb] bg-[#e6f7f5] dark:bg-[#005049]/40 px-2.5 py-0.5 rounded-full">
              Live Daily Budget Engine
            </span>
            <span className="text-xs text-gray-400 font-medium">India Edition (₹ INR)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#191c1e] dark:text-white tracking-tight mt-1">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Smart daily spending allowance based on your monthly income & savings target.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onSeedDemo}
            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-200 dark:border-amber-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Seed the exact ₹250 coffee + ₹600 Blinkit + ₹400 Zepto + ₹500 Swiggy scenario"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">auto_fix_high</span>
            <span>Seed Master Prompt Demo</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddExpense}
            className="px-4 py-2 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-xs font-bold shadow-md shadow-[#00685f]/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Warning Banner if >= 75% or Overbudget */}
      {warningMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
          isOverbudget
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
            : percentageUsed >= 75
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
        }`}>
          <span className="material-symbols-outlined text-[22px]">
            {isOverbudget ? 'error' : 'warning'}
          </span>
          <div className="text-xs sm:text-sm font-bold">
            {warningMessage}
          </div>
        </div>
      )}

      {/* Centerpiece: Circular Progress Ring & Numbers Bento */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left: SVG Ring (5 cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
              {/* Background Track */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className="text-gray-100 dark:text-gray-800"
                strokeWidth="18"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress Arc */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke={ringColor}
                strokeWidth="18"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
              />
            </svg>

            {/* Inner Ring Text */}
            <div className="absolute flex flex-col items-center text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {isOverbudget ? 'Over Budget By' : 'Remaining Today'}
              </span>
              <span className={`text-3xl font-black font-mono tracking-tight mt-0.5 ${
                isOverbudget ? 'text-rose-600' : 'text-[#191c1e] dark:text-white'
              }`}>
                {currencySymbol}{Math.abs(remainingToday).toLocaleString()}
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full mt-1.5" style={{ backgroundColor: `${ringColor}20`, color: ringColor }}>
                {percentageUsed}% used
              </span>
            </div>
          </div>
        </div>

        {/* Right: Metrics Bento Cards (7 cols) */}
        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Today's Budget
            </span>
            <div className="text-2xl font-black font-mono text-[#191c1e] dark:text-white">
              {currencySymbol}{dailyBudget.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-400 block">
              Based on monthly allowance
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Spent Today
            </span>
            <div className="text-2xl font-black font-mono text-rose-600">
              {currencySymbol}{spentToday.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-400 block">
              Eligible expenses only
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#f4fffc] dark:bg-[#005049]/20 border border-[#00685f]/20 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00685f] dark:text-[#6bd8cb] block">
              Remaining
            </span>
            <div className={`text-2xl font-black font-mono ${
              isOverbudget ? 'text-rose-600' : 'text-[#00685f] dark:text-[#6bd8cb]'
            }`}>
              {currencySymbol}{remainingToday.toLocaleString()}
            </div>
            <span className="text-[10px] text-[#00685f]/80 dark:text-[#6bd8cb]/80 block">
              {isOverbudget ? 'Caution: Exceeded' : 'Safe to spend'}
            </span>
          </div>

          {/* Master Prompt Math Demonstration Banner */}
          <div className="sm:col-span-3 p-3.5 rounded-2xl bg-[#f8faf9] dark:bg-gray-800/40 border border-dashed border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00685f]">verified</span>
                <span>Active Spending Formula:</span>
              </span>
              <span className="font-mono text-[11px] text-[#00685f] dark:text-[#6bd8cb]">
                ₹1,00,000 (Income) - ₹20,000 (Savings) - ₹20,000 (Fixed) = ₹60,000 / 30 Days = ₹2,000/day
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
