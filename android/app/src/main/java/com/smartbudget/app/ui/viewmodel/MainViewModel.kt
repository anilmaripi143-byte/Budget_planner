package com.smartbudget.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartbudget.app.SmartBudgetApplication
import com.smartbudget.app.data.local.entity.TransactionEntity
import com.smartbudget.app.data.local.entity.UserProfileEntity
import com.smartbudget.app.domain.BudgetEngine
import com.smartbudget.app.domain.DailyCalculationResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.Calendar

data class HomeUiState(
    val greeting: String = "Good morning!",
    val userProfile: UserProfileEntity = UserProfileEntity(),
    val dailySummary: DailyCalculationResult? = null,
    val recentTransactions: List<TransactionEntity> = emptyList(),
    val allTransactions: List<TransactionEntity> = emptyList(),
    val isLoading: Boolean = false
)

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val db = (application as SmartBudgetApplication).database
    private val txDao = db.transactionDao()
    private val profileDao = db.userProfileDao()

    private val _greeting = MutableStateFlow(determineGreeting())
    val greeting: StateFlow<String> = _greeting

    val uiState: StateFlow<HomeUiState> = combine(
        profileDao.getUserProfile(),
        txDao.getAllTransactions()
    ) { profile, transactions ->
        val safeProfile = profile ?: UserProfileEntity()

        val (dailyAllowance, _) = BudgetEngine.calculateStartingAllowance(
            monthlyIncome = safeProfile.monthlyIncome,
            fixedExpenses = safeProfile.fixedExpenses,
            savingsTarget = safeProfile.savingsTarget,
            emergencyReserve = safeProfile.emergencyReserve,
            budgetMode = safeProfile.budgetMode,
            calculationPeriod = safeProfile.calculationPeriod
        )

        // Filter transactions for today
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startOfDay = cal.timeInMillis

        val todayTxs = transactions.filter { it.transactionDate >= startOfDay }
        val dailySummary = BudgetEngine.computeDailyBudget(dailyAllowance, todayTxs)

        HomeUiState(
            greeting = determineGreeting(),
            userProfile = safeProfile,
            dailySummary = dailySummary,
            recentTransactions = transactions.take(10),
            allTransactions = transactions,
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HomeUiState(isLoading = true)
    )

    fun addTransaction(transaction: TransactionEntity) {
        viewModelScope.launch {
            txDao.insertTransaction(transaction)
        }
    }

    fun deleteTransaction(transaction: TransactionEntity) {
        viewModelScope.launch {
            txDao.deleteTransaction(transaction)
        }
    }

    fun updateProfile(profile: UserProfileEntity) {
        viewModelScope.launch {
            profileDao.insertOrUpdate(profile)
        }
    }

    fun seedMasterPromptDemo() {
        viewModelScope.launch {
            // 1. Set User Profile
            val demoProfile = UserProfileEntity(
                userId = "master_prompt_user",
                fullName = "Anil Kumar",
                monthlyIncome = 100000.0,
                fixedExpenses = 20000.0,
                savingsTarget = 20000.0,
                emergencyReserve = 0.0,
                budgetMode = "smart",
                calculationPeriod = "rolling_30"
            )
            profileDao.insertOrUpdate(demoProfile)

            // 2. Clear old demo and insert exact master prompt test expenses
            txDao.clearDemoTransactions()

            val now = System.currentTimeMillis()
            val demoTxs = listOf(
                TransactionEntity(amount = 250.0, direction = "debit", type = "expense", title = "Coffee", merchant = "Starbucks", category = "Food & Dining", transactionDate = now, paymentMethod = "UPI", dataSource = "demo"),
                TransactionEntity(amount = 600.0, direction = "debit", type = "expense", title = "Blinkit Groceries", merchant = "Blinkit", category = "Groceries", transactionDate = now, paymentMethod = "UPI", dataSource = "demo"),
                TransactionEntity(amount = 400.0, direction = "debit", type = "expense", title = "Zepto Snacks", merchant = "Zepto", category = "Groceries", transactionDate = now, paymentMethod = "UPI", dataSource = "demo"),
                TransactionEntity(amount = 500.0, direction = "debit", type = "expense", title = "Swiggy Dinner", merchant = "Swiggy", category = "Food & Dining", transactionDate = now, paymentMethod = "UPI", dataSource = "demo")
            )
            txDao.insertAll(demoTxs)
        }
    }

    private fun determineGreeting(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 4..11 -> "Good morning!"
            in 12..16 -> "Good afternoon!"
            in 17..21 -> "Good evening!"
            else -> "Good night!"
        }
    }
}
