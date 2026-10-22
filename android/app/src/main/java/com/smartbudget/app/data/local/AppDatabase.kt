package com.smartbudget.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.smartbudget.app.data.local.dao.TransactionDao
import com.smartbudget.app.data.local.dao.UserProfileDao
import com.smartbudget.app.data.local.entity.TransactionEntity
import com.smartbudget.app.data.local.entity.UserProfileEntity

@Database(
    entities = [TransactionEntity::class, UserProfileEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun transactionDao(): TransactionDao
    abstract fun userProfileDao(): UserProfileDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "smart_budget_app.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
