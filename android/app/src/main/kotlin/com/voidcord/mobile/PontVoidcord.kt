/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.webkit.JavascriptInterface
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Le pont entre la page et l'application.
 *
 * Deux choses seulement passent par ici, et elles ne pourraient pas passer ailleurs :
 *
 * 1. Les appels dont la valeur doit revenir sur place. Discord demande un jeton, une
 *    version ou une expérience de façon synchrone, au moment du clic : une réponse
 *    différée arriverait trop tard. Une méthode annotée `@JavascriptInterface` rend sa
 *    valeur tout de suite, ce qu'aucun appel réseau ne sait faire depuis JavaScript.
 *
 * 2. Les gestes qui appartiennent au téléphone : ouvrir un lien, copier, changer d'écran.
 *
 * Tout le reste — et c'est l'essentiel — parle directement au serveur local en HTTP, sans
 * passer par Kotlin.
 */
class PontVoidcord (private val hote: HoteEcrans) {

    interface HoteEcrans {
        /** Exécute une action demandée par la page, sur le fil principal. */
        fun agir (type: String, valeur: String)
    }

    private val client = OkHttpClient.Builder()
        .callTimeout(20, TimeUnit.SECONDS)
        .build()

    private val typeJson = "application/json; charset=utf-8".toMediaType()

    /**
     * Un appel IPC synchrone.
     *
     * La méthode tourne sur le fil du pont JavaScript, jamais sur celui de l'interface :
     * y bloquer sur une requête vers 127.0.0.1 est sans danger.
     */
    @JavascriptInterface
    fun appelSync (canal: String, argsJson: String): String {
        val port = NodeRuntime.port
        if (port == 0) return """{"ok":false,"erreur":"Le serveur Voidcord n'est pas démarré."}"""
        val corps = JSONObject()
            .put("canal", canal)
            .put("args", org.json.JSONArray(argsJson))
            .toString()
        return try {
            client.newCall(
                Request.Builder()
                    .url(NodeRuntime.adresse("/__mobile/ipc"))
                    .post(corps.toRequestBody(typeJson))
                    .build(),
            ).execute().use { reponse ->
                reponse.body?.string() ?: """{"ok":false,"erreur":"Réponse vide du serveur."}"""
            }
        } catch (erreur: Exception) {
            """{"ok":false,"erreur":${JSONObject.quote(erreur.message ?: "Appel impossible.")}}"""
        }
    }

    /** Une action à exécuter par l'application : le détail arrive en JSON. */
    @JavascriptInterface
    fun action (type: String, valeurJson: String) {
        hote.agir(type, valeurJson)
    }

    companion object {
        /**
         * Le nom sous lequel la page trouve ce pont. `src/Mobile/pont.ts` le cherche, et
         * retombe sur un `XMLHttpRequest` synchrone s'il ne le trouve pas.
         */
        const val NOM = "VoidcordNative"
    }
}
