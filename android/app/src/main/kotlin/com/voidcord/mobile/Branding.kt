/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.content.Context
import android.net.Uri
import android.util.Log
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * Ce que la WebView intercepte avant que ça ne sorte du téléphone.
 *
 * Deux choses, pour la même raison : sur l'ordinateur, Electron détourne les adresses au
 * niveau de la session, ce qu'une WebView ne sait pas faire.
 *
 * 1. **Les images de Voidcord.** Le compte système s'appelle Sakura, et Discord le traite
 *    comme n'importe quel utilisateur : il demande son avatar et sa bannière à
 *    `cdn.discordapp.com`, où ils n'existent pas. Même chose pour le badge et pour les
 *    trois émojis des boutons du message d'accueil. Sans ce détour, Sakura s'affiche sans
 *    visage et les boutons sans icône.
 *
 * 2. **Les adresses absolues vers Discord.** `src/Mobile/pont.ts` réécrit déjà celles que
 *    le client demande par `fetch` ou `XMLHttpRequest`. Restent celles qui n'y passent
 *    pas — un `<img src="https://discord.com/…">`, une feuille de style — et qu'il faut
 *    rattraper ici. Seules les requêtes `GET` sont concernées : une WebView ne donne pas
 *    le corps d'un `POST`, mais aucun `POST` ne passe par ce chemin.
 */
object Branding {

    private const val ETIQUETTE = "Voidcord"

    private const val CDN = "cdn.discordapp.com"
    private val NOMS_DISCORD = setOf("discord.com", "ptb.discord.com", "canary.discord.com")

    private const val UTILISATEUR_SYSTEME = "1565153191526400000"
    private const val EMOJI_DISCORD = "1000000000000000001"
    private const val EMOJI_GITHUB = "1000000000000000002"
    private const val EMOJI_SITE = "1000000000000000003"

    private val client by lazy {
        OkHttpClient.Builder().callTimeout(15, TimeUnit.SECONDS).build()
    }

    private val entetesPermissives = mapOf(
        /*
         * Discord charge certaines de ces images en mode « crossorigin » : sans cet
         * en-tête, la WebView refuserait de les dessiner et elles resteraient vides.
         */
        "Access-Control-Allow-Origin" to "*",
        "Cache-Control" to "max-age=86400",
    )

    /**
     * Le fichier livré avec l'application qui répond à une adresse du CDN, s'il y en a un.
     *
     * Le schéma n'est pas regardé : le message d'accueil écrit ses émojis en `http://`, et
     * exiger `https://` les laissait tous cassés alors que l'avatar, lui, passait.
     */
    private fun fichierPour (adresse: Uri): String? {
        if (adresse.host != CDN) return null
        val chemin = adresse.path ?: return null
        return when {
            chemin.contains("/badge-icons/voidcordcreator") -> "voidcord-badge.png"
            chemin.contains("/avatars/$UTILISATEUR_SYSTEME") -> "sakura-avatar.webp"
            chemin.contains("/banners/$UTILISATEUR_SYSTEME") -> "sakura-banner.webp"
            chemin.contains("/emojis/$EMOJI_DISCORD") -> "discord-logo.svg"
            chemin.contains("/emojis/$EMOJI_GITHUB") -> "github-logo.svg"
            chemin.contains("/emojis/$EMOJI_SITE") -> "icon.png"
            else -> null
        }
    }

    private fun typePour (nom: String) = when (nom.substringAfterLast('.')) {
        "webp" -> "image/webp"
        "png" -> "image/png"
        "svg" -> "image/svg+xml"
        else -> "application/octet-stream"
    }

    /** La réponse à servir, ou `null` pour laisser la requête suivre son chemin. */
    fun reponsePour (contexte: Context, requete: WebResourceRequest): WebResourceResponse? {
        val adresse = requete.url

        fichierPour(adresse)?.let { nom ->
            val fichier = File(contexte.filesDir, "nodejs-project/assets/branding/$nom")
            if (!fichier.exists()) {
                Log.w(ETIQUETTE, "Image de Voidcord absente : $nom")
                return null
            }
            return WebResourceResponse(typePour(nom), null, 200, "OK", entetesPermissives, fichier.inputStream())
        }

        if (adresse.host in NOMS_DISCORD && requete.method.equals("GET", ignoreCase = true)) {
            return depuisLeServeurLocal(adresse)
        }

        /*
         * Les adresses en clair vers le CDN de Discord.
         *
         * Quelques images — des émojis personnalisés, celui de la biographie du compte
         * système — sont demandées en `http://`. Android refuse le trafic en clair depuis
         * la version 9, et la configuration réseau de Voidcord ne l'autorise que vers
         * 127.0.0.1 : ces images restaient vides, sans rien dans la console. Elles sont
         * donc rejouées en `https`, ce que le CDN accepte pour toutes.
         */
        if (adresse.scheme == "http" && adresse.host?.endsWith("discordapp.com") == true) {
            return enClair(adresse)
        }

        return null
    }

    private fun enClair (adresse: Uri): WebResourceResponse? {
        val securisee = adresse.buildUpon().scheme("https").build().toString()
        return try {
            val reponse = client.newCall(Request.Builder().url(securisee).build()).execute()
            val corps = reponse.body ?: return null
            val type = corps.contentType()
            WebResourceResponse(
                type?.let { "${it.type}/${it.subtype}" } ?: "application/octet-stream",
                type?.charset()?.name(),
                reponse.code,
                reponse.message.ifEmpty { "OK" },
                entetesPermissives,
                corps.byteStream(),
            )
        } catch (erreur: Exception) {
            Log.w(ETIQUETTE, "Image en clair inaccessible : $securisee — ${erreur.message}")
            null
        }
    }

    /** Rejoue la requête sur le serveur de Voidcord, qui écoute sur 127.0.0.1. */
    private fun depuisLeServeurLocal (adresse: Uri): WebResourceResponse? {
        val port = NodeRuntime.port
        if (port == 0) return null
        val cible = Uri.Builder()
            .scheme("http")
            .encodedAuthority("127.0.0.1:$port")
            .encodedPath(adresse.encodedPath ?: "/")
            .encodedQuery(adresse.encodedQuery)
            .build()
            .toString()
        return try {
            val reponse = client.newCall(Request.Builder().url(cible).build()).execute()
            val corps = reponse.body ?: return null
            val type = corps.contentType()
            WebResourceResponse(
                type?.let { "${it.type}/${it.subtype}" } ?: "application/octet-stream",
                type?.charset()?.name(),
                reponse.code,
                reponse.message.ifEmpty { "OK" },
                entetesPermissives,
                corps.byteStream(),
            )
        } catch (erreur: Exception) {
            Log.w(ETIQUETTE, "Détour impossible pour $adresse : ${erreur.message}")
            null
        }
    }
}
