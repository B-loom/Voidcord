/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * Les fenêtres secondaires de Voidcord, en un seul écran.
 *
 * Sur l'ordinateur, les réglages, la connexion par compte, le choix de la langue,
 * l'éditeur de message et le captcha ouvrent chacun leur fenêtre. Ici c'est le même
 * écran, qui charge la page demandée depuis le serveur local — les pages elles-mêmes,
 * leur HTML et leur React, sont celles du bureau, sans modification.
 */
class EcranWebActivity : AppCompatActivity(), PontVoidcord.HoteEcrans {

    private lateinit var vue: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate (savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val adresse = intent.getStringExtra(CLE_ADRESSE) ?: run { finish(); return }
        title = intent.getStringExtra(CLE_TITRE) ?: getString(R.string.app_name)

        vue = WebView(this)
        vue.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
        }
        vue.setBackgroundColor(0xFF1E1F22.toInt())
        vue.addJavascriptInterface(PontVoidcord(this), PontVoidcord.NOM)
        vue.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading (vue2: WebView, requete: WebResourceRequest): Boolean {
                val cible = requete.url
                /*
                 * Le captcha a besoin du site de hCaptcha : il reste dans l'écran. Tout
                 * autre lien vers l'extérieur part dans le navigateur du téléphone.
                 */
                val interne = cible.host == "127.0.0.1" ||
                    cible.host?.endsWith("hcaptcha.com") == true ||
                    cible.host?.endsWith("discord.com") == true
                if (interne) return false
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, cible)) }
                return true
            }
        }
        setContentView(vue)
        vue.loadUrl(adresse)
    }

    /** Le seul geste qui compte ici : la page demande à se fermer. */
    override fun agir (type: String, valeur: String) {
        runOnUiThread {
            when (type) {
                "ecran:fermer", "ecran:client" -> finish()
                "ouvrir-lien" -> runCatching {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(valeur.trim('"'))))
                }
                else -> Unit
            }
        }
    }

    override fun onDestroy () {
        vue.destroy()
        super.onDestroy()
    }

    companion object {
        private const val CLE_ADRESSE = "voidcord.adresse"
        private const val CLE_TITRE = "voidcord.titre"

        fun intention (contexte: Context, adresse: String, titre: String): Intent =
            Intent(contexte, EcranWebActivity::class.java)
                .putExtra(CLE_ADRESSE, adresse)
                .putExtra(CLE_TITRE, titre)
    }
}
