package com.smartbudget.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "user_profile")
data class UserProfileEntity(
    @PrimaryKey
    val userId: String = "local_user_1",
    val fullName: String = "Anil Kumar",
    val email: String = "user@example.com",
    val monthlyIncome: Double = 100000.0,
    val fixedExpenses: Double = 20000.0,
    val savingsTarget: Double = 20000.0,
    val emergencyReserve: Double = 0.0,
    val budgetMode: String = "smart", // "smart" or "simple"
    val calculationPeriod: String = "rolling_30", // "month_calendar" or "rolling_30"
    val rolloverEnabled: Boolean = false,
    val warningThresholds: String = "50,75,90,100",
    val currency: String = "INR"
)
