package com.smartbudget.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.smartbudget.app.ui.screens.BudgetsScreen
import com.smartbudget.app.ui.screens.HomeScreen
import com.smartbudget.app.ui.screens.InsightsScreen
import com.smartbudget.app.ui.screens.ProfileScreen
import com.smartbudget.app.ui.screens.TransactionsScreen
import com.smartbudget.app.ui.theme.Emerald500
import com.smartbudget.app.ui.theme.SmartDailyBudgetTheme
import com.smartbudget.app.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SmartDailyBudgetTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainAppScaffold(viewModel = viewModel)
                }
            }
        }
    }
}

enum class NavigationItem(val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    HOME("Home", Icons.Default.Home),
    TRANSACTIONS("Transactions", Icons.Default.ReceiptLong),
    INSIGHTS("Insights", Icons.Default.Insights),
    BUDGETS("Budgets", Icons.Default.AccountBalanceWallet),
    PROFILE("Profile", Icons.Default.Person)
}

@Composable
fun MainAppScaffold(viewModel: MainViewModel) {
    var currentItem by remember { mutableStateOf(NavigationItem.HOME) }
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                NavigationItem.values().forEach { item ->
                    NavigationBarItem(
                        selected = currentItem == item,
                        onClick = { currentItem = item },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) }
                    )
                }
            }
        }
    ) { padding ->
        val modifier = Modifier.padding(padding)
        when (currentItem) {
            NavigationItem.HOME -> HomeScreen(uiState = uiState, viewModel = viewModel, modifier = modifier)
            NavigationItem.TRANSACTIONS -> TransactionsScreen(uiState = uiState, viewModel = viewModel, modifier = modifier)
            NavigationItem.INSIGHTS -> InsightsScreen(uiState = uiState, modifier = modifier)
            NavigationItem.BUDGETS -> BudgetsScreen(uiState = uiState, viewModel = viewModel, modifier = modifier)
            NavigationItem.PROFILE -> ProfileScreen(uiState = uiState, viewModel = viewModel, modifier = modifier)
        }
    }
}
