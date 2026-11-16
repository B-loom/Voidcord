/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.app.Application
import android.os.Build
import android.webkit.WebView

/**
 * Le processus de Voidcord.
 *
 * Une seule chose à régler ici, mais elle est obligatoire : WebView refuse de servir
 * deux processus avec le même dossier de données. Node tourne dans le processus
 * principal et la WebView dans le sien ; donner un suffixe au second évite l'arrêt
 * immédiat au lancement.
 */
class VoidcordApplication : Application() {
    override fun onCreate () {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val processus = getProcessName()
            if (packageName != processus) WebView.setDataDirectorySuffix(processus)
        }
    }
}
