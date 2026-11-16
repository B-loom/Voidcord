/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * Le pont de l'écran de démarrage.
 *
 * L'animation est la première chose affichée, avant que le serveur n'existe : elle ne
 * peut donc pas lui parler. Son `startupAPI` est tenu par Kotlin, qui connaît l'état du
 * démarrage mieux que personne.
 *
 * Les quatre gestes sont ceux de `StartupPreload.ts` : lire l'état, être prévenu quand il
 * change, dire que l'animation est finie, abandonner.
 */
class PontDemarrage (private val ecoute: Ecoute) {

    interface Ecoute {
        fun animationFinie ()
        fun montrerLeClient ()
        fun relancer ()
        fun quitter ()
    }

    @Volatile
    private var etat: String = """{"phase":"starting"}"""

    /** Appelé par l'activité ; le JavaScript injecté transmet l'état aux écouteurs. */
    fun etat (phase: String, message: String? = null): String {
        val objet = JSONObject().put("phase", phase)
        if (message != null) objet.put("message", message)
        etat = objet.toString()
        return etat
    }

    @JavascriptInterface
    fun etatActuel (): String = etat

    @JavascriptInterface
    fun animationFinie () = ecoute.animationFinie()

    @JavascriptInterface
    fun revelerApplication () = ecoute.montrerLeClient()

    @JavascriptInterface
    fun relancer () = ecoute.relancer()

    @JavascriptInterface
    fun quitter () = ecoute.quitter()

    companion object {
        const val NOM = "VoidcordDemarrage"

        /**
         * Le `startupAPI` que `assets/startup/startup.js` attend, construit sur le pont.
         *
         * Il est injecté au tout début du document : la page capture `window.startupAPI`
         * dès sa troisième ligne, et un script posé après le chargement arriverait trop
         * tard — l'animation resterait noire.
         */
        val CALQUE = """
            (() => {
              const pont = window.${NOM};
              if (!pont || window.startupAPI) return;
              /*
               * La croix en haut à droite quitte Voidcord : c'est son rôle sur
               * l'ordinateur, où elle ferme la fenêtre de démarrage. Sur un téléphone on
               * la prend pour un « passer », et elle fermait l'application au moment
               * d'entrer dedans. Elle disparaît donc ici — on quitte avec le bouton
               * retour d'Android — et « Passer » reste le seul chemin vers le client.
               */
              const style = document.createElement("style");
              style.textContent = ".close{display:none!important}";
              document.documentElement.appendChild(style);
              const ecouteurs = [];
              window.__voidcordEtat = etat => {
                for (const e of ecouteurs.slice()) { try { e(etat); } catch (x) { console.error(x); } }
              };
              window.startupAPI = {
                getState: () => Promise.resolve(JSON.parse(pont.etatActuel())),
                onStateChanged: rappel => {
                  ecouteurs.push(rappel);
                  return () => {
                    const i = ecouteurs.indexOf(rappel);
                    if (i !== -1) ecouteurs.splice(i, 1);
                  };
                },
                retry: () => pont.relancer(),
                quit: () => pont.quitter(),
                animationFinished: () => pont.animationFinie(),
                revealApplication: () => pont.revelerApplication(),
              };
            })();
        """.trimIndent()
    }
}
