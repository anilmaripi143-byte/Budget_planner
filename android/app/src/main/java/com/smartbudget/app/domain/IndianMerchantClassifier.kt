package com.smartbudget.app.domain

object IndianMerchantClassifier {

    private val merchantMap = mapOf(
        "Groceries" to listOf("blinkit", "zepto", "instamart", "bigbasket", "dmart", "milkbasket", "supermarket", "provision"),
        "Food & Dining" to listOf("swiggy", "zomato", "starbucks", "chai point", "mcdonald", "kfc", "domino", "burger king", "cafe"),
        "Transport" to listOf("uber", "ola", "rapido", "namma yatri", "irctc", "makemytrip", "shell", "indian oil", "fuel", "petrol"),
        "Shopping" to listOf("amazon", "flipkart", "myntra", "nykaa", "ajio", "zara", "croma", "reliance"),
        "Bills & Utilities" to listOf("bescom", "tata power", "jio", "airtel", "vodafone", "vi", "electricity", "broadband", "recharge"),
        "Entertainment" to listOf("netflix", "spotify", "bookmyshow", "hotstar", "pvr", "inox", "youtube"),
        "Health" to listOf("apollo pharmacy", "netmeds", "1mg", "medplus", "cult.fit", "hospital")
    )

    fun classify(merchantName: String): Pair<String, String> {
        val lower = merchantName.lowercase().trim()
        for ((category, keywords) in merchantMap) {
            for (kw in keywords) {
                if (lower.contains(kw)) {
                    return Pair(category, "confirmed")
                }
            }
        }
        return Pair("General", "needs_review")
    }
}
