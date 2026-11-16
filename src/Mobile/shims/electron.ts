/* Copyright Elysia © 2025. All rights reserved */

/*
 * Le calque Electron du portage Android.
 *
 * Le serveur de Voidcord — APIServer, les 133 routes, UserAuth, Config — ne demande
 * qu'une petite partie d'Electron : `net.fetch`, `net.request`, `app.getPath`,
 * `app.getVersion`, `app.getAppPath` et un `nativeImage` de façade. Tout le reste
 * (fenêtres, plateau, menus) n'existe pas sur un téléphone : il est remplacé par des
 * objets inertes, pour que le même code tourne sans être réécrit.
 *
 * `scripts/buildMobile.mjs` substitue ce module à `electron` au moment du bundle.
 */

import { EventEmitter } from "events";
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import { Readable } from "stream";
import zlib from "zlib";

import { annoncer } from "../bus";

function environnement () {
    return {
        /** Dossier des fichiers de l'application : racine de `assets/`, `build/`. */
        appPath: process.env.VOIDCORD_APP_PATH ?? process.cwd(),
        /** Dossier inscriptible, équivalent de `app.getPath("userData")`. */
        userData: process.env.VOIDCORD_USER_DATA ?? path.join(process.cwd(), "userData"),
        /** Version affichée par Voidcord, lue depuis le `versionName` de l'APK. */
        version: process.env.VOIDCORD_VERSION ?? "0.0.0",
    };
}

const env = environnement();

fs.mkdirSync(env.userData, { recursive: true });

const dossiers: Record<string, string> = {
    home: env.userData,
    appData: env.userData,
    userData: env.userData,
    sessionData: path.join(env.userData, "session"),
    temp: process.env.TMPDIR ?? path.join(env.userData, "tmp"),
    exe: path.join(env.appPath, "voidcord"),
    module: env.appPath,
    desktop: env.userData,
    documents: env.userData,
    downloads: env.userData,
    music: env.userData,
    pictures: env.userData,
    videos: env.userData,
    logs: path.join(env.userData, "logs"),
    crashDumps: path.join(env.userData, "crash"),
    recent: env.userData,
};

class App extends EventEmitter {
    isPackaged = true;
    commandLine = {
        appendSwitch () {},
        appendArgument () {},
        hasSwitch: () => false,
        getSwitchValue: () => "",
    };
    dock = { hide () {}, show () {}, setBadge () {} };

    getPath (name: string) {
        const dossier = dossiers[name] ?? path.join(env.userData, name);
        fs.mkdirSync(dossier, { recursive: true });
        return dossier;
    }
    getAppPath () {
        return env.appPath;
    }
    getVersion () {
        return env.version;
    }
    getName () {
        return "Voidcord";
    }
    get name () {
        return "Voidcord";
    }
    getLocale () {
        return process.env.VOIDCORD_LOCALE ?? "fr-FR";
    }
    getSystemLocale () {
        return this.getLocale();
    }
    isReady () {
        return true;
    }
    whenReady () {
        return Promise.resolve();
    }
    quit () {
        process.exit(0);
    }
    exit (code = 0) {
        process.exit(code);
    }
    relaunch () {
        /* Le relancement est l'affaire de l'activité Android. */
    }
    requestSingleInstanceLock () {
        return true;
    }
    setAppUserModelId () {}
    setLoginItemSettings () {}
    getLoginItemSettings () {
        return { openAtLogin: false };
    }
}

export const app = new App();

/*
 * `net.request` d'Electron décompresse la réponse de lui-même, et `Util.proxy` compte
 * là-dessus : il retire `content-encoding` des en-têtes qu'il recopie. Avec le `https`
 * de Node il faut décompresser à la main, sinon le client reçoit du gzip annoncé comme
 * du texte brut — une page blanche, sans message d'erreur.
 */
/*
 * Les connexions sont gardées ouvertes, et c'est ce qui rend le client utilisable.
 *
 * Tout ce que le client demande à Discord passe par `Util.proxy`, donc par ce module.
 * Ouvrir les réglages, par exemple, déclenche cinq cents requêtes. Or le Node de
 * nodejs-mobile est un Node 18, où `keepAlive` est encore désactivé par défaut : chaque
 * requête rouvrait une connexion et refaisait une poignée de main TLS complète vers
 * Discord. Sur un téléphone, en mobile, cela se comptait en dizaines de secondes — et
 * aucune requête ne paraissait lente, puisque le temps était perdu cinq cents fois.
 *
 * Electron n'avait pas ce problème : la pile réseau de Chromium garde ses connexions.
 */
const connexions = {
    http: new http.Agent({ keepAlive: true, keepAliveMsecs: 15_000, maxSockets: 24 }),
    https: new https.Agent({ keepAlive: true, keepAliveMsecs: 15_000, maxSockets: 24 }),
};

class ClientRequest extends EventEmitter {
    private requete: http.ClientRequest;

    constructor (options: { method?: string; url: string } | string) {
        super();
        const opts = typeof options === "string" ? { url: options, method: "GET" } : options;
        const cible = new URL(opts.url);
        const enClair = cible.protocol === "http:";
        const transport = enClair ? http : https;
        this.requete = transport.request(
            cible,
            { method: opts.method ?? "GET", agent: enClair ? connexions.http : connexions.https },
            reponse => this.repondre(reponse),
        );
        this.requete.setHeader("accept-encoding", "gzip, deflate, br");
        this.requete.on("error", error => this.emit("error", error));
    }

    private repondre (reponse: http.IncomingMessage) {
        const codage = String(reponse.headers["content-encoding"] ?? "").toLowerCase();
        let flux: Readable = reponse;
        if (codage === "gzip") flux = reponse.pipe(zlib.createGunzip());
        else if (codage === "deflate") flux = reponse.pipe(zlib.createInflate());
        else if (codage === "br") flux = reponse.pipe(zlib.createBrotliDecompress());

        const vue = new EventEmitter() as EventEmitter & {
            statusCode: number;
            statusMessage: string;
            headers: http.IncomingHttpHeaders;
        };
        vue.statusCode = reponse.statusCode ?? 502;
        vue.statusMessage = reponse.statusMessage ?? "";
        vue.headers = reponse.headers;
        flux.on("data", chunk => vue.emit("data", chunk));
        flux.on("end", () => vue.emit("end"));
        flux.on("error", error => vue.emit("error", error));
        this.emit("response", vue);
    }

    setHeader (nom: string, valeur: string | string[]) {
        this.requete.setHeader(nom, valeur);
    }
    getHeader (nom: string) {
        return this.requete.getHeader(nom);
    }
    removeHeader (nom: string) {
        this.requete.removeHeader(nom);
    }
    /** `req.pipe(electronReq)` passe par `write` / `end`, comme un flux inscriptible. */
    write (chunk: unknown, encoding?: unknown, callback?: unknown) {
        return this.requete.write(chunk as Buffer, encoding as BufferEncoding, callback as () => void);
    }
    end (chunk?: unknown) {
        return chunk === undefined ? this.requete.end() : this.requete.end(chunk as Buffer);
    }
    abort () {
        this.requete.destroy();
    }
    get writable () {
        return this.requete.writable;
    }
    /** Les flux Node écoutent `drain`, `close` et `finish` sur la cible d'un `pipe`. */
    override on (event: string, listener: (...args: never[]) => void) {
        if (["drain", "close", "finish", "unpipe"].includes(event)) {
            this.requete.on(event, listener as () => void);
            return this;
        }
        return super.on(event, listener as () => void);
    }
    override once (event: string, listener: (...args: never[]) => void) {
        if (["drain", "close", "finish", "unpipe"].includes(event)) {
            this.requete.once(event, listener as () => void);
            return this;
        }
        return super.once(event, listener as () => void);
    }
}

/*
 * Le pot à cookies.
 *
 * `net.fetch` d'Electron passe par la session de Chromium : il reçoit les cookies d'une
 * réponse et les renvoie à la suivante, sans qu'on ait à s'en occuper. Le `fetch` de Node
 * n'a rien de tel — chaque requête part nue.
 *
 * Cela ne se voit qu'à un endroit, mais il est décisif : la connexion par compte. Discord
 * pose des cookies d'appareil (`__dcfduid`, `__sdcfduid`) en répondant à `/auth/login`, et
 * lie le ticket de vérification en deux étapes à ces cookies. Sans eux, `/auth/mfa/totp`
 * refuse un code pourtant juste, avec « Invalid two-factor code » — le message qui ferait
 * croire à une erreur de frappe.
 *
 * Les cookies vivent en mémoire, pour la durée de l'application : c'est ce que fait la
 * session de Chromium, et ils n'ont pas à survivre à une fermeture.
 */
const bocauxParHote = new Map<string, Map<string, string>>();

function bocal (hote: string) {
    // `canary.discord.com` et `discord.com` partagent les cookies posés sur le domaine.
    const domaine = hote.split(".").slice(-2).join(".");
    let pot = bocauxParHote.get(domaine);
    if (!pot) bocauxParHote.set(domaine, (pot = new Map()));
    return pot;
}

function lireLesCookies (entetes: Headers): string[] {
    const avecMethode = entetes as Headers & { getSetCookie?: () => string[] };
    if (typeof avecMethode.getSetCookie === "function") return avecMethode.getSetCookie();
    const unique = entetes.get("set-cookie");
    return unique ? [unique] : [];
}

function rangerLesCookies (hote: string, entetes: Headers) {
    const pot = bocal(hote);
    for (const brut of lireLesCookies(entetes)) {
        const [paire] = brut.split(";");
        const separateur = paire.indexOf("=");
        if (separateur <= 0) continue;
        pot.set(paire.slice(0, separateur).trim(), paire.slice(separateur + 1).trim());
    }
}

function cookiesPour (hote: string) {
    const pot = bocal(hote);
    if (pot.size === 0) return null;
    return [...pot].map(([nom, valeur]) => `${nom}=${valeur}`).join("; ");
}

async function fetchAvecCookies (input: string, init: RequestInit = {}) {
    const hote = new URL(input).hostname;
    const entetes = new Headers(init.headers as HeadersInit | undefined);
    const dejaLa = cookiesPour(hote);
    if (dejaLa && !entetes.has("cookie")) entetes.set("cookie", dejaLa);

    const reponse = await fetch(input, { ...init, headers: entetes });
    rangerLesCookies(hote, reponse.headers);
    return reponse;
}

export const net = {
    fetch: (input: string, init?: RequestInit) => fetchAvecCookies(input, init),
    request: (options: { method?: string; url: string } | string) => new ClientRequest(options),
    isOnline: () => true,
    resolveHost: (nom: string) => Promise.resolve({ endpoints: [{ address: nom, family: "ipv4" }] }),
};

/** Les icônes servent au plateau et aux fenêtres, qui n'existent pas ici. */
const imageVide = {
    isEmpty: () => true,
    resize: () => imageVide,
    toPNG: () => Buffer.alloc(0),
    toDataURL: () => "",
    getSize: () => ({ width: 0, height: 0 }),
};
export const nativeImage = {
    createEmpty: () => imageVide,
    createFromPath: () => imageVide,
    createFromBuffer: () => imageVide,
    createFromDataURL: () => imageVide,
};

/*
 * Ce qui suit n'a pas d'équivalent sur Android. Les objets répondent sans rien faire
 * plutôt que de manquer : une route qui les touche renvoie une réponse vide au lieu de
 * faire tomber le serveur.
 */
export const ipcMain = {
    on: () => ipcMain,
    once: () => ipcMain,
    handle: () => {},
    handleOnce: () => {},
    removeHandler: () => {},
    removeAllListeners: () => ipcMain,
    emit: () => false,
};

const contenuWebInerte = {
    send: () => {},
    on: () => {},
    once: () => {},
    session: { webRequest: { onBeforeRequest: () => {}, onHeadersReceived: () => {} } },
    setWindowOpenHandler: () => {},
    executeJavaScript: () => Promise.resolve(undefined),
    loadURL: () => Promise.resolve(),
    openDevTools: () => {},
};

export class BrowserWindow extends EventEmitter {
    webContents = contenuWebInerte;

    static getAllWindows (): BrowserWindow[] {
        return [];
    }
    static getFocusedWindow (): BrowserWindow | null {
        return null;
    }
    static fromWebContents (): BrowserWindow | null {
        return null;
    }
    loadURL () {
        return Promise.resolve();
    }
    loadFile () {
        return Promise.resolve();
    }
    show () {}
    hide () {}
    close () {}
    destroy () {}
    isDestroyed () {
        return true;
    }
    setMenu () {}
}

/*
 * Ouvrir un lien, écrire dans le presse-papier et notifier sont les trois actions du
 * calque qui doivent vraiment arriver sur le téléphone : elles passent par le bus, que
 * `src/Mobile/server.ts` fait descendre jusqu'à la page, puis jusqu'à Kotlin.
 */
function demanderAuTelephone (type: string, valeur: string) {
    annoncer(type, valeur);
}

export const shell = {
    openExternal: (url: string) => {
        demanderAuTelephone("ouvrir-lien", url);
        return Promise.resolve();
    },
    openPath: () => Promise.resolve(""),
    showItemInFolder: () => {},
    beep: () => {},
};

export const clipboard = {
    writeText: (texte: string) => demanderAuTelephone("presse-papier", texte),
    readText: () => "",
    writeImage: () => {},
    clear: () => {},
};

export class Notification extends EventEmitter {
    static isSupported () {
        return false;
    }
    constructor (public options?: unknown) {
        super();
    }
    show () {
        const o = (this.options ?? {}) as { title?: string; body?: string };
        demanderAuTelephone("notification", JSON.stringify({ titre: o.title ?? "Voidcord", corps: o.body ?? "" }));
    }
    close () {}
}

export const dialog = {
    showMessageBox: () => Promise.resolve({ response: 0, checkboxChecked: false }),
    showMessageBoxSync: () => 0,
    showErrorBox: () => {},
    showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] as string[] }),
    showSaveDialog: () => Promise.resolve({ canceled: true, filePath: undefined }),
};

export const Menu = {
    buildFromTemplate: () => ({ popup: () => {}, closePopup: () => {} }),
    setApplicationMenu: () => {},
    getApplicationMenu: () => null,
};
export class MenuItem {}
export class Tray extends EventEmitter {
    setToolTip () {}
    setContextMenu () {}
    setImage () {}
    destroy () {}
}
export const powerMonitor = {
    on: () => powerMonitor,
    getSystemIdleTime: () => 0,
    getSystemIdleState: () => "active",
};
export const powerSaveBlocker = { start: () => 0, stop: () => {}, isStarted: () => false };
export const screen = {
    getPrimaryDisplay: () => ({
        workAreaSize: { width: 412, height: 915 },
        bounds: { width: 412, height: 915 },
        scaleFactor: 2,
    }),
    getAllDisplays: () => [],
    getCursorScreenPoint: () => ({ x: 0, y: 0 }),
    on: () => {},
};
const sessionInerte = {
    webRequest: { onBeforeRequest: () => {}, onHeadersReceived: () => {}, onBeforeSendHeaders: () => {} },
    setPermissionRequestHandler: () => {},
    setCertificateVerifyProc: () => {},
    loadExtension: () => Promise.resolve({ id: "vencord" }),
    clearCache: () => Promise.resolve(),
    cookies: { get: () => Promise.resolve([]), set: () => Promise.resolve(), remove: () => Promise.resolve() },
};
export const session = { defaultSession: sessionInerte, fromPartition: () => sessionInerte };
export const systemPreferences = {
    getMediaAccessStatus: () => "granted",
    askForMediaAccess: () => Promise.resolve(true),
    isDarkMode: () => true,
    on: () => {},
};
export const globalShortcut = { register: () => false, unregisterAll: () => {} };
export const protocol = { handle: () => {}, registerSchemesAsPrivileged: () => {} };
export const webContents = { getAllWebContents: () => [], fromId: () => null };
export const nativeTheme = { shouldUseDarkColors: true, on: () => {}, themeSource: "dark" };
export const desktopCapturer = { getSources: () => Promise.resolve([]) };
export const safeStorage = {
    isEncryptionAvailable: () => false,
    encryptString: (texte: string) => Buffer.from(texte, "utf8"),
    decryptString: (tampon: Buffer) => tampon.toString("utf8"),
};

export default {
    app,
    net,
    nativeImage,
    ipcMain,
    BrowserWindow,
    shell,
    clipboard,
    Notification,
    dialog,
    Menu,
    MenuItem,
    Tray,
    powerMonitor,
    powerSaveBlocker,
    screen,
    session,
    systemPreferences,
    globalShortcut,
    protocol,
    webContents,
    nativeTheme,
    desktopCapturer,
    safeStorage,
};
