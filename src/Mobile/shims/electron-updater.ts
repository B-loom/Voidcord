/* Copyright Elysia © 2025. All rights reserved */

/*
 * La mise à jour, version Android.
 *
 * `electron-updater` remplace l'exécutable sur place ; un APK, non : Android exige que
 * l'utilisateur confirme l'installation. Le calque se contente donc d'interroger les
 * versions publiées sur GitHub et d'annoncer celle qui existe. Télécharger et installer
 * est l'affaire du pont natif, qui passe par l'installateur du système.
 */

import { EventEmitter } from "events";

const DEPOT = "https://api.github.com/repos/B-loom/Voidcord-Apk/releases/latest";

class AutoUpdater extends EventEmitter {
    autoDownload = false;
    autoInstallOnAppQuit = false;
    allowPrerelease = false;
    currentVersion = process.env.VOIDCORD_VERSION ?? "0.0.0";
    logger: unknown = null;

    async checkForUpdates () {
        this.emit("checking-for-update");
        try {
            const reponse = await fetch(DEPOT, {
                headers: { accept: "application/vnd.github+json", "user-agent": "Voidcord-Android" },
            });
            if (!reponse.ok) throw new Error(`GitHub a répondu ${reponse.status}`);
            const publication = (await reponse.json()) as { tag_name?: string; html_url?: string };
            const version = (publication.tag_name ?? "").replace(/^v/, "");
            if (!version) throw new Error("Aucune version publiée.");
            const info = { version, releaseName: version, files: [], path: publication.html_url ?? "", releaseDate: "" };
            if (this.estPlusRecente(this.currentVersion, version)) this.emit("update-available", info);
            else this.emit("update-not-available", info);
            return { updateInfo: info };
        } catch (error) {
            this.emit("error", error);
            return null;
        }
    }

    private estPlusRecente (actuelle: string, candidate: string) {
        const lire = (v: string) => v.split(".").map(n => Number.parseInt(n, 10) || 0);
        const [a, b] = [lire(actuelle), lire(candidate)];
        for (let i = 0; i < 3; i++) {
            if ((b[i] ?? 0) > (a[i] ?? 0)) return true;
            if ((b[i] ?? 0) < (a[i] ?? 0)) return false;
        }
        return false;
    }

    checkForUpdatesAndNotify () {
        return this.checkForUpdates();
    }
    /** L'APK est téléchargé par le pont natif : rien à faire ici. */
    downloadUpdate () {
        return Promise.resolve([] as string[]);
    }
    quitAndInstall () {
        /* L'installateur d'Android prend la suite. */
    }
    setFeedURL () {}
}

export const autoUpdater = new AutoUpdater();
export default { autoUpdater };
