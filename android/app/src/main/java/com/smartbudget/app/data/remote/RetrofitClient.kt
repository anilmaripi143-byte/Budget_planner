package com.smartbudget.app.data.remote

import com.smartbudget.app.data.local.entity.TransactionEntity
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class DailyBudgetRemoteResponse(
    val starting_daily_allowance: Double,
    val spent_today: Double,
    val remaining_allowance: Double,
    val percentage_consumed: Double,
    val is_overbudget: Boolean,
    val overspent_amount: Double,
    val warning_level: String,
    val warning_message: String?
)

interface ApiService {
    @GET("/api/v1/budget/daily")
    suspend fun getDailyBudget(@Query("target_date") date: String? = null): Response<DailyBudgetRemoteResponse>

    @POST("/api/v1/transactions")
    suspend fun createTransaction(@Body transaction: TransactionEntity): Response<TransactionEntity>
}

object RetrofitClient {
    // 10.0.2.2 maps to host machine localhost from standard Android emulator
    private const val BASE_URL = "http://10.0.2.2:8000/"

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
