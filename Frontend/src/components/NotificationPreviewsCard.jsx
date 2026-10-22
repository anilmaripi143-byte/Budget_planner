import React from 'react';

export default function NotificationPreviewsCard({
  dailyBudget = 2000,
  spentToday = 1750,
  remainingToday = 250,
  isOverbudget = false,
  currencySymbol = '₹'
}) {
  const morningText = `Good morning! Your spending allowance for today is ${currencySymbol}${dailyBudget.toLocaleString()}. Let's make it count.`;
  const middayText = `You've spent ${currencySymbol}${spentToday.toLocaleString()} today. Only ${currencySymbol}${Math.max(0, remainingToday).toLocaleString()} remains in your allowance.`;
  const eveningText = isOverbudget
    ? `You spent ${currencySymbol}${spentToday.toLocaleString()} today against a ${currencySymbol}${dailyBudget.toLocaleString()} budget. You're ${currencySymbol}${Math.abs(remainingToday).toLocaleString()} over budget.`
    : `You spent ${currencySymbol}${spentToday.toLocaleString()} today against a ${currencySymbol}${dailyBudget.toLocaleString()} budget. You saved ${currencySymbol}${remainingToday.toLocaleString()} of your allowance!`;

  return (
    <div className="bg-white dark:bg-[#1e2326] rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#191c1e] dark:text-white">
              Daily Notification Schedule
            </h3>
            <p className="text-[11px] text-gray-400">
              Automated push reminders dispatched to your device throughout the day.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
          WorkManager Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* Morning Notification Card */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span>🌅</span> Morning Brief (08:00 AM)
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-snug">
            "{morningText}"
          </p>
        </div>

        {/* Midday Warning Card */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>☀️</span> Midday Alert (02:00 PM)
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-snug">
            "{middayText}"
          </p>
        </div>

        {/* Evening Summary Card */}
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <span>🌙</span> Evening Wrap (09:00 PM)
            </span>
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          </div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-snug">
            "{eveningText}"
          </p>
        </div>

      </div>
    </div>
  );
}
