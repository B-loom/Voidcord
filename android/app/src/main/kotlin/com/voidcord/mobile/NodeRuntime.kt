/* Copyright Elysia © 2025. All rights reserved */

package com.voidcord.mobile

import android.content.Context
import android.util.Log
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Le serveur Voidcord, à l'intérieur de l'application.
 *
 * Le dossier `nodejs-project` voyage dans l'APK, mais Node doit pouvoir le lire comme de
 * vrais fichiers — un `require` ne sait pas ouvrir une entrée d'archive. Il est donc
 * recopié dans l'espace privé de l'application au premier lancement, puis à chaque fois
 * que la version change.
 */
object NodeRuntime {

    private const val ETIQUETTE = "Voidcord"
    private const val PROJET = "nodejs-project"

    private val demarre = AtomicBoolean(false)

    /** Le port du serveur, une fois qu'il écoute. Zéro avant. */
    @Volatile
    var port: Int = 0
        private set

    init {
        System.loadLibrary("voidcordnode")
    }

    @JvmStatic
    private external fun demarrerNode (arguments: Array<String>): Int

    @JvmStatic
    private external fun definirVariable (cle: String, valeur: String)

    class EchecDemarrage (message: String, cause: Throwable? = null) : Exception(message, cause)

    /**
     * Démarre le serveur et rend son port.
     *
     * Appelable depuis un fil d'arrière-plan seulement : l'attente du port bloque, le
     * temps que Node charge les 133 routes — deux à quatre secondes sur un téléphone.
     */
    fun demarrer (context: Context): Int {
        if (port != 0) return port

        val racine = File(context.filesDir, PROJET)
        val donnees = File(context.filesDir, "voidcord-data").apply { mkdirs() }
        val fichierPort = File(donnees, "port")
        val fichierErreur = File(donnees, "port.erreur")
        fichierPort.delete()
        fichierErreur.delete()

        installerProjet(context, racine)

        definirVariable("VOIDCORD_APP_PATH", racine.absolutePath)
        definirVariable("VOIDCORD_USER_DATA", donnees.absolutePath)
        definirVariable("VOIDCORD_PORT_FILE", fichierPort.absolutePath)
        definirVariable("VOIDCORD_VERSION", BuildConfig.VERSION_NAME.removeSuffix("-debug"))
        definirVariable("VOIDCORD_LOCALE", java.util.Locale.getDefault().toLanguageTag())
        definirVariable("TMPDIR", File(context.cacheDir, "node").apply { mkdirs() }.absolutePath)
        definirVariable("HOME", donnees.absolutePath)
        /*
         * Node choisit la taille de son tas d'après la mémoire de la machine, ce qu'il
         * lit mal sur Android : sans borne, il réclame plus que ce que le système accorde
         * à une application et se fait tuer en pleine charge.
         */
        definirVariable("NODE_OPTIONS", "--max-old-space-size=256")

        if (demarre.compareAndSet(false, true)) {
            Thread({
                val code = demarrerNode(arrayOf("node", File(racine, "main.js").absolutePath))
                Log.w(ETIQUETTE, "Le serveur s'est arrêté (code $code)")
            }, "voidcord-node").apply {
                isDaemon = true
                start()
            }
        }

        return attendreLePort(fichierPort, fichierErreur)
    }

    /**
     * Attend que le serveur écrive son port.
     *
     * Le port est tiré au sort par le système : le serveur l'écrit dans un fichier dès
     * qu'il écoute, ce qui évite de deviner un numéro déjà pris par une autre application.
     */
    private fun attendreLePort (fichierPort: File, fichierErreur: File): Int {
        val limite = System.currentTimeMillis() + 60_000
        while (System.currentTimeMillis() < limite) {
            if (fichierErreur.exists()) {
                throw EchecDemarrage(fichierErreur.readText().take(2000))
            }
            if (fichierPort.exists()) {
                val lu = fichierPort.readText().trim().toIntOrNull()
                if (lu != null && lu > 0) {
                    port = lu
                    Log.i(ETIQUETTE, "Le serveur écoute sur 127.0.0.1:$lu")
                    return lu
                }
            }
            Thread.sleep(50)
        }
        throw EchecDemarrage("Le serveur n'a pas répondu en une minute.")
    }

    /** L'adresse de base du serveur local. */
    fun adresse (chemin: String = ""): String = "http://127.0.0.1:$port$chemin"

    /**
     * Recopie `nodejs-project` depuis l'APK.
     *
     * Un témoin évite de tout réécrire à chaque lancement : la copie prend plusieurs
     * secondes et le dossier fait une vingtaine de mégaoctets.
     *
     * Le témoin porte la date d'installation du paquet, pas seulement son numéro de
     * version. Deux APK de test portent le même numéro, et s'arrêter là gardait l'ancien
     * serveur en place : une correction réinstallée ne changeait rien, et le journal
     * montrait toujours la même erreur.
     */
    private fun installerProjet (context: Context, racine: File) {
        val temoin = File(racine, ".version")
        val paquet = context.packageManager.getPackageInfo(context.packageName, 0)
        val attendu = "${BuildConfig.VERSION_CODE}-${BuildConfig.VERSION_NAME}-${paquet.lastUpdateTime}"
        if (temoin.exists() && temoin.readText() == attendu) return

        Log.i(ETIQUETTE, "Installation du serveur Voidcord…")
        racine.deleteRecursively()
        racine.mkdirs()
        copierDossier(context, PROJET, racine)
        temoin.writeText(attendu)
        Log.i(ETIQUETTE, "Serveur installé dans ${racine.absolutePath}")
    }

    private fun copierDossier (context: Context, chemin: String, cible: File) {
        val entrees = context.assets.list(chemin) ?: emptyArray()
        if (entrees.isEmpty()) {
            // Une entrée sans enfant est un fichier.
            cible.parentFile?.mkdirs()
            context.assets.open(chemin).use { entree ->
                cible.outputStream().use { sortie -> entree.copyTo(sortie, 64 * 1024) }
            }
            return
        }
        cible.mkdirs()
        for (nom in entrees) copierDossier(context, "$chemin/$nom", File(cible, nom))
    }
}
