/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.Manifest
import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import org.json.JSONObject

/**
 * L'écran unique de Voidcord.
 *
 * Il tient la place des deux fenêtres du bureau : l'animation de démarrage, puis le
 * client. L'animation est affichée tout de suite, depuis l'APK ; le serveur démarre
 * derrière ; quand il écoute et que l'animation est finie, le client prend sa place.
 *
 * Pourquoi l'animation n'est pas servie par le serveur local : elle doit être visible
 * avant lui. Elle est donc servie depuis les ressources de l'application, par
 * `WebViewAssetLoader`, qui lui donne une vraie origine HTTPS — ce que `file://` ne fait
 * pas, et dont l'injection au début du document a besoin.
 */
class MainActivity : AppCompatActivity(), PontVoidcord.HoteEcrans, PontDemarrage.Ecoute {

    private lateinit var racine: FrameLayout
    private lateinit var clientWeb: WebView
    private lateinit var demarrageWeb: WebView
    private lateinit var pontDemarrage: PontDemarrage

    private var animationTerminee = false
    private var serveurPret = false
    private var clientCharge = false
    private var clientDevoile = false
    private var notificationsDemandees = false
    private var demandeMicro: PermissionRequest? = null

    /** Ce que la page attend quand elle a ouvert un `<input type="file">`. */
    private var choixDeFichiers: ValueCallback<Array<Uri>>? = null

    private val selecteurDeFichiers = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { resultat ->
        val rappel = choixDeFichiers ?: return@registerForActivityResult
        choixDeFichiers = null
        rappel.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultat.resultCode, resultat.data))
    }

    override fun onCreate (savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)

        /*
         * L'animation de démarrage est dessinée pour une fenêtre large — 1536 sur 864. En
         * portrait, on n'en voyait que le centre, et le bouton « Passer » tombait hors de
         * l'écran. Le téléphone bascule donc en paysage le temps de l'animation, puis
         * retrouve son orientation normale quand le client paraît.
         */
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

        racine = FrameLayout(this)
        setContentView(racine, FrameLayout.LayoutParams(MATCH, MATCH))

        clientWeb = construireClient()
        demarrageWeb = construireDemarrage()
        racine.addView(clientWeb, FrameLayout.LayoutParams(MATCH, MATCH))
        racine.addView(demarrageWeb, FrameLayout.LayoutParams(MATCH, MATCH))
        clientWeb.visibility = View.INVISIBLE

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed () {
                if (clientDevoile && clientWeb.canGoBack()) clientWeb.goBack() else finish()
            }
        })

        demarrerLeServeur()
    }

    // ── Le serveur ──────────────────────────────────────────────────────────────────

    private fun demarrerLeServeur () {
        lifecycleScope.launch {
            pontDemarrage.etat("loading").let { transmettreEtat(it) }
            try {
                val port = withContext(Dispatchers.IO) { NodeRuntime.demarrer(this@MainActivity) }
                Log.i(ETIQUETTE, "Serveur prêt sur le port $port")
                serveurPret = true
                transmettreEtat(pontDemarrage.etat("ready"))
                clientWeb.loadUrl(NodeRuntime.adresse("/app"))
            } catch (erreur: Exception) {
                Log.e(ETIQUETTE, "Le serveur n'a pas démarré", erreur)
                transmettreEtat(
                    pontDemarrage.etat("error", erreur.message ?: "Le serveur n'a pas démarré."),
                )
            }
        }
    }

    private fun transmettreEtat (etatJson: String) {
        if (clientDevoile) return
        demarrageWeb.evaluateJavascript("window.__voidcordEtat && window.__voidcordEtat($etatJson);", null)
    }

    // ── Les deux WebViews ───────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun reglagesCommuns (vue: WebView) {
        vue.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)
            cacheMode = WebSettings.LOAD_DEFAULT
            /*
             * Le client Discord se présente lui-même comme une application de bureau :
             * l'interface pour téléphone de Discord suppose son application React Native,
             * que Voidcord n'a pas. Garder « Mobile » dans la chaîne laisse malgré tout
             * la mise en page s'adapter à l'écran.
             */
            /*
             * Voidcord se présente comme un navigateur de bureau, et c'est voulu.
             *
             * Discord ampute son client web mobile : pas de vocal — « navigateur non pris
             * en charge » dès qu'on touche au micro —, pas de sélecteur de GIF, pas
             * d'autocollants, et plusieurs greffons Vencord n'y trouvent plus ce qu'ils
             * patchent. Ce n'est pas la WebView qui manque de quoi que ce soit : WebRTC,
             * `getUserMedia` et les WebSockets y fonctionnent, le micro s'ouvre. C'est
             * Discord qui ferme la porte d'après la chaîne d'identification.
             *
             * En se disant Chrome sous Windows, on obtient le client complet. La mise en
             * page est alors celle du bureau, que `reglerLaMiseEnPage` dans
             * `src/Mobile/pont.ts` ramène à la taille d'un téléphone.
             */
            userAgentString =
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/131.0.0.0 Safari/537.36 VoidcordAndroid/${BuildConfig.VERSION_NAME}"
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            textZoom = 100
            // Le client de bureau se met en page large, puis se replie a l'ecran.
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        vue.setBackgroundColor(0xFF1E1F22.toInt())
    }

    private fun construireClient (): WebView {
        val vue = WebView(this)
        reglagesCommuns(vue)
        vue.addJavascriptInterface(PontVoidcord(this), PontVoidcord.NOM)
        vue.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading (vue2: WebView, requete: WebResourceRequest): Boolean {
                val adresse = requete.url
                // Tout ce qui n'est pas le serveur local part dans le navigateur du téléphone.
                if (adresse.host == "127.0.0.1" && adresse.port == NodeRuntime.port) return false
                ouvrirDehors(adresse.toString())
                return true
            }

            /*
             * Les images de Voidcord que Discord croit trouver sur son CDN : l'avatar et
             * la bannière de Sakura, le badge, et les deux émojis des boutons d'accueil.
             * Elles n'existent nulle part ailleurs que dans l'application.
             *
             * Sur l'ordinateur, Electron détourne ces adresses au niveau de la session.
             * Ici c'est `shouldInterceptRequest` qui s'en charge — ce sont des images
             * demandées en GET, exactement ce qu'il sait faire.
             */
            override fun shouldInterceptRequest (vue2: WebView, requete: WebResourceRequest): WebResourceResponse? =
                Branding.reponsePour(this@MainActivity, requete)

            override fun onPageFinished (vue2: WebView, url: String) {
                clientCharge = true
                devoilerSiPret()
            }
        }
        vue.webChromeClient = chromeClient()
        return vue
    }

    private fun construireDemarrage (): WebView {
        val vue = WebView(this)
        reglagesCommuns(vue)
        pontDemarrage = PontDemarrage(this)
        vue.addJavascriptInterface(pontDemarrage, PontDemarrage.NOM)

        /*
         * `WebViewAssetLoader` sert l'animation depuis l'APK sous une origine HTTPS.
         * Sans elle, la page serait en `file://` : son CSP `'self'` refuserait ses propres
         * scripts, et l'injection au début du document n'accepterait pas l'origine.
         */
        val chargeur = WebViewAssetLoader.Builder()
            .setDomain(DOMAINE_LOCAL)
            .addPathHandler(
                "/demarrage/",
                WebViewAssetLoader.AssetsPathHandler(this).let { interne ->
                    WebViewAssetLoader.PathHandler { chemin -> interne.handle("nodejs-project/assets/startup/$chemin") }
                },
            )
            .build()

        vue.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest (vue2: WebView, requete: WebResourceRequest): WebResourceResponse? =
                chargeur.shouldInterceptRequest(requete.url)

            override fun onPageFinished (vue2: WebView, url: String) {
                // L'état peut déjà avoir changé pendant le chargement de la page.
                transmettreEtat(pontDemarrage.etatActuel())
            }
        }

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(
                vue,
                PontDemarrage.CALQUE,
                setOf("https://$DOMAINE_LOCAL"),
            )
        } else {
            /*
             * Sans l'injection au début du document, `startup.js` ne trouverait pas son
             * API : l'animation est alors sautée et le client s'affiche dès qu'il est prêt.
             */
            Log.w(ETIQUETTE, "WebView trop ancienne pour l'animation : elle sera sautée.")
            animationTerminee = true
        }

        vue.loadUrl("https://$DOMAINE_LOCAL/demarrage/index.html")
        return vue
    }

    private fun chromeClient () = object : WebChromeClient() {
        /*
         * Le micro n'est demandé qu'au moment où Discord le réclame — en rejoignant un
         * salon vocal. Le demander au lancement posait la question d'Android par-dessus
         * l'animation de démarrage, avant même que l'on sache à quoi sert l'application.
         */
        override fun onPermissionRequest (requete: PermissionRequest) {
            val micro = requete.resources.filter { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE }
            if (micro.isEmpty()) return requete.deny()
            if (accordee(Manifest.permission.RECORD_AUDIO)) return requete.grant(micro.toTypedArray())
            demandeMicro = requete
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), DEMANDE_MICRO)
        }

        /*
         * Le sélecteur de fichiers.
         *
         * Sans ce gestionnaire, une WebView ne fait rien du tout quand la page ouvre un
         * `<input type="file">` : le bouton « + » de Discord répondait au doigt, et rien
         * ne se passait. Il n'y avait pas d'erreur à lire — c'est le comportement par
         * défaut, et c'est ce qui rendait l'envoi d'images impossible.
         */
        override fun onShowFileChooser (
            vue: WebView,
            rappel: ValueCallback<Array<Uri>>,
            parametres: WebChromeClient.FileChooserParams,
        ): Boolean {
            choixDeFichiers?.onReceiveValue(null)
            choixDeFichiers = rappel
            return try {
                selecteurDeFichiers.launch(parametres.createIntent())
                true
            } catch (erreur: Exception) {
                Log.w(ETIQUETTE, "Aucune application pour choisir un fichier", erreur)
                choixDeFichiers = null
                rappel.onReceiveValue(null)
                false
            }
        }

        override fun onConsoleMessage (message: android.webkit.ConsoleMessage): Boolean {
            if (BuildConfig.DEBUG) {
                Log.d(ETIQUETTE, "[page] ${message.message()} (${message.sourceId()}:${message.lineNumber()})")
            }
            return true
        }
    }

    // ── Le passage de l'animation au client ────────────────────────────────────────

    private fun devoilerSiPret () {
        if (clientDevoile || !serveurPret || !clientCharge || !animationTerminee) return
        clientDevoile = true
        runOnUiThread {
            /*
             * Le client suit l'orientation du téléphone.
             *
             * Le forcer en paysage rendait la page plus grande — le client de bureau se
             * déplie sur huit cent cinquante points, soit à peu près la largeur d'un
             * téléphone couché — mais imposait de tourner l'appareil pour lire un message.
             * Bloom l'a essayé et n'en a pas voulu : on tient l'application droite, et on
             * tourne soi-même quand on veut de la place.
             *
             * Seule l'animation de démarrage garde le paysage : elle est dessinée pour un
             * cadre large et ne dure que quelques secondes.
             */
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            clientWeb.visibility = View.VISIBLE
            racine.removeView(demarrageWeb)
            demarrageWeb.destroy()
        }
    }

    override fun animationFinie () {
        animationTerminee = true
        devoilerSiPret()
    }

    override fun montrerLeClient () {
        animationTerminee = true
        devoilerSiPret()
    }

    override fun relancer () {
        runOnUiThread {
            if (serveurPret) clientWeb.loadUrl(NodeRuntime.adresse("/app")) else demarrerLeServeur()
        }
    }

    override fun quitter () {
        runOnUiThread { finishAffinity() }
    }

    // ── Les actions demandées par la page ──────────────────────────────────────────

    override fun agir (type: String, valeur: String) {
        runOnUiThread {
            val brut = runCatching { JSONObject(valeur) }.getOrNull()
            val texte = brut?.toString() ?: valeur.trim('"')
            when (type) {
                "ouvrir-lien" -> ouvrirDehors(valeur.trim('"'))
                "presse-papier" -> copier(valeur.trim('"'))
                "notification" -> brut?.let { demanderLesNotifications(); Notifications.montrer(this, it) }
                "ecran:reglages" -> ouvrirEcran("/__mobile/reglages/index.html", getString(R.string.titre_reglages))
                "ecran:comptes" -> ouvrirEcran("/__mobile/compte/index.html", getString(R.string.titre_comptes))
                "ecran:langue" -> ouvrirEcran("/__mobile/langue/index.html", getString(R.string.titre_langue))
                "ecran:editeur" -> ouvrirEcran("/__mobile/editeur/index.html", getString(R.string.titre_editeur))
                "ecran:captcha" -> brut?.let { ouvrirCaptcha(it) }
                "ecran:avertissement" -> brut?.let { avertir(it) }
                "ecran:client" -> relancer()
                "ecran:fermer" -> Unit // Seuls les écrans secondaires se ferment : voir EcranWebActivity.
                "appel:debut" -> ServiceAppel.demarrer(this)
                "appel:fin" -> ServiceAppel.arreter(this)
                "ecran:quitter" -> quitter()
                "ecran:installer-mise-a-jour" -> ouvrirDehors(ADRESSE_VERSIONS)
                else -> Log.d(ETIQUETTE, "Action ignorée : $type ($texte)")
            }
        }
    }

    private fun ouvrirEcran (chemin: String, titre: String) {
        if (NodeRuntime.port == 0) return
        startActivity(EcranWebActivity.intention(this, NodeRuntime.adresse(chemin), titre))
    }

    private fun ouvrirCaptcha (details: JSONObject) {
        val parametres = buildString {
            append("?sitekey=").append(Uri.encode(details.optString("sitekey")))
            append("&id=").append(Uri.encode(details.optString("id")))
            val rqdata = details.optString("rqdata")
            if (rqdata.isNotEmpty() && rqdata != "null") append("&rqdata=").append(Uri.encode(rqdata))
        }
        ouvrirEcran("/__botclient/captcha$parametres", getString(R.string.titre_captcha))
    }

    private fun avertir (details: JSONObject) {
        AlertDialog.Builder(this)
            .setTitle(details.optString("titre", getString(R.string.app_name)))
            .setMessage(details.optString("corps"))
            .setPositiveButton(android.R.string.ok, null)
            .show()
    }

    private fun ouvrirDehors (adresse: String) {
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(adresse))) }
            .onFailure { Log.w(ETIQUETTE, "Lien impossible à ouvrir : $adresse") }
    }

    private fun copier (texte: String) {
        val presse = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        presse.setPrimaryClip(ClipData.newPlainText("Voidcord", texte))
    }

    private fun accordee (permission: String) =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    /** Les notifications, demandées la première fois que le serveur en envoie une. */
    private fun demanderLesNotifications () {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (accordee(Manifest.permission.POST_NOTIFICATIONS) || notificationsDemandees) return
        notificationsDemandees = true
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), DEMANDE_NOTIFICATIONS)
    }

    override fun onRequestPermissionsResult (code: Int, permissions: Array<out String>, resultats: IntArray) {
        super.onRequestPermissionsResult(code, permissions, resultats)
        if (code != DEMANDE_MICRO) return
        val requete = demandeMicro ?: return
        demandeMicro = null
        val accorde = resultats.isNotEmpty() && resultats[0] == PackageManager.PERMISSION_GRANTED
        if (accorde) requete.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else requete.deny()
    }

    override fun onDestroy () {
        (clientWeb.parent as? ViewGroup)?.removeView(clientWeb)
        clientWeb.destroy()
        super.onDestroy()
    }

    private companion object {
        const val ETIQUETTE = "Voidcord"
        const val MATCH = FrameLayout.LayoutParams.MATCH_PARENT
        const val DOMAINE_LOCAL = "voidcord.androidplatform.net"
        const val ADRESSE_VERSIONS = "https://github.com/B-loom/Voidcord-Apk/releases/latest"
        const val DEMANDE_MICRO = 1
        const val DEMANDE_NOTIFICATIONS = 2
    }
}
