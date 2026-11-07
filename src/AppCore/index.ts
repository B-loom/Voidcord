/* Copyright Elysia © 2025. All rights reserved */

import { randomUUID } from "crypto";
import {
    clipboard,
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    Menu,
    Notification,
    NotificationConstructorOptions,
    powerMonitor,
    screen,
    session,
    shell,
    systemPreferences,
    Tray,
} from "electron";
import contextMenu from "electron-context-menu";
import { scope } from "electron-log";
import { autoUpdater } from "electron-updater";
import EventEmitter from "events";
import path from "path";
import GameDetection from "src/AppUtils/GameDetection";
import { installScreenShare } from "src/AppUtils/ScreenShare";
import Util from "src/AppUtils/Utils";

import server, { isLocalServerCertificate } from "./APIServer";
import GlobalConfig from "./Config";
import Constants from "./Constants";
import { IPCEvent } from "./IPCEvents";
import { isAllowedPopoutURL, setupIPCEvents } from "./IPCManager";
import UserAuth from "./UserAuth";
import { MessageEditorWindow } from "./Windows/MessageEditorWindow";
import { SettingsWindow } from "./Windows/SettingsWindow";
import { askLanguage } from "./Windows/LanguageWindow";
import { StartupWindow } from "./Windows/StartupWindow";

/**
 * Discord asks its own CDN for the system user's pictures, Nebula's badge and the two
 * emojis used by the welcome buttons. None of them exist there, so each request is
 * answered with a file shipped alongside the app.
 */
export type UpdateState = {
    state: "idle" | "checking" | "up-to-date" | "available" | "downloading" | "ready" | "error";
    version?: string;
    percent?: number;
    message?: string;
};

function brandingFileFor (url: string) {
    if (url.includes("/badge-icons/")) return "nebula-badge.png";
    if (url.includes("/avatars/")) return "sakura-avatar.webp";
    if (url.includes("/banners/")) return "sakura-banner.webp";
    if (url.includes(`/emojis/${Constants.DiscordEmojiId}`)) return "discord-logo.svg";
    if (url.includes(`/emojis/${Constants.GithubEmojiId}`)) return "github-logo.svg";
    if (url.includes(`/emojis/${Constants.SiteEmojiId}`)) return "icon.png";
    return null;
}

/**
 * An invite link opened inside the client lands on discord.com's own invite page, the one
 * that asks whether to open the desktop app — a dead end here, since Nebula *is* the
 * application. The code is taken out of the link and handed to the client, which shows
 * the invite the way it does for a link posted in a message.
 */
function inviteCodeFrom (url: string) {
    const match = /^https?:\/\/(?:discord\.gg|(?:[a-z]+\.)?discord\.com\/invite)\/([A-Za-z0-9-]+)/.exec(url);
    return match?.[1] ?? null;
}

/**
 * Ce que le processus principal répond à une demande de permission venue du client.
 *
 * Sorti de la fenêtre pour être vérifiable : le partage d'écran est déjà mort une fois
 * parce que cette décision avait changé sans que rien ne le signale. Un test l'épingle
 * maintenant, cas par cas.
 */
export type PermissionDecision = "accorde" | "refuse" | "micro";

export function decidePermission (permission: string, details: { mediaTypes?: string[] }): PermissionDecision {
    if (["notifications", "fullscreen", "clipboard-sanitized-write", "loopback-network"].includes(permission)) {
        return "accorde";
    }
    if (permission !== "media" || !Array.isArray(details.mediaTypes)) return "refuse";
    /*
     * Le partage d'écran arrive en "media" avec une liste de types **vide** : la caméra
     * annonce "video", le micro "audio", lui n'annonce rien. C'est à cette demande-là,
     * et à elle seule, que répond ensuite le sélecteur de ScreenShare.ts, qui ne
     * transmet que la source choisie.
     */
    if (details.mediaTypes.length === 0) return "accorde";
    // Le micro seul. La caméra reste refusée, qu'elle vienne seule ou avec le micro.
    if (details.mediaTypes.includes("audio") && !details.mediaTypes.includes("video")) return "micro";
    return "refuse";
}

export class DiscordBotClient extends EventEmitter {
    logger = scope(Constants.AppName);
    #shouldQuitApp = false;
    private startupWindow?: StartupWindow;
    appWindow!: BrowserWindow;
    // Discord currently lives in the app window; callers must target its contents explicitly.
    discordWebContents!: Electron.WebContents;
    tray!: Tray;
    port!: number;
    private customDiscordSession?: Electron.Session;
    childWindows = new Map<string, BrowserWindow>();
    accountWindow?: BrowserWindow;
    /** One extra client window per account, keyed by account id */
    accountWindows = new Map<string, BrowserWindow>();
    /** The client window that asked for the login window, and that the account belongs to */
    accountLoginTarget?: BrowserWindow;
    private settingsWindow?: SettingsWindow;
    config = GlobalConfig;
    ipcMain = ipcMain;

    constructor () {
        super();
        this.logger.log("App starting...");
        void this.initApp().catch(error => this.startupFailed(error));
    }
    initTray (menu: Electron.Menu) {
        if (!this.tray) {
            this.tray = new Tray(Constants.icon16);
        }
        this.tray.setToolTip(`${Constants.AppName} v${app.getVersion()}`);
        this.tray.on("click", () => {
            this.showApp();
        });
        this.tray.setContextMenu(menu);
    }
    /** Saved accounts for the tray, split between real accounts and bots */
    savedAccountsMenu (): Electron.MenuItemConstructorOptions[] {
        if (!UserAuth.accounts.length) {
            return [{ label: "Aucun compte enregistré", enabled: false }];
        }
        const entry = (account: { username: string; token: string }) => ({
            label: `${account.username} — nouvelle fenêtre`,
            click: () => {
                this.openClientWindow(account.token);
            },
        });
        const users = UserAuth.accounts.filter(account => !account.bot);
        const bots = UserAuth.accounts.filter(account => account.bot);
        const menu: Electron.MenuItemConstructorOptions[] = [];
        if (users.length) {
            menu.push({ label: "Comptes utilisateurs", enabled: false }, ...users.map(entry));
        }
        if (bots.length) {
            if (menu.length) menu.push({ type: "separator" });
            menu.push({ label: "Bots", enabled: false }, ...bots.map(entry));
        }
        return menu;
    }

    setupTray () {
        const menu = Menu.buildFromTemplate([
            {
                label: `${Constants.AppName} v${app.getVersion()}`,
                icon: Constants.icon16,
                enabled: false,
            },
            {
                type: "separator",
            },
            {
                label: "Recharger",
                click: () => {
                    this.discordWebContents.reload();
                },
            },
            {
                label: "Redémarrer",
                click: () => this.relaunch(),
            },
            {
                label: "Nouvelle fenêtre Discord",
                click: () => {
                    this.openBlankClientWindow();
                },
            },
            {
                label: "Ouvrir un compte enregistré",
                submenu: this.savedAccountsMenu(),
            },
            {
                label: "Se connecter avec un compte Discord...",
                click: () => {
                    this.openAccountLoginWindow();
                },
            },
            {
                label: "Paramètres",
                click: () => {
                    this.openSettingsWindow();
                },
            },
            {
                label: "Supprimer toutes les données et redémarrer",
                click: async () => {
                    const result = await dialog.showMessageBox(this.appWindow, {
                        type: "warning",
                        buttons: ["Annuler", "Supprimer et redémarrer"],
                        defaultId: 0,
                        cancelId: 0,
                        title: "Confirmer la suppression des données",
                        message: "Es-tu sûr de vouloir supprimer toutes les données de l’application ?",
                        detail:
                            "Seront définitivement supprimés :\n" +
                            "\n• le cache des requêtes HTTP de Discord" +
                            "\n• les données du cache de session" +
                            "\n• les données du stockage du navigateur" +
                            "\n• les bases locales : messages privés, réglages, fréquences" +
                            "\n\nTous les réglages enregistrés et les données en cache seront perdus. C’est irréversible.",
                    });

                    if (result.response === 1) {
                        try {
                            await this.discordSession.clearCache();
                            await this.discordSession.flushStorageData();
                            await this.discordSession.clearStorageData({
                                storages: [
                                    "cookies",
                                    "filesystem",
                                    "indexdb",
                                    "localstorage",
                                    "shadercache",
                                    "serviceworkers",
                                    "cachestorage",
                                ],
                            });
                            this.relaunch();
                        } catch (err) {
                            console.error("Failed to clear app data:", err);
                        }
                    } else {
                        console.log("User canceled data deletion.");
                    }
                },
            },

            {
                label: "Afficher/masquer les DevTools",
                click: () => {
                    this.discordWebContents.toggleDevTools();
                },
            },
            {
                type: "separator",
            },
            {
                label: "Quitter",
                click: () => this.quit(),
            },
        ]);
        this.initTray(menu);
    }
    async initApp () {
        this.port = await server();
        app.setAppUserModelId(Constants.AppID);
        const enabledFeatures = new Set(app.commandLine.getSwitchValue("enable-features").split(","));
        const disabledFeatures = new Set(app.commandLine.getSwitchValue("disable-features").split(","));
        app.commandLine.appendSwitch("host-rules", `MAP ${Constants.CustomDiscordDomain} 127.0.0.1:${this.port}`);
        // Vesktop
        // Disable renderer backgrounding to prevent the app from unloading when in the background
        // https://github.com/electron/electron/issues/2822
        // https://github.com/GoogleChrome/chrome-launcher/blob/5a27dd574d47a75fec0fb50f7b774ebf8a9791ba/docs/chrome-flags-for-tools.md#task-throttling
        app.commandLine.appendSwitch("disable-renderer-backgrounding");
        app.commandLine.appendSwitch("disable-background-timer-throttling");
        app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
        // Keep direct connections by default; opt in to the OS proxy after restart.
        if (!this.config.config.use_system_proxy) app.commandLine.appendSwitch("no-proxy-server");
        // Discord falls back to the browser locale when the account has none (bot accounts),
        // so the client speaks French out of the box
        app.commandLine.appendSwitch("lang", Constants.DefaultLocale);
        // Chromium lets its cache grow unbounded otherwise
        app.commandLine.appendSwitch("disk-cache-size", String(Constants.DiskCacheBytes));
        // Enable & Disable Chromium Features
        Constants.enableFeatures.forEach(feature => {
            enabledFeatures.add(feature);
        });
        Constants.disableFeatures.forEach(feature => {
            disabledFeatures.add(feature);
        });
        const enabledFeaturesArray = Array.from(enabledFeatures).filter(Boolean);
        const disabledFeaturesArray = Array.from(disabledFeatures).filter(Boolean);
        if (enabledFeaturesArray.length) {
            app.commandLine.appendSwitch("enable-features", enabledFeaturesArray.join(","));
            this.logger.log("Enabled Chromium features:", enabledFeaturesArray.join(", "));
        }

        if (disabledFeaturesArray.length) {
            app.commandLine.appendSwitch("disable-features", disabledFeaturesArray.join(","));
            this.logger.log("Disabled Chromium features:", disabledFeaturesArray.join(", "));
        }
        // App Event
        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") this.quit();
        });

        app.on("before-quit", event => {
            // MacOS: Set flag to really quit app
            this.#shouldQuitApp = true;
            this.logger.info("App closing...");
            this.logger.info("=".repeat(50));
        });

        app.on("second-instance", (event, commandLine, workingDirectory, additionalData) => {
            this.showApp();
        });

        // Patch UserAgent (Switch Plan B SDP > Unified Plan)
        app.userAgentFallback = app.userAgentFallback.replace(/Electron\/[\d.]+/, "");

        // Handle second instance
        const gotTheLock = app.requestSingleInstanceLock();
        if (!gotTheLock) {
            this.logger.debug("Second Instance detected. Quit app...");
            this.#shouldQuitApp = true;
            app.quit();
        } else {
            void app
                .whenReady()
                .then(async () => {
                    await this.chooseLanguageIfNeeded();
                    this.startupWindow = new StartupWindow(
                        () => this.relaunch(),
                        () => this.quit(),
                        this.config.config.startup_animation,
                    );
                    this.logger.info("Creating session...");
                    this.customDiscordSession = session.fromPartition("persist:elysia_dbc");
                    installScreenShare(this.customDiscordSession, this.logger);
                    this.customDiscordSession.setCertificateVerifyProc(({ hostname, certificate }, callback) => {
                        // Never load the real remote site into DBC if a system proxy bypasses host-rules.
                        if (hostname === Constants.CustomDiscordDomain) return callback(isLocalServerCertificate(certificate.data) ? 0 : -2);
                        if (hostname === "localhost" && isLocalServerCertificate(certificate.data)) return callback(0);
                        callback(-3);
                    });
                    const dnsProvider = this.config.config.doh_provider;
                    const dohServers: Partial<Record<typeof dnsProvider, string>> = {
                        cloudflare: "https://cloudflare-dns.com/dns-query",
                        google: "https://dns.google/dns-query",
                        quad9: "https://dns.quad9.net/dns-query",
                    };
                    const dohServer = dohServers[dnsProvider];
                    app.configureHostResolver({
                        enableBuiltInResolver: dnsProvider !== "off",
                        secureDnsMode: dnsProvider === "off" ? "off" : "automatic",
                        enableHappyEyeballs: true,
                        ...(dohServer ? { secureDnsServers: [dohServer] } : {}),
                    });
                    await this.createWindow();
                    /*
                     * Les versions viennent du dépôt de Nebula, donc en chercher une est
                     * sans danger. L'attente laisse la fenêtre s'ouvrir : la notification
                     * est pour la personne qui la lit, pas pour un client qui démarre.
                     */
                    if (this.config.config.auto_check_updates) {
                        setTimeout(() => {
                            this.checkingForUpdates().catch(e => {
                                this.logger.error("Recherche de mise à jour impossible:", e);
                            });
                        }, 10_000).unref();
                    }
                    app.on("activate", () => {
                        if (BrowserWindow.getAllWindows().length === 0) {
                            void this.createWindow().catch(error => this.startupFailed(error));
                        } else {
                            this.showApp();
                        }
                    });
                })
                .catch(error => this.startupFailed(error));
        }

        // Create context menu
        contextMenu({
            showLearnSpelling: false,
            showSearchWithGoogle: false,
            showCopyImageAddress: true,
            showInspectElement: true,
            showSaveImage: true,
            showSaveImageAs: true,
            showSaveVideo: true,
            showSaveVideoAs: true,
        });

        setupIPCEvents(this);
    }
    get discordSession () {
        if (this.customDiscordSession) {
            return this.customDiscordSession;
        } else {
            return session.defaultSession;
        }
    }
    async sessionPatch () {
        // Disable stripe.com
        this.discordSession.webRequest.onBeforeRequest(
            {
                urls: [
                    "https://*.stripe.com/*",
                    `https://cdn.discordapp.com/avatars/${Constants.UserIdDefault}/*`,
                    `https://cdn.discordapp.com/banners/${Constants.UserIdDefault}/*`,
                    "https://cdn.discordapp.com/badge-icons/nebulacreator*",
                    `https://cdn.discordapp.com/emojis/${Constants.DiscordEmojiId}*`,
                    `https://cdn.discordapp.com/emojis/${Constants.GithubEmojiId}*`,
                    `https://cdn.discordapp.com/emojis/${Constants.SiteEmojiId}*`,
                ],
            },
            (details, callback) => {
                const branding = brandingFileFor(details.url);
                if (branding) {
                    return callback({
                        redirectURL: `https://${Constants.CustomDiscordDomain}/__botclient/assets/${branding}`,
                    });
                }
                // Cancel all requests to stripe.com
                callback({
                    cancel: true,
                });
            },
        );
        /*
        // Rule 1: Remove all CSP headers
        this.discordSession.webRequest.onHeadersReceived(
            { urls: ["<all_urls>"], types: ["mainFrame", "subFrame"] },
            (details, callback) => {
                if (!details.responseHeaders) {
                    return callback({ responseHeaders: details.responseHeaders });
                }
                // Remove both CSP and CSP-report-only
                delete details.responseHeaders["content-security-policy"];
                delete details.responseHeaders["Content-Security-Policy"];
                delete details.responseHeaders["content-security-policy-report-only"];
                delete details.responseHeaders["Content-Security-Policy-Report-Only"];
                callback({ responseHeaders: details.responseHeaders });
            },
        );
        */
        // Rule 2: Force CSS content-type on GitHub raw URLs
        this.discordSession.webRequest.onHeadersReceived(
            {
                urls: ["https://raw.githubusercontent.com/*"],
                types: ["stylesheet"],
            },
            (details, callback) => {
                if (!details.responseHeaders) {
                    return callback({ responseHeaders: details.responseHeaders });
                }
                const url = new URL(details.url);
                if (url.pathname.endsWith(".css")) {
                    // Override Content-Type
                    details.responseHeaders["content-type"] = ["text/css"];
                }
                callback({ responseHeaders: details.responseHeaders });
            },
        );
        // Load Vencord-Web Extension
        const extension = await this.discordSession.extensions.loadExtension(Constants.VencordExtensionPath);
        this.logger.info(`Loaded Vencord Extension v${extension.version} from ${Constants.VencordExtensionPath}`);
    }
    async createWindow () {
        this.setupTray();
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        // Create the browser window.
        this.appWindow = new BrowserWindow({
            show: false,
            width: Math.floor(width * 0.9),
            height: Math.floor(height * 0.9),
            minWidth: 940,
            minHeight: 500,
            icon: Constants.icon128,
            webPreferences: {
                webSecurity: true,
                sandbox: true,
                contextIsolation: true,
                nodeIntegration: false,
                preload: path.join(__dirname, "Preloads", "ElectronPreload.js"),
                session: this.discordSession,
            },
            backgroundColor: "#36393f",
            titleBarStyle: "hidden",
            frame: false,
            title: Constants.AppName,
            trafficLightPosition: { x: 10, y: 10 },
        });
        this.discordWebContents = this.appWindow.webContents;
        this.captureRendererLogs(this.appWindow);
        this.keepStorageOnDisk();
        this.startGameDetection();
        // BrowserWindow Event
        this.appWindow.on("close", event => {
            if (!this.#shouldQuitApp) {
                event.preventDefault();
                this.appWindow.hide();
            }
        });
        this.appWindow.on("focus", () => {
            this.appWindow.flashFrame(false);
        });

        this.startupWindow?.loading();
        const contents = this.discordWebContents;
        contents.on("did-fail-load", (_event, code, _description, _url, isMainFrame) => {
            if (isMainFrame && code !== -3 && this.startupWindow) {
                this.startupWindow.fail("Impossible de charger Nebula. Vérifie ta connexion et réessaie.");
            }
        });
        contents.on("render-process-gone", () => {
            if (this.startupWindow) this.startupWindow.fail("Nebula s’est arrêtée pendant le démarrage. Réessaie.");
        });
        await this.sessionPatch();

        this.logger.info(`Electron UserData: ${app.getPath("userData")}`);
        const mainOrigin = `https://${Constants.CustomDiscordDomain}`;
        const isMainOrigin = (url: string) => {
            try {
                return new URL(url).origin === mainOrigin;
            } catch {
                return false;
            }
        };
        this.discordSession.setPermissionRequestHandler((requester, permission, callback, details) => {
            if (requester !== contents || !("requestingUrl" in details) || !isMainOrigin(details.requestingUrl)) {
                return callback(false);
            }
            const decision = decidePermission(permission, details as { mediaTypes?: string[] });
            if (decision === "refuse") return callback(false);
            if (decision === "accorde") return callback(true);
            if (process.platform === "darwin") {
                void systemPreferences.askForMediaAccess("microphone").then(callback, () => callback(false));
            } else {
                callback(true);
            }
        });
        this.discordSession.setPermissionCheckHandler((requester, permission, origin, details) => {
            if (origin !== mainOrigin) return false;
            if (permission === "notifications") return true;
            if (requester !== contents || !details.isMainFrame) return false;
            // Media checks must reach the request handler, where camera is rejected.
            return ["fullscreen", "clipboard-sanitized-write", "loopback-network"].includes(permission);
        });
        contents.on("will-navigate", (event, url) => {
            if (!isMainOrigin(url)) return event.preventDefault();
            /*
             * Une invitation ouverte sur place mène à la page « Discord App Detected »,
             * qui propose d'ouvrir une application de bureau : un cul-de-sac, puisque
             * Nebula *est* l'application. Le code est repris du lien et rendu au client,
             * qui montre l'invitation comme pour un lien reçu dans un message. Le même
             * détour existait déjà pour les liens ouverts dans une nouvelle fenêtre.
             */
            const invite = inviteCodeFrom(url);
            if (invite) {
                event.preventDefault();
                this.discordWebContents.send(IPCEvent.OpenInvite, invite);
            }
        });
        // Discord popout
        this.discordWebContents.setWindowOpenHandler(({ url }) => {
            this.logger.log("WindowOpenHandler", url);
            switch (url) {
                case "about:blank":
                    return {
                        action: "allow",
                        overrideBrowserWindowOptions: {
                            icon: Constants.icon128,
                            frame: true,
                            autoHideMenuBar: true,
                            width: 1080,
                            height: 720,
                            webPreferences: {
                                webSecurity: true,
                                sandbox: true,
                                contextIsolation: true,
                                nodeIntegration: false,
                            },
                        },
                    };
                case "https://discord.com/popout":
                case "https://ptb.discord.com/popout":
                case "https://canary.discord.com/popout":
                case `https://localhost:${this.port}/popout`:
                    return {
                        action: "allow",
                        overrideBrowserWindowOptions: {
                            icon: Constants.icon128,
                            frame: true,
                            autoHideMenuBar: true,
                            width: 1080,
                            height: 720,
                            // titleBarStyle: "hidden",
                            webPreferences: {
                                webSecurity: true,
                                sandbox: true,
                                contextIsolation: true,
                                nodeIntegration: false,
                            },
                        },
                    };
            }

            if (
                [
                    "https://checkout.paypal.com/web",
                    "https://discord.com/connections",
                    "https://ptb.discord.com/connections",
                    "https://canary.discord.com/connections",
                    `https://localhost:${this.port}/connections`,
                ].some(e => url.includes(e))
            ) {
                return { action: "deny" };
            }

            const invite = inviteCodeFrom(url);
            if (invite) {
                this.appWindow.webContents.send(IPCEvent.OpenInvite, invite);
                return { action: "deny" };
            }

            if (this.copyInviteInstead(url, this.appWindow.webContents)) return { action: "deny" };

            let protocolHandle: string;

            try {
                protocolHandle = new URL(url).protocol;
            } catch {
                return { action: "deny" };
            }

            switch (protocolHandle) {
                case "http:":
                case "https:":
                case "mailto:":
                case "steam:":
                case "spotify:":
                    shell.openExternal(url);
            }

            return { action: "deny" };
        });
        // WebContents Event
        this.discordWebContents
            .on("did-create-window", (window, details) => {
                window.show();
                window.webContents.on("will-navigate", (event, url) => {
                    if (!isAllowedPopoutURL(url, this.port)) event.preventDefault();
                });
                window.on("closed", () => {
                    this.childWindows.delete(details.frameName);
                });
                this.childWindows.get(details.frameName)?.close();
                this.childWindows.set(details.frameName, window);
            })
            .on("did-start-loading", () => {
                this.appWindow.setProgressBar(2, { mode: "indeterminate" });
            })
            .on("did-stop-loading", () => {
                this.appWindow.setTitle(Constants.AppName);
                this.appWindow.setProgressBar(-1);
            });

        // Like Vesktop, only a successful navigation promise completes startup.
        await contents.loadURL(`https://${Constants.CustomDiscordDomain}`);
        if (this.#shouldQuitApp || contents.isDestroyed()) return;
        if (this.startupWindow && !await this.startupWindow.waitForAnimation(() => {
            if (!this.#shouldQuitApp && !contents.isDestroyed()) this.appWindow.showInactive();
        })) return;
        if (this.#shouldQuitApp || contents.isDestroyed()) return;
        this.appWindow.show();
        this.startupWindow?.finish();
        this.startupWindow = undefined;
        if (!app.isPackaged) contents.openDevTools();
    }
    showApp () {
        if (this.startupWindow) {
            this.startupWindow.show();
        } else if (this.appWindow && !this.appWindow.isDestroyed()) {
            this.appWindow.show();
            this.appWindow.setSkipTaskbar(false);
        }
    }
    private async startupFailed (error: unknown) {
        if (this.#shouldQuitApp) return;
        this.logger.error("Startup failed", error);
        await app.whenReady();
        this.startupWindow ??= new StartupWindow(
            () => this.relaunch(),
            () => this.quit(),
            this.config.config.startup_animation,
        );
        this.startupWindow.fail("Nebula n’a pas pu démarrer. Réessaie.");
    }
    showNotification (options: NotificationConstructorOptions, callback?: () => unknown) {
        const notif = new Notification(options);
        function handleClick () {
            notif.close();
            if (callback && typeof callback === "function") callback();
        }
        if (callback && typeof callback === "function") notif.once("click", handleClick);
        setTimeout(() => {
            notif.close();
            notif.removeListener("click", handleClick);
        }, 15000).unref();
        notif.show();
    }
    /**
     * Where the update stands, so the Nebula tab can show it rather than leaving the
     * person guessing. Every window is told, since each one has its own settings page.
     */
    updateState: UpdateState = { state: "idle" };

    setUpdateState (next: UpdateState) {
        this.updateState = next;
        for (const window of BrowserWindow.getAllWindows()) {
            if (window.isDestroyed()) continue;
            window.webContents.send(IPCEvent.UpdateState, next);
        }
    }

    checkingForUpdates (forceEmitted = false) {
        if (!app.isPackaged) {
            // autoUpdater.forceDevUpdateConfig = true; // ! Test
            if (forceEmitted) {
                this.showNotification({
                    title: "Gestionnaire de mises à jour",
                    body: "Les mises à jour automatiques sont désactivées en mode développement.",
                    silent: false,
                });
            }
            this.setUpdateState({
                state: "error",
                message: "Les mises à jour ne fonctionnent qu'une fois Nebula installée.",
            });
            return Promise.resolve(false);
        }

        this.setUpdateState({ state: "checking" });
        autoUpdater.logger = scope("AutoUpdater");
        autoUpdater.disableWebInstaller = true;

        // Auto download only on Windows and Linux
        // Mac requires code signing for auto-update to work properly
        autoUpdater.autoDownload = process.platform !== "darwin";

        autoUpdater.removeAllListeners();

        return new Promise(resolve => {
            autoUpdater.on("update-available", info => {
                this.setUpdateState({ state: "available", version: info.version });
                const releaseUrl = `https://github.com/${Constants.GithubRepo}/releases/tag/v${info.version}`;

                if (process.platform === "darwin") {
                    this.showNotification(
                        {
                            title: `Nouvelle version disponible : ${info.version}`,
                            body: "Merci de télécharger la nouvelle version manuellement (macOS)",
                            silent: false,
                        },
                        () => {
                            shell.openExternal(releaseUrl);
                        },
                    );
                    resolve(true);
                    return;
                }

                this.showNotification(
                    {
                        title: "Gestionnaire de mises à jour",
                        body: `Une nouvelle version (${info.version}) est disponible et se télécharge en arrière-plan.`,
                        silent: false,
                    },
                    () => {
                        shell.openExternal(releaseUrl);
                    },
                );
            });

            autoUpdater.on("update-not-available", info => {
                this.setUpdateState({ state: "up-to-date", version: app.getVersion() });
                if (forceEmitted) {
                    this.showNotification({
                        title: "Gestionnaire de mises à jour",
                        body: `Tu utilises déjà la dernière version (v${app.getVersion()})`,
                        silent: false,
                    });
                }
                resolve(true);
            });

            autoUpdater.on("error", err => {
                // Only log error, show notification if forced
                this.logger.error("Error in auto-updater: " + err);
                this.setUpdateState({ state: "error", message: err.message });
                if (forceEmitted) {
                    this.showNotification(
                        {
                            title: "Gestionnaire de mises à jour",
                            body: `Erreur lors de la recherche de mises à jour : ${err.message}`,
                            silent: false,
                        },
                        () => {
                            shell.openExternal(`https://github.com/${Constants.GithubRepo}/releases`);
                        },
                    );
                }
                resolve(false);
            });

            autoUpdater.on("download-progress", progressObj => {
                const percent = Math.round(progressObj.percent);
                this.setUpdateState({ state: "downloading", percent, version: this.updateState.version });
                this.logger.debug(`Downloaded ${percent}%`);
                if (this.tray && !this.tray.isDestroyed()) {
                    this.tray.setToolTip(`${Constants.AppName} v${app.getVersion()} - Téléchargement : ${percent}%`);
                }
            });

            autoUpdater.on("update-downloaded", info => {
                this.setUpdateState({ state: "ready", version: info.version, percent: 100 });
                if (this.tray && !this.tray.isDestroyed()) {
                    this.tray.setToolTip(`${Constants.AppName} v${app.getVersion()}`);
                }

                dialog
                    .showMessageBox(this.appWindow, {
                        type: "info",
                        title: "Mise à jour prête",
                        message: `La version ${info.version} a été téléchargée. Redémarrer l’application pour l’appliquer ?`,
                        buttons: ["Redémarrer", "Plus tard"],
                    })
                    .then(returnValue => {
                        if (returnValue.response === 0) autoUpdater.quitAndInstall(true, true);
                    });
                resolve(true);
            });

            autoUpdater.checkForUpdates();
        });
    }
    relaunch () {
        this.#shouldQuitApp = true;
        app.relaunch();
        app.quit();
    }
    quit () {
        this.#shouldQuitApp = true;
        app.quit();
    }
    // Editor Window
    /** Watch the running processes and tell every open client window about the games found */
    startGameDetection () {
        const clientWindows = () => [this.appWindow, ...this.accountWindows.values()];
        GameDetection.start(
            (games, added, removed) => {
                for (const win of clientWindows()) {
                    if (!win || win.isDestroyed()) continue;
                    win.webContents.send(IPCEvent.RunningGamesChanged, games, added, removed);
                }
            },
            // Nothing to publish to while every window is hidden in the tray
            () => clientWindows().some(win => win && !win.isDestroyed() && win.isVisible()),
        );
    }

    /**
     * Saved private channels live in the browser storage of the session. Chromium only
     * writes them out lazily, so a machine that restarts without the app quitting
     * cleanly loses the most recent ones. Flush regularly and on the way out.
     */
    keepStorageOnDisk () {
        const flush = async () => {
            try {
                await this.discordSession.flushStorageData();
            } catch (e) {
                this.logger.debug("Impossible d'écrire le stockage sur le disque:", e);
            }
        };
        // Every five minutes is enough: the events below cover the cases that matter
        const timer = setInterval(flush, 300_000);
        timer.unref?.();
        this.appWindow.on("hide", flush);
        this.appWindow.webContents.on("render-process-gone", flush);
        app.on("before-quit", flush);
        powerMonitor.on("shutdown", flush);
        powerMonitor.on("suspend", flush);
    }

    /**
     * Mirror the client's own errors into the application log, so a crash inside
     * the Discord window can be diagnosed without opening the DevTools.
     */
    captureRendererLogs (win: BrowserWindow) {
        const rendererLogger = scope("Renderer");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        win.webContents.on("console-message" as any, (details: any) => {
            const level = details?.level ?? details?.levelName;
            const message = String(details?.message ?? details ?? "");
            const where = details?.sourceId ? ` (${details.sourceId}:${details.lineNumber})` : "";
            const grave = level === "error" || level === "warning" || level === 3 || level === 2;
            /*
             * Le journal ne recevait que les erreurs du client. Les messages que Nebula
             * écrit elle-même pour expliquer ce qu'elle fait — reconnexion à un compte,
             * fermeture de la passerelle, qualité du partage — n'y arrivaient donc jamais,
             * alors que ce sont eux qu'on vient y chercher. Ils passent maintenant ; le
             * bavardage de Discord, lui, reste dehors.
             */
            const deNebula = /Nebula/i.test(message);
            if (!grave && !deNebula) return;
            if (grave) rendererLogger.error(`${message}${where}`);
            else rendererLogger.info(message);
        });
        win.webContents.on("render-process-gone", (event, details) => {
            rendererLogger.error("Le processus de rendu s'est arrêté:", details.reason, details.exitCode);
        });
        win.webContents.on("preload-error", (event, preloadPath, error) => {
            rendererLogger.error("Erreur dans le preload", preloadPath, error);
        });
    }

    /**
     * Apply to a freshly created session the same rules the main one gets:
     * the Vencord extension, the branding redirects and the stripe block.
     */
    async prepareAccountSession (target: Electron.Session) {
        installScreenShare(target, this.logger);
        target.webRequest.onBeforeRequest(
            {
                urls: [
                    "https://*.stripe.com/*",
                    `https://cdn.discordapp.com/avatars/${Constants.UserIdDefault}/*`,
                    `https://cdn.discordapp.com/banners/${Constants.UserIdDefault}/*`,
                    "https://cdn.discordapp.com/badge-icons/nebulacreator*",
                    `https://cdn.discordapp.com/emojis/${Constants.DiscordEmojiId}*`,
                    `https://cdn.discordapp.com/emojis/${Constants.GithubEmojiId}*`,
                    `https://cdn.discordapp.com/emojis/${Constants.SiteEmojiId}*`,
                ],
            },
            (details, callback) => {
                const branding = brandingFileFor(details.url);
                if (branding) {
                    return callback({
                        redirectURL: `https://${Constants.CustomDiscordDomain}/__botclient/assets/${branding}`,
                    });
                }
                callback({ cancel: true });
            },
        );
        try {
            await target.extensions.loadExtension(Constants.VencordExtensionPath);
        } catch (e) {
            this.logger.error("Impossible de charger l'extension Vencord dans la session du compte:", e);
        }
    }

    /**
     * A brand new, empty Discord window with its own session: it opens on the login
     * screen, so any account or bot can be signed into it alongside the others.
     */

    /**
     * Au tout premier lancement, demander la langue avant tout le reste.
     *
     * Le choix est enregistré, et « langue_choisie » retient que la question a été
     * posée : le remettre à faux dans config.json rouvre l'écran au lancement suivant.
     * Si les réglages ne peuvent pas être écrits, la question n'est pas posée — elle
     * reviendrait à chaque démarrage sans jamais pouvoir être retenue.
     */
    private async chooseLanguageIfNeeded () {
        if (this.config.config.langue_choisie) return;
        if (this.config.snapshot().readOnly) return;
        try {
            const langue = await askLanguage();
            this.config.save({ ...this.config.config, langue, langue_choisie: true });
            this.logger.info(`Langue choisie au premier lancement : ${langue}`);
        } catch (error) {
            this.logger.warn("Le choix de la langue a échoué, le français est gardé", error);
        }
    }

    async openBlankClientWindow () {
        return this.openClientWindow(null);
    }

    /**
     * Open a dedicated window already logged into the given account, so several
     * accounts can be used side by side. Each one gets its own session.
     */
    async openClientWindow (token: string | null) {
        // A token we do not know as a user account is a bot: remember it so it is listed too
        if (token && !UserAuth.isUserToken(token)) {
            await UserAuth.storeBot(token);
            this.setupTray();
        }
        const accountId = (token && Util.getIDFromToken(token)) || randomUUID();
        const existing = this.accountWindows.get(accountId);
        if (existing && !existing.isDestroyed()) {
            existing.show();
            existing.focus();
            return true;
        }
        const accountSession = session.fromPartition(`persist:nebula_account_${accountId}`);
        await this.prepareAccountSession(accountSession);
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        const win = new BrowserWindow({
            width: Math.floor(width * 0.8),
            height: Math.floor(height * 0.8),
            minWidth: 940,
            minHeight: 500,
            icon: Constants.icon128,
            webPreferences: {
                webSecurity: false,
                sandbox: false,
                preload: path.join(__dirname, "Preloads", "ElectronPreload.js"),
                session: accountSession,
            },
            backgroundColor: Constants.DiscordBackgroundColor,
            title: Constants.AppName,
            // Same chrome as the main window: Discord draws its own title bar
            titleBarStyle: "hidden",
            frame: false,
            trafficLightPosition: { x: 10, y: 10 },
        });
        this.accountWindows.set(accountId, win);
        win.on("closed", () => {
            this.accountWindows.delete(accountId);
        });
        this.captureRendererLogs(win);
        if (token) {
            win.webContents.once("did-finish-load", async () => {
                try {
                    await this.injectToken(win, token);
                    this.logger.info(`Jeton injecté dans la fenêtre du compte ${accountId}`);
                } catch (e) {
                    this.logger.error("Impossible d'injecter le jeton dans la nouvelle fenêtre:", e);
                }
                win.reload();
            });
        }
        await win.loadURL(`https://${Constants.CustomDiscordDomain}/app`);
        this.accountWindow?.close();
        return true;
    }

    /**
     * Discord deletes `window.localStorage`, so the token is written through an iframe.
     */
    async injectToken (win: BrowserWindow, token: string) {
        await win.webContents.executeJavaScript(
            `(() => {
                const frame = document.createElement("iframe");
                document.body.appendChild(frame);
                frame.contentWindow.localStorage.setItem("token", ${JSON.stringify(JSON.stringify(token))});
                frame.remove();
            })()`,
        );
    }

    /**
     * The welcome message's invite cannot be joined from a browser, which knows nothing
     * of the account signed in here. Rather than open a page that leads nowhere, the
     * link is copied and the window is told to say so.
     */
    copyInviteInstead (url: string, sender: Electron.WebContents) {
        if (!url.startsWith(Constants.CopyInviteUrl)) return false;
        clipboard.writeText(Constants.SupportInvite);
        sender.send(IPCEvent.SupportInviteCopied, Constants.SupportInvite);
        return true;
    }

    openAccountLoginWindow (requestedBy?: BrowserWindow) {
        this.accountLoginTarget = requestedBy;
        if (this.accountWindow && !this.accountWindow.isDestroyed()) {
            this.accountWindow.show();
            this.accountWindow.focus();
            return;
        }
        this.accountWindow = new BrowserWindow({
            width: 560,
            height: 760,
            minWidth: 480,
            minHeight: 600,
            title: `${Constants.AppName} - Account Login`,
            backgroundColor: Constants.DiscordBackgroundColor,
            webPreferences: {
                webSecurity: false,
                sandbox: false,
                preload: path.join(__dirname, "Preloads", "AccountLoginPreload.js"),
            },
            icon: Constants.icon128,
            frame: true,
            autoHideMenuBar: true,
        });
        this.accountWindow.loadFile(Constants.AccountLoginHTMLPath);
        this.accountWindow.on("closed", () => {
            this.accountWindow = undefined;
            this.accountLoginTarget = undefined;
        });
    }

    /**
     * Show the captcha challenge Discord asked for, served from the Discord origin
     * so hCaptcha accepts the sitekey. Resolves with the captcha key, or null.
     */
    openCaptchaWindow (sitekey: string, rqdata: string | null): Promise<string | null> {
        return new Promise(resolve => {
            const captchaWindow = new BrowserWindow({
                width: 480,
                height: 620,
                title: "Discord - Captcha",
                parent: this.accountWindow,
                modal: Boolean(this.accountWindow),
                backgroundColor: Constants.DiscordBackgroundColor,
                webPreferences: {
                    webSecurity: false,
                    sandbox: false,
                    preload: path.join(__dirname, "Preloads", "AccountLoginPreload.js"),
                },
                icon: Constants.icon128,
                frame: true,
                autoHideMenuBar: true,
            });
            let settled = false;
            const finish = (token: string | null) => {
                if (settled) return;
                settled = true;
                resolve(token);
                if (!captchaWindow.isDestroyed()) captchaWindow.close();
            };
            captchaWindow.webContents.ipc.once(IPCEvent.AccountCaptchaResult, (event, token: string | null) => {
                finish(token);
            });
            captchaWindow.on("closed", () => finish(null));
            const query = new URLSearchParams({ sitekey, ...(rqdata ? { rqdata } : {}) });
            captchaWindow.loadURL(`https://${Constants.CustomDiscordDomain}/__botclient/captcha?${query}`);
        });
    }

    /**
     * Log the main Discord window into a user account token.
     * Discord deletes `window.localStorage`, so it is reached through an iframe.
     */
    async loginWithUserToken (token: string) {
        // The account belongs to whichever client window opened the login window:
        // signing in from a second window must not hijack the first one
        const target =
            this.accountLoginTarget && !this.accountLoginTarget.isDestroyed() ? this.accountLoginTarget : this.appWindow;
        if (!target || target.isDestroyed()) return false;
        await this.injectToken(target, token);
        target.reload();
        target.show();
        target.focus();
        this.accountWindow?.close();
        return true;
    }

    openSettingsWindow () {
        if (this.settingsWindow && !this.settingsWindow.window.isDestroyed()) {
            this.settingsWindow.show();
            return;
        }
        this.settingsWindow = new SettingsWindow(this.config);
        this.settingsWindow.window.on("closed", () => {
            this.settingsWindow = undefined;
        });
    }

    openDiscordMessageEditorWindow () {
        new MessageEditorWindow(this.appWindow, this.discordWebContents);
    }

    get app () {
        return app;
    }
}
