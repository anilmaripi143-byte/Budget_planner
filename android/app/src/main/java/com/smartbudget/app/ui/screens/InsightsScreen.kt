package com.smartbudget.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartbudget.app.ui.theme.Emerald500
import com.smartbudget.app.ui.viewmodel.HomeUiState
import kotlin.math.max
import kotlin.math.roundToInt

@Composable
fun InsightsScreen(
    uiState: HomeUiState,
    modifier: Modifier = Modifier
) {
    val profile = uiState.userProfile
    val allTxs = uiState.allTransactions.filter { it.type == "expense" && it.direction == "debit" }
    val totalSpent = allTxs.sumOf { it.amount }
    val netSavings = max(0.0, profile.monthlyIncome - totalSpent)
    val savingsRate = if (profile.monthlyIncome > 0) ((netSavings / profile.monthlyIncome) * 100).roundToInt() else 0

    // Group expenses by category
    val categoryTotals = allTxs.groupBy { it.category }
        .mapValues { entry -> entry.value.sumOf { it.amount } }
        .toList()
        .sortedByDescending { it.second }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        item {
            Text(
                text = "Financial Insights",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(16.dp))

            // Monthly Summary Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Monthly Take-Home Income: ₹${profile.monthlyIncome.roundToInt()}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Text("Total Spent", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            Text("₹${totalSpent.roundToInt()}", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                        }
                        Column {
                            Text("Projected Savings", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            Text("₹${netSavings.roundToInt()}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Emerald500)
                        }
                        Column {
                            Text("Savings Rate", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            Text("$savingsRate%", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Emerald500)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Spending by Category",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        if (categoryTotals.isEmpty()) {
            item {
                Text(
                    text = "No category data yet. Record transactions to view insights.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    modifier = Modifier.padding(top = 12.dp)
                )
            }
        } else {
            items(categoryTotals.size) { index ->
                val (catName, amount) = categoryTotals[index]
                val fraction = if (totalSpent > 0) (amount / totalSpent).toFloat() else 0f
                val pct = (fraction * 100).roundToInt()

                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(catName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text("₹${amount.roundToInt()} ($pct%)", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { fraction },
                            color = Emerald500,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}
