package com.smartbudget.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = Emerald500,
    secondary = Amber500,
    tertiary = Emerald400,
    background = Slate900,
    surface = Slate800,
    error = RubyRed,
    onPrimary = PureWhite,
    onBackground = Slate100,
    onSurface = Slate100
)

private val LightColorScheme = lightColorScheme(
    primary = Emerald600,
    secondary = Amber500,
    tertiary = Emerald500,
    background = Slate100,
    surface = PureWhite,
    error = RubyRed,
    onPrimary = PureWhite,
    onBackground = Slate900,
    onSurface = Slate900
)

@Composable
fun SmartDailyBudgetTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
