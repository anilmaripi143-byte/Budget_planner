package com.smartbudget.app.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartbudget.app.ui.theme.Emerald500
import com.smartbudget.app.ui.viewmodel.HomeUiState
import com.smartbudget.app.ui.viewmodel.MainViewModel

@Composable
fun BudgetsScreen(
    uiState: HomeUiState,
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val profile = uiState.userProfile

    var incomeText by remember(profile.monthlyIncome) { mutableStateOf(profile.monthlyIncome.toInt().toString()) }
    var fixedExpensesText by remember(profile.fixedExpenses) { mutableStateOf(profile.fixedExpenses.toInt().toString()) }
    var savingsTargetText by remember(profile.savingsTarget) { mutableStateOf(profile.savingsTarget.toInt().toString()) }
    var emergencyText by remember(profile.emergencyReserve) { mutableStateOf(profile.emergencyReserve.toInt().toString()) }
    var isSmartMode by remember(profile.budgetMode) { mutableStateOf(profile.budgetMode == "smart") }
    var isRollover by remember(profile.rolloverEnabled) { mutableStateOf(profile.rolloverEnabled) }

    var savedMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Budget Controls",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "Configure your monthly salary, savings targets, and daily allowance mode",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(20.dp))

        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                OutlinedTextField(
                    value = incomeText,
                    onValueChange = { incomeText = it },
                    label = { Text("Monthly Take-Home Income (₹)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = fixedExpensesText,
                    onValueChange = { fixedExpensesText = it },
                    label = { Text("Fixed Expenses: Rent, Bills, Subscriptions (₹)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = savingsTargetText,
                    onValueChange = { savingsTargetText = it },
                    label = { Text("Monthly Planned Savings Target (₹)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = emergencyText,
                    onValueChange = { emergencyText = it },
                    label = { Text("Emergency Reserve Target (₹)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Toggles Card
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Smart Daily Allowance", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text("Deducts fixed bills & savings before daily allowance calculation", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = isSmartMode,
                        onCheckedChange = { isSmartMode = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Emerald500)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Rollover Unused Allowance", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text("Adds unspent daily budget to tomorrow's spending allowance", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = isRollover,
                        onCheckedChange = { isRollover = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Emerald500)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = {
                val updated = profile.copy(
                    monthlyIncome = incomeText.toDoubleOrNull() ?: profile.monthlyIncome,
                    fixedExpenses = fixedExpensesText.toDoubleOrNull() ?: profile.fixedExpenses,
                    savingsTarget = savingsTargetText.toDoubleOrNull() ?: profile.savingsTarget,
                    emergencyReserve = emergencyText.toDoubleOrNull() ?: profile.emergencyReserve,
                    budgetMode = if (isSmartMode) "smart" else "simple",
                    rolloverEnabled = isRollover
                )
                viewModel.updateProfile(updated)
                savedMessage = "Budget settings updated successfully!"
            },
            colors = ButtonDefaults.buttonColors(containerColor = Emerald500),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Save Financial Settings", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }

        if (savedMessage != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = savedMessage!!,
                color = Emerald500,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }

        Spacer(modifier = Modifier.height(40.dp))
    }
}
