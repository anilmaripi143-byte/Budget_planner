package com.smartbudget.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartbudget.app.ui.components.AddExpenseDialog
import com.smartbudget.app.ui.components.DailyBudgetRing
import com.smartbudget.app.ui.components.TransactionItemCard
import com.smartbudget.app.ui.theme.Amber500
import com.smartbudget.app.ui.theme.Emerald500
import com.smartbudget.app.ui.theme.RubyRed
import com.smartbudget.app.ui.viewmodel.HomeUiState
import com.smartbudget.app.ui.viewmodel.MainViewModel
import kotlin.math.roundToInt

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    var showAddDialog by remember { mutableStateOf(false) }

    val summary = uiState.dailySummary

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddDialog = true },
                icon = { Icon(Icons.Default.Add, contentDescription = "Add") },
                text = { Text("Add Expense") },
                containerColor = Emerald500,
                contentColor = Color.White
            )
        },
        modifier = modifier.fillMaxSize()
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            // Header: Greeting & Profile
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column {
                        Text(
                            text = uiState.greeting,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Daily Spending Allowance",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }

                    Button(
                        onClick = { viewModel.seedMasterPromptDemo() },
                        colors = ButtonDefaults.buttonColors(containerColor = Emerald500.copy(alpha = 0.15f)),
                        contentPadding = ButtonDefaults.TextButtonContentPadding
                    ) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = "Test Demo",
                            tint = Emerald500
                        )
                        Spacer(modifier = Modifier.padding(2.dp))
                        Text("Seed Demo", color = Emerald500, fontSize = 12.sp)
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
            }

            // Warning Alert Banner (if applicable)
            if (summary != null && summary.warningMessage != null) {
                item {
                    val bannerColor = if (summary.isOverbudget) RubyRed else Amber500
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = bannerColor.copy(alpha = 0.12f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(12.dp)
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = bannerColor)
                            Spacer(modifier = Modifier.padding(4.dp))
                            Text(
                                text = summary.warningMessage,
                                color = bannerColor,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }

            // Circular Allowance Ring
            item {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (summary != null) {
                        DailyBudgetRing(
                            startingAllowance = summary.startingDailyAllowance,
                            remainingAllowance = summary.remainingAllowance,
                            percentageConsumed = summary.percentageConsumed,
                            isOverbudget = summary.isOverbudget
                        )
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))
            }

            // Key Stats Card
            item {
                if (summary != null) {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceAround,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Starting Budget", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text("₹${summary.startingDailyAllowance.roundToInt()}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Spent Today", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text("₹${summary.netSpentToday.roundToInt()}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Remaining", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text(
                                    "₹${summary.remainingAllowance.roundToInt()}",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (summary.isOverbudget) RubyRed else Emerald500
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
            }

            // Recent Transactions Section
            item {
                Text(
                    text = "Recent Transactions",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            if (uiState.recentTransactions.isEmpty()) {
                item {
                    Text(
                        text = "No expenses recorded today. Tap Add Expense or Seed Demo!",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        modifier = Modifier.padding(vertical = 12.dp)
                    )
                }
            } else {
                items(uiState.recentTransactions) { tx ->
                    TransactionItemCard(transaction = tx)
                }
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }

    if (showAddDialog) {
        AddExpenseDialog(
            onDismiss = { showAddDialog = false },
            onConfirm = { tx ->
                viewModel.addTransaction(tx)
                showAddDialog = false
            }
        )
    }
}
