package com.smartbudget.app.domain

import com.smartbudget.app.data.local.entity.TransactionEntity
import java.util.Calendar
import kotlin.math.max
import kotlin.math.roundToInt

data class DailyCalculationResult(
    val startingDailyAllowance: Double,
    val spentToday: Double,
    val refundsToday: Double,
    val netSpentToday: Double,
    val remainingAllowance: Double,
    val percentageConsumed: Double,
    val isOverbudget: Boolean,
    val overspentAmount: Double,
    val warningLevel: String, // "normal", "50_percent", "75_percent", "90_percent", "exceeded"
    val warningMessage: String?,
    val morningNotificationPreview: String,
    val eveningSummaryPreview: String
)

object BudgetEngine {

    fun getDaysInCurrentMonth(): Int {
        val calendar = Calendar.getInstance()
        return calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
    }

    fun calculateStartingAllowance(
        monthlyIncome: Double,
        fixedExpenses: Double,
        savingsTarget: Double,
        emergencyReserve: Double,
        budgetMode: String = "smart",
        calculationPeriod: String = "rolling_30"
    ): Pair<Double, Int> {
        val daysInPeriod = if (calculationPeriod == "rolling_30") 30 else getDaysInCurrentMonth()
        val flexibleBudget = if (budgetMode == "simple") {
            max(0.0, monthlyIncome)
        } else {
            max(0.0, monthlyIncome - fixedExpenses - savingsTarget - emergencyReserve)
        }
        val dailyAllowance = if (daysInPeriod > 0) flexibleBudget / daysInPeriod else 0.0
        return Pair(Math.round(dailyAllowance * 100.0) / 100.0, daysInPeriod)
    }

    fun computeDailyBudget(
        dailyAllowance: Double,
        transactionsToday: List<TransactionEntity>
    ): DailyCalculationResult {
        var spentToday = 0.0
        var refundsToday = 0.0

        for (tx in transactionsToday) {
            if (tx.isPending) continue
            if (tx.type == "transfer") continue
            if (tx.type == "income" || (tx.direction == "credit" && tx.type != "refund")) continue

            if (tx.type == "refund" || (tx.direction == "credit" && tx.title.contains("refund", ignoreCase = true))) {
                refundsToday += tx.amount
            } else if (tx.direction == "debit" && tx.type == "expense") {
                spentToday += tx.amount
            }
        }

        val netSpent = max(0.0, spentToday - refundsToday)
        val remaining = dailyAllowance - netSpent
        val percentage = if (dailyAllowance > 0) {
            Math.round((netSpent / dailyAllowance) * 1000.0) / 10.0
        } else {
            if (netSpent > 0) 100.0 else 0.0
        }

        val isOverbudget = netSpent > dailyAllowance
        val overspent = max(0.0, netSpent - dailyAllowance)

        var warningLevel = "normal"
        var warningMsg: String? = null

        if (isOverbudget) {
            warningLevel = "exceeded"
            warningMsg = "You've exceeded today's budget by ₹${overspent.roundToInt()}."
        } else if (percentage >= 90.0) {
            warningLevel = "90_percent"
            warningMsg = "Warning: 90% of today's budget used. Only ₹${max(0.0, remaining).roundToInt()} left!"
        } else if (percentage >= 75.0) {
            warningLevel = "75_percent"
            warningMsg = "Only ₹${max(0.0, remaining).roundToInt()} remains in your daily allowance."
        } else if (percentage >= 50.0) {
            warningLevel = "50_percent"
            warningMsg = "You've used 50% of today's budget."
        }

        val morningPreview = "Good morning! Your spending allowance for today is ₹${dailyAllowance.roundToInt()}. Let's make it count."
        val eveningPreview = if (isOverbudget) {
            "You spent ₹${netSpent.roundToInt()} today against a ₹${dailyAllowance.roundToInt()} budget. You're ₹${overspent.roundToInt()} over budget."
        } else {
            "You spent ₹${netSpent.roundToInt()} today. You saved ₹${remaining.roundToInt()} of your daily allowance!"
        }

        return DailyCalculationResult(
            startingDailyAllowance = dailyAllowance,
            spentToday = spentToday,
            refundsToday = refundsToday,
            netSpentToday = netSpent,
            remainingAllowance = remaining,
            percentageConsumed = percentage,
            isOverbudget = isOverbudget,
            overspentAmount = overspent,
            warningLevel = warningLevel,
            warningMessage = warningMsg,
            morningNotificationPreview = morningPreview,
            eveningSummaryPreview = eveningPreview
        )
    }
}
