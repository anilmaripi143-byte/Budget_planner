package com.smartbudget.app.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.smartbudget.app.SmartBudgetApplication
import com.smartbudget.app.data.local.entity.TransactionEntity
import com.smartbudget.app.domain.IndianMerchantClassifier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.util.regex.Pattern

class UpiNotificationListenerService : NotificationListenerService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Known financial & UPI packages in India
    private val allowedPackages = setOf(
        "com.google.android.apps.nbu.paisa.user", // Google Pay
        "com.phonepe.app",                       // PhonePe
        "net.one97.paytm",                        // Paytm
        "com.dreamplug.androidapp",               // CRED
        "in.org.npci.upiapp",                     // BHIM
        "com.snapwork.hdfc",                      // HDFC Bank
        "com.csam.icici.bank.imobile",            // ICICI Bank
        "com.sbi.lotusintouch",                   // SBI Yono
        "com.axis.mobile"                         // Axis Mobile
    )

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val pkgName = sbn.packageName
        if (!allowedPackages.contains(pkgName)) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val fullContent = "$title $text"

        // Filter out non-financial or OTP messages
        if (isOtpOrNoise(fullContent)) return

        // Extract amount and details
        val parsed = parseNotificationContent(fullContent) ?: return

        serviceScope.launch {
            try {
                val db = (applicationContext as SmartBudgetApplication).database
                val dao = db.transactionDao()

                // Deduplication: check if exact amount within last 2 minutes exists
                val twoMinutesAgo = System.currentTimeMillis() - (2 * 60 * 1000)
                val dup = dao.findRecentDuplicate(parsed.amount, parsed.direction, twoMinutesAgo)
                if (dup != null) {
                    Log.d("UpiNotification", "Ignored duplicate transaction: ${parsed.amount}")
                    return@launch
                }

                // Categorize merchant
                val (category, status) = IndianMerchantClassifier.classify(parsed.merchant)

                val entity = TransactionEntity(
                    amount = parsed.amount,
                    direction = parsed.direction,
                    type = parsed.type,
                    title = parsed.merchant,
                    merchant = parsed.merchant,
                    category = category,
                    transactionDate = System.currentTimeMillis(),
                    paymentMethod = "UPI",
                    dataSource = "notification",
                    status = status,
                    deduplicationHash = parsed.dedupHash
                )

                dao.insertTransaction(entity)
                Log.d("UpiNotification", "Captured transaction: ₹${parsed.amount} at ${parsed.merchant}")
            } catch (e: Exception) {
                Log.e("UpiNotification", "Error saving transaction", e)
            }
        }
    }

    private fun isOtpOrNoise(text: String): Boolean {
        val lower = text.lowercase()
        return lower.contains("otp") ||
                lower.contains("verification code") ||
                lower.contains("pre-approved") ||
                lower.contains("loan") ||
                lower.contains("credit limit")
    }

    private data class ParsedData(
        val amount: Double,
        val merchant: String,
        val direction: String,
        val type: String,
        val dedupHash: String
    )

    private fun parseNotificationContent(text: String): ParsedData? {
        // Regex for ₹ or Rs. amount
        val amountPattern = Pattern.compile("(?:Rs\\.?|INR|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE)
        val matcher = amountPattern.matcher(text)
        if (!matcher.find()) return null

        val amtStr = matcher.group(1)?.replace(",", "") ?: return null
        val amount = amtStr.toDoubleOrNull() ?: return null
        if (amount <= 0) return null

        val isDebit = text.contains("debited", ignoreCase = true) ||
                text.contains("spent", ignoreCase = true) ||
                text.contains("paid", ignoreCase = true) ||
                text.contains("sent", ignoreCase = true)

        val direction = if (isDebit) "debit" else "credit"
        val type = if (isDebit) "expense" else "income"

        // Extract merchant name following 'to', 'at', or 'towards'
        val merchantPattern = Pattern.compile("(?:to|at|towards)\\s+([A-Za-z0-9\\s&'-]+?)(?=\\s+(?:on|via|ref|bal|\\.|,|$))", Pattern.CASE_INSENSITIVE)
        val mMatcher = merchantPattern.matcher(text)
        val rawMerchant = if (mMatcher.find()) {
            mMatcher.group(1)?.trim() ?: "UPI Merchant"
        } else {
            "UPI Merchant"
        }

        val dedupRaw = "${amount}_${rawMerchant.lowercase()}_$direction"
        val hash = MessageDigest.getInstance("SHA-256")
            .digest(dedupRaw.toByteArray())
            .joinToString("") { "%02x".format(it) }
            .take(16)

        return ParsedData(
            amount = amount,
            merchant = rawMerchant,
            direction = direction,
            type = type,
            dedupHash = hash
        )
    }
}
