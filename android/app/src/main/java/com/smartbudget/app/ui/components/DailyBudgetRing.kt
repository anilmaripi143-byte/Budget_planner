package com.smartbudget.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartbudget.app.ui.theme.Amber500
import com.smartbudget.app.ui.theme.Emerald500
import com.smartbudget.app.ui.theme.RubyRed
import com.smartbudget.app.ui.theme.Slate700
import kotlin.math.min
import kotlin.math.roundToInt

@Composable
fun DailyBudgetRing(
    startingAllowance: Double,
    remainingAllowance: Double,
    percentageConsumed: Double,
    isOverbudget: Boolean,
    modifier: Modifier = Modifier
) {
    val sweepAngle = min(360f, ((percentageConsumed.toFloat() / 100f) * 360f))
    val animatedSweep by animateFloatAsState(
        targetValue = sweepAngle,
        animationSpec = tween(durationMillis = 800),
        label = "budget_progress"
    )

    val progressColor = when {
        isOverbudget -> RubyRed
        percentageConsumed >= 90.0 -> RubyRed
        percentageConsumed >= 75.0 -> Amber500
        else -> Emerald500
    }

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(240.dp)
    ) {
        Canvas(modifier = Modifier.size(220.dp)) {
            // Background track
            drawArc(
                color = Slate700.copy(alpha = 0.4f),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(width = 18.dp.toPx(), cap = StrokeCap.Round)
            )

            // Dynamic Progress arc
            drawArc(
                color = progressColor,
                startAngle = -90f,
                sweepAngle = animatedSweep,
                useCenter = false,
                style = Stroke(width = 18.dp.toPx(), cap = StrokeCap.Round)
            )
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = if (isOverbudget) "Over Budget" else "Remaining",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "₹${Math.abs(remainingAllowance).roundToInt()}",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = if (isOverbudget) RubyRed else MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${percentageConsumed.roundToInt()}% of ₹${startingAllowance.roundToInt()}",
                style = MaterialTheme.typography.labelMedium,
                color = progressColor,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
