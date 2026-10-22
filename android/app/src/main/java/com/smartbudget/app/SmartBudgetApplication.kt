package com.smartbudget.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.smartbudget.app.data.local.AppDatabase
import com.smartbudget.app.worker.EveningSummaryWorker
import com.smartbudget.app.worker.MorningAllowanceWorker
import java.util.concurrent.TimeUnit

class SmartBudgetApplication : Application() {

    val database: AppDatabase by lazy { AppDatabase.getDatabase(this) }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        scheduleBudgetWorkers()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_DAILY_BUDGET,
                "Daily Budget Updates & Warnings",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Morning spending allowance, midday warnings, and evening summaries"
                enableVibration(true)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun scheduleBudgetWorkers() {
        val workManager = WorkManager.getInstance(this)

        // Morning Allowance Reminder (runs daily)
        val morningRequest = PeriodicWorkRequestBuilder<MorningAllowanceWorker>(24, TimeUnit.HOURS)
            .build()
        workManager.enqueueUniquePeriodicWork(
            "morning_budget_allowance",
            ExistingPeriodicWorkPolicy.KEEP,
            morningRequest
        )

        // Evening Summary (runs daily)
        val eveningRequest = PeriodicWorkRequestBuilder<EveningSummaryWorker>(24, TimeUnit.HOURS)
            .build()
        workManager.enqueueUniquePeriodicWork(
            "evening_budget_summary",
            ExistingPeriodicWorkPolicy.KEEP,
            eveningRequest
        )
    }

    companion object {
        const val CHANNEL_DAILY_BUDGET = "daily_budget_channel"
    }
}
