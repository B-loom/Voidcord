/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

/**
 * Les notifications du serveur.
 *
 * Le calque Electron transforme `new Notification(...).show()` en une annonce, qui
 * remonte jusqu'ici. Les notifications de messages, elles, viennent du client lui-même et
 * passent par la WebView : ce chemin-là ne sert qu'au serveur.
 */
object Notifications {

    private const val CANAL = "voidcord"
    private var pret = false

    fun montrer (contexte: Context, details: JSONObject) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(contexte, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        val gestionnaire = contexte.getSystemService(NotificationManager::class.java) ?: return
        if (!pret) {
            gestionnaire.createNotificationChannel(
                NotificationChannel(CANAL, contexte.getString(R.string.app_name), NotificationManager.IMPORTANCE_DEFAULT),
            )
            pret = true
        }
        val avis = NotificationCompat.Builder(contexte, CANAL)
            .setSmallIcon(R.drawable.ic_voidcord)
            .setContentTitle(details.optString("titre", contexte.getString(R.string.app_name)))
            .setContentText(details.optString("corps"))
            .setAutoCancel(true)
            .build()
        gestionnaire.notify(details.optString("corps").hashCode(), avis)
    }
}
