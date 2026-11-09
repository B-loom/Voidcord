/* Copyright Elysia © 2025. All rights reserved */

import { app, BrowserWindow, IpcMainEvent } from "electron";
import path from "path";

import type { Settings } from "../../shared/Settings";

export type Langue = Settings["langue"];

/**
 * L'écran de bienvenue, au tout premier lancement : français ou anglais.
 *
 * Il passe avant l'écran de démarrage, parce que celui-ci parle déjà. La promesse ne se
 * résout qu'une fois la réponse donnée — ou la fenêtre fermée, auquel cas le français
 * reste, puisque c'est la langue par défaut de Voidcord.
 */
export function askLanguage (): Promise<Langue> {
    return new Promise(resolve => {
        const window = new BrowserWindow({
            width: 520,
            height: 420,
            resizable: false,
            maximizable: false,
            minimizable: false,
            frame: false,
            show: false,
            backgroundColor: "#11111b",
            title: "Voidcord",
            autoHideMenuBar: true,
            webPreferences: {
                preload: path.join(__dirname, "..", "Preloads", "LanguagePreload.js"),
                contextIsolation: true,
                sandbox: true,
                nodeIntegration: false,
                partition: "startup",
            },
        });

        let answered = false;
        const answer = (langue: Langue) => {
            if (answered) return;
            answered = true;
            resolve(langue);
            if (!window.isDestroyed()) window.close();
        };

        const contents = window.webContents;
        contents.ipc.on("langue:choisir", (event: IpcMainEvent, valeur: unknown) => {
            if (event.sender !== contents || event.senderFrame !== contents.mainFrame) return;
            answer(valeur === "en" ? "en" : "fr");
        });
        contents.setWindowOpenHandler(() => ({ action: "deny" }));
        contents.on("will-navigate", event => event.preventDefault());

        // Fermer la fenêtre sans répondre vaut pour le français, la langue par défaut
        window.on("closed", () => answer("fr"));
        window.once("ready-to-show", () => window.show());

        void window
            .loadFile(path.join(app.getAppPath(), "assets", "langue", "index.html"))
            .catch(() => answer("fr"));
    });
}
