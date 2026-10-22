package com.smartbudget.app.worker

import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.smartbudget.app.SmartBudgetApplication
import com.smartbudget.app.domain.BudgetEngine
import java.util.Calendar
import kotlin.math.roundToInt

class EveningSummaryWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val app = applicationContext as SmartBudgetApplication
            val userProfile = app.database.userProfileDao().getUserProfileSync()

            val income = userProfile?.monthlyIncome ?: 100000.0
            val fixed = userProfile?.fixedExpenses ?: 20000.0
            val savings = userProfile?.savingsTarget ?: 20000.0
            val emergency = userProfile?.emergencyReserve ?: 0.0

            val (dailyAllowance, _) = BudgetEngine.calculateStartingAllowance(
                monthlyIncome = income,
                fixedExpenses = fixed,
                savingsTarget = savings,
                emergencyReserve = emergency,
                budgetMode = userProfile?.budgetMode ?: "smart",
                calculationPeriod = userProfile?.calculationPeriod ?: "rolling_30"
            )

            // Start of today
            val cal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val startOfDay = cal.timeInMillis
            val endOfDay = System.currentTimeMillis()

            val txsToday = app.database.transactionDao().getTransactionsBetweenSync(startOfDay, endOfDay)
            val summary = BudgetEngine.computeDailyBudget(dailyAllowance, txsToday)

            val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val title = if (summary.isOverbudget) "Daily Budget Exceeded" else "Daily Spending Summary"
            val body = summary.eveningSummaryPreview

            val notification = NotificationCompat.Builder(applicationContext, SmartBudgetApplication.CHANNEL_DAILY_BUDGET)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()

            notificationManager.notify(1002, notification)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
