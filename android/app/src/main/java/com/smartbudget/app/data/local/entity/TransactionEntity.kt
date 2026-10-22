package com.smartbudget.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(
    tableName = "transactions",
    indices = [
        Index(value = ["deduplicationHash"], unique = false),
        Index(value = ["transactionDate"])
    ]
)
data class TransactionEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val amount: Double,
    val direction: String = "debit", // "debit" or "credit"
    val type: String = "expense",     // "expense", "income", "transfer", "refund"
    val title: String,
    val merchant: String,
    val category: String = "General",
    val transactionDate: Long = System.currentTimeMillis(),
    val paymentMethod: String = "UPI",
    val accountLast4: String = "",
    val dataSource: String = "manual", // "manual", "notification", "csv", "demo"
    val status: String = "confirmed",   // "confirmed", "needs_review"
    val isPending: Boolean = false,
    val deduplicationHash: String? = null,
    val notes: String? = null
)
