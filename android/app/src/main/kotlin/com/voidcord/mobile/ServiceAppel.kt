/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Ce qui garde un appel en vie quand on quitte l'application.
 *
 * Android met en sommeil ce qui n'est plus à l'écran, et le processus finit par être tué :
 * un appel vocal s'arrêtait dès qu'on passait à une autre application. Un service de
 * premier plan dit au système que l'application fait quelque chose d'utile et lui interdit
 * de la couper. La notification n'est pas un choix : c'est le prix qu'Android demande, et
 * elle sert de retour vers l'appel.
 *
 * Il est démarré quand Discord ouvre le micro et arrêté quand il le relâche —
 * `src/Mobile/pont.ts` surveille `getUserMedia` et annonce les deux.
 */
class ServiceAppel : Service() {

    override fun onBind (intention: Intent?): IBinder? = null

    /*
     * Le canal est créé ici, pas dans `onStartCommand`.
     *
     * Android donne cinq secondes entre `startForegroundService` et `startForeground`, et
     * tue l'application au-delà — c'est ce qui fermait Voidcord dès qu'on rejoignait un
     * salon vocal. Tout ce qui peut être fait avant l'est.
     */
    override fun onCreate () {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            runCatching {
                getSystemService(NotificationManager::class.java)?.createNotificationChannel(
                    NotificationChannel(CANAL, getString(R.string.appel_en_cours), NotificationManager.IMPORTANCE_LOW),
                )
            }
        }
    }

    override fun onStartCommand (intention: Intent?, drapeaux: Int, numero: Int): Int {
        /*
         * Et si quoi que ce soit échoue, le service s'arrête de lui-même : un appel qui ne
         * survit pas à l'arrière-plan vaut mieux qu'une application qui se ferme.
         */
        val lance = runCatching { passerAuPremierPlan() }
        if (lance.isFailure) {
            Log.w(ETIQUETTE, "Service d'appel impossible : ${lance.exceptionOrNull()?.message}")
            stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun passerAuPremierPlan () {
        val retour = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )

        val avis = NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_voidcord)
            .setContentTitle(getString(R.string.appel_en_cours))
            .setContentText(getString(R.string.appel_retour))
            .setContentIntent(retour)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        /*
         * Depuis Android 14, un service de premier plan doit déclarer à quoi il sert. Le
         * micro est ce qui décrit un appel ; sans ce type, le système refuse le service.
         */
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NUMERO, avis, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NUMERO, avis)
        }
    }

    companion object {
        private const val ETIQUETTE = "Voidcord"
        private const val CANAL = "voidcord-appel"
        private const val NUMERO = 42

        fun demarrer (contexte: Context) {
            val intention = Intent(contexte, ServiceAppel::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                contexte.startForegroundService(intention)
            } else {
                contexte.startService(intention)
            }
        }

        fun arreter (contexte: Context) {
            contexte.stopService(Intent(contexte, ServiceAppel::class.java))
        }
    }
}
