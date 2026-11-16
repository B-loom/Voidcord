/* Copyright Elysia © 2025. All rights reserved */

/*
 * Le calque de préchargement, côté page.
 *
 * Sur l'ordinateur, `src/AppCore/Preloads/*.ts` installent `BotClientNative`, `protoAPI`,
 * `startupAPI`, `settingsAPI`, `langueAPI`, `accountAPI` et `captchaAPI` par le
 * `contextBridge` d'Electron. Une WebView n'a pas de préchargement : ce fichier est
 * injecté dans la page par le serveur et redéfinit exactement les mêmes objets, avec les
 * mêmes noms et les mêmes signatures, pour que ni Discord ni le greffon Voidcord de
 * Vencord ne voient la différence.
 *
 * Trois chemins, selon ce que l'appel attend :
 *
 * - Les appels qui rendent une promesse (`invoke`) passent par `fetch`.
 * - Les appels synchrones (`sendSync`) — la version, la langue, les expériences, les
 *   jetons demandés au clic — passent par l'objet natif `VoidcordNative` que Kotlin
 *   injecte, dont les méthodes rendent leur valeur sur place. Sans lui, on retombe sur un
 *   `XMLHttpRequest` synchrone, qui marche aussi mais que Chromium déconseille.
 * - Les évènements du serveur vers la page (`ipcRenderer.on`) arrivent par un flux
 *   d'évènements, ouvert une fois pour toute la page.
 */

type Ecouteur = (...args: unknown[]) => void;

/**
 * Le pont natif, quand il est là.
 *
 * Il est posé par Kotlin (`PontVoidcord.kt`) sur la WebView de Voidcord. Les pages ouvertes
 * autrement — l'inspecteur, un navigateur de passage — ne l'ont pas, et le calque retombe
 * alors sur un `XMLHttpRequest` synchrone.
 */
type PontNatif = {
    appelSync (canal: string, argsJson: string): string;
    action (type: string, valeurJson: string): void;
};

function pontNatif (): PontNatif | undefined {
    return (window as unknown as { VoidcordNative?: PontNatif }).VoidcordNative;
}

const BASE = "/__mobile";

function echec (reponse: { ok: boolean; erreur?: string; valeur?: unknown }) {
    if (!reponse.ok) throw new Error(reponse.erreur ?? "Appel IPC refusé.");
    return reponse.valeur;
}

/** Un appel qui rend une promesse, comme `ipcRenderer.invoke`. */
async function invoquer (canal: string, ...args: unknown[]) {
    const reponse = await fetch(`${BASE}/ipc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ canal, args }),
    });
    return echec(await reponse.json());
}

/** Un appel sans réponse attendue, comme `ipcRenderer.send`. */
function envoyer (canal: string, ...args: unknown[]) {
    void fetch(`${BASE}/ipc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ canal, args }),
        keepalive: true,
    }).catch(() => undefined);
}

/** Un appel dont la valeur doit revenir tout de suite, comme `ipcRenderer.sendSync`. */
function demanderMaintenant (canal: string, ...args: unknown[]): unknown {
    const argsJson = JSON.stringify(args);
    try {
        const natif = pontNatif();
        if (natif) return echec(JSON.parse(natif.appelSync(canal, argsJson)));
        const requete = new XMLHttpRequest();
        requete.open("POST", `${BASE}/ipc`, false);
        requete.setRequestHeader("content-type", "application/json");
        requete.send(JSON.stringify({ canal, args }));
        return echec(JSON.parse(requete.responseText));
    } catch (error) {
        console.error("[Voidcord] appel synchrone impossible", canal, error);
        return null;
    }
}

/*
 * Les liens de Voidcord mènent à son dépôt ; sur Android, ils doivent mener au sien.
 *
 * L'onglet Voidcord des réglages — les nouveautés, la documentation, « à propos » — pointe
 * vers `B-loom/Voidcord`, et c'est juste sur l'ordinateur. Ici, c'est l'APK qui a son
 * changelog, ses versions et son site : les liens sont donc renvoyés vers
 * `B-loom/Voidcord-Apk`. Le dépôt du bureau reste atteignable depuis celui-là.
 */
function versLeDepotMobile (adresse: string): string {
    return adresse
        .replace("github.com/B-loom/Voidcord/", "github.com/B-loom/Voidcord-Apk/")
        .replace(/github\.com\/B-loom\/Voidcord$/, "github.com/B-loom/Voidcord-Apk")
        .replace("b-loom.github.io/Voidcord/", "b-loom.github.io/Voidcord-Apk/")
        .replace(/b-loom\.github\.io\/Voidcord$/, "b-loom.github.io/Voidcord-Apk");
}

/** Une action à exécuter par l'application elle-même : ouvrir un lien, copier, changer d'écran. */
function action (type: string, valeur: unknown) {
    if (type === "ouvrir-lien" && typeof valeur === "string") valeur = versLeDepotMobile(valeur);
    const natif = pontNatif();
    if (natif) natif.action(type, JSON.stringify(valeur ?? null));
    else console.warn("[Voidcord] aucune application native pour l'action", type);
}

// ── Les évènements venus du serveur ─────────────────────────────────────────────────

const ecouteurs = new Map<string, Ecouteur[]>();

function surCanal (canal: string, ecouteur: Ecouteur) {
    const liste = ecouteurs.get(canal) ?? [];
    liste.push(ecouteur);
    ecouteurs.set(canal, liste);
    return () => {
        const restants = (ecouteurs.get(canal) ?? []).filter(e => e !== ecouteur);
        ecouteurs.set(canal, restants);
    };
}

/*
 * Les annonces dont l'application est responsable — changer d'écran, ouvrir un lien,
 * copier — sont transmises à Kotlin. Les autres sont rendues aux écouteurs de la page.
 */
const ANNONCES_NATIVES = [
    "ouvrir-lien",
    "presse-papier",
    "notification",
    "ecran:fermer",
    "ecran:relancer",
    "ecran:quitter",
    "ecran:client",
    "ecran:reglages",
    "ecran:comptes",
    "ecran:langue",
    "ecran:editeur",
    "ecran:captcha",
    "ecran:avertissement",
    "ecran:animation-finie",
    "ecran:installer-mise-a-jour",
];

function ouvrirLeFlux () {
    const flux = new EventSource(`${BASE}/evenements`);
    flux.onmessage = message => {
        let annonce: { type: string; valeur: unknown };
        try {
            annonce = JSON.parse(message.data);
        } catch {
            return;
        }
        if (ANNONCES_NATIVES.includes(annonce.type)) action(annonce.type, annonce.valeur);
        for (const ecouteur of ecouteurs.get(annonce.type) ?? []) {
            try {
                ecouteur(annonce.valeur);
            } catch (error) {
                console.error("[Voidcord] écouteur en erreur", annonce.type, error);
            }
        }
    };
    // Si Android coupe le flux pendant la veille, `EventSource` se reconnecte seul.
    flux.onerror = () => undefined;
}

/*
 * Le partage d'écran n'existe pas dans une WebView : `getDisplayMedia` y est absente.
 *
 * Vencord s'en empare dès son chargement — `navigator.mediaDevices.getDisplayMedia.bind(…)`
 * au premier niveau du greffon de partage d'écran — et l'absence faisait tomber le paquet
 * entier : plus de Vencord, donc plus de greffon Voidcord, donc plus d'onglet Voidcord
 * dans les réglages. Une fonction qui refuse proprement suffit à ce que tout le reste se
 * charge.
 *
 * Posée avant Vencord, puisque le serveur injecte ce fichier en premier.
 */
/*
 * Dire à l'application qu'un appel commence, et quand il finit.
 *
 * Android met en sommeil ce qui n'est plus à l'écran : l'appel s'arrêtait dès qu'on passait
 * à une autre application. Un service de premier plan l'en empêche, mais encore faut-il
 * savoir quand le démarrer.
 *
 * Le signal le plus sûr est le micro lui-même : Discord l'ouvre en rejoignant un salon
 * vocal et le relâche en le quittant. Pas besoin de reconnaître un état interne du client,
 * qui changerait à la prochaine version.
 */
function suivreLesAppels () {
    const appareils = navigator.mediaDevices;
    if (!appareils?.getUserMedia) return;
    const original = appareils.getUserMedia.bind(appareils);
    let pistesOuvertes = 0;

    appareils.getUserMedia = async (contraintes?: MediaStreamConstraints) => {
        const flux = await original(contraintes);
        const micros = flux.getAudioTracks();
        if (micros.length === 0) return flux;

        if (pistesOuvertes === 0) action("appel:debut", null);
        pistesOuvertes += micros.length;

        for (const piste of micros) {
            const fermer = () => {
                pistesOuvertes = Math.max(0, pistesOuvertes - 1);
                if (pistesOuvertes === 0) action("appel:fin", null);
            };
            piste.addEventListener("ended", fermer, { once: true });
            // `stop()` ne déclenche pas « ended » : il faut l'entourer soi-même.
            const stopOriginal = piste.stop.bind(piste);
            piste.stop = () => {
                stopOriginal();
                fermer();
            };
        }
        return flux;
    };
}

suivreLesAppels();

function neutraliserLePartageDEcran () {
    const appareils = navigator.mediaDevices as MediaDevices | undefined;
    if (!appareils || typeof appareils.getDisplayMedia === "function") return;
    /*
     * Un refus silencieux ne dit rien à personne : le bouton « Partager » répondait au
     * doigt et il ne se passait rien. Le message explique pourquoi, comme le fait Voidcord
     * pour les pages qu'il ne sait pas servir.
     */
    const refus = () => {
        action("ecran:avertissement", {
            titre: "Rien à voir par ici",
            corps:
                "Voidcord ne peut pas partager ton écran depuis un téléphone. Une page web n'a aucun " +
                "accès à l'image de l'appareil, et Android ne le lui donne pas : il faudrait l'application " +
                "officielle de Discord pour cela.",
        });
        return Promise.reject(new Error("Le partage d'écran n'existe pas sur Android."));
    };
    try {
        (appareils as unknown as Record<string, unknown>).getDisplayMedia = refus;
    } catch {
        // Certaines WebView scellent l'instance : la propriété va alors sur le prototype.
        Object.defineProperty(MediaDevices.prototype, "getDisplayMedia", {
            value: refus,
            configurable: true,
            writable: true,
        });
    }
}

neutraliserLePartageDEcran();

/*
 * Ce qui remplace `host-rules` sur Android.
 *
 * Sur l'ordinateur, Electron détourne le nom `discord.com` vers le serveur local, et le
 * client ne voit pas la différence : ses adresses absolues — et il en écrit, pour les
 * messages comme pour les émojis — atterrissent chez Voidcord. Une WebView ne sait pas
 * détourner un nom de domaine : l'origine est `http://127.0.0.1:<port>`, et une adresse
 * absolue part alors vers le vrai Discord, qui la refuse faute d'en-têtes CORS.
 *
 * Les trois noms de Discord sont donc réécrits vers l'origine de la page, au moment de
 * l'appel. Le CDN et les invitations gardent les leurs : ces adresses-là doivent bien
 * sortir du téléphone.
 */
const NOMS_DETOURNES = new Set(["discord.com", "ptb.discord.com", "canary.discord.com"]);

function versLeServeurLocal (adresse: string): string {
    // Un chemin relatif est déjà bon, et `new URL` coûte cher sur les milliers d'appels.
    if (adresse.length === 0 || adresse[0] === "/" || !adresse.includes("//")) return adresse;
    try {
        const cible = new URL(adresse, window.location.href);
        if (!NOMS_DETOURNES.has(cible.hostname)) return adresse;
        return window.location.origin + cible.pathname + cible.search + cible.hash;
    } catch {
        return adresse;
    }
}

function detournerLesAdresses () {
    const fetchOriginal = window.fetch;
    window.fetch = function (entree: RequestInfo | URL, init?: RequestInit) {
        if (typeof entree === "string" || entree instanceof URL) {
            return fetchOriginal.call(this, versLeServeurLocal(String(entree)), init);
        }
        const reecrite = versLeServeurLocal(entree.url);
        if (reecrite === entree.url) return fetchOriginal.call(this, entree, init);
        return fetchOriginal.call(this, new Request(reecrite, entree), init);
    };

    const ouvrirOriginal = XMLHttpRequest.prototype.open;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, methode: string, adresse: string | URL, ...reste: any[]) {
        return ouvrirOriginal.call(this, methode, versLeServeurLocal(String(adresse)), ...(reste as [boolean]));
    } as typeof XMLHttpRequest.prototype.open;

    const baliseOriginale = navigator.sendBeacon?.bind(navigator);
    if (baliseOriginale) {
        navigator.sendBeacon = (adresse: string | URL, donnees?: BodyInit | null) =>
            baliseOriginale(versLeServeurLocal(String(adresse)), donnees);
    }
}

detournerLesAdresses();

/*
 * La barre de titre de Windows, que Discord dessine parce que Voidcord lui fait croire
 * qu'il tourne dans une application de bureau : réduire, agrandir, fermer. Sur un
 * téléphone il n'y a pas de fenêtre, ces trois boutons ne font rien, et la barre mange
 * trente-deux pixels de haut d'un écran qui n'en a pas de trop.
 *
 * Les classes de Discord portent une empreinte qui change à chaque version : seul le
 * préfixe est sûr.
 */
/*
 * L'appui long, et ce qu'Android en fait.
 *
 * Le client Discord est écrit pour une souris : un appui long y veut dire « ouvre le menu
 * contextuel », et c'est aussi comme cela qu'on change de compte. Une WebView, elle,
 * comprend d'abord un appui long comme « sélectionne ce texte » : la loupe apparaît, les
 * poignées de sélection aussi, et le menu de Discord jamais.
 *
 * La sélection est donc coupée partout, sauf là où elle sert vraiment — les champs de
 * saisie et le texte des messages, qu'on veut pouvoir copier. `touch-callout` coupe en
 * plus le menu d'Android sur les images et les liens, qui recouvrait celui de Discord.
 */
const STYLES_TACTILES = `
    *:not(input):not(textarea):not([contenteditable]):not([class*="messageContent"]):not([class*="markup"]) {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
    }
    input, textarea, [contenteditable], [class*="messageContent"], [class*="markup"] {
        -webkit-user-select: text;
        user-select: text;
    }
    /* La barre de titre de Windows : trois boutons sans fenêtre, et trente-deux pixels. */
    [class*="systemBar_"], [class*="winButtons_"] { display: none !important; }

    /*
     * La boutique, Nitro et les quêtes.
     *
     * Rien de tout cela ne marche depuis Voidcord — on se connecte avec un jeton, pas
     * avec un compte qui paie — et ces pages ouvrent des réclames en plein écran dont on
     * ne ressort pas facilement sur un téléphone. Les entrées disparaissent donc de la
     * barre latérale. Discord peut encore afficher une réclame de lui-même ; la faire
     * taire demanderait un greffon Vencord, pas une feuille de style.
     */
    nav a[href="/shop"], nav a[href="/store"], nav a[href="/quests"],
    nav a[href^="/nitro"], nav a[href^="/settings/premium"] { display: none !important; }
`;

/*
 * La place qu'il faut au client de bureau, et pas un point de plus.
 *
 * Voidcord se présente à Discord comme un navigateur de bureau, pour avoir le client
 * complet. Mais la page est écrite pour une fenêtre large : à 384 points, celle d'un
 * téléphone, Discord retire de lui-même les boutons GIF et autocollants du compositeur —
 * ils ne sont pas cachés, ils ne sont plus dans le document, et aucune feuille de style ne
 * les ramène.
 *
 * La largeur a été cherchée sur l'appareil, par paliers : à 800 les deux boutons manquent,
 * à 850 ils sont là. Le vocal et la barre des serveurs, eux, tiennent à toutes les
 * largeurs. On prend donc 850 — le plus petit cadre qui garde tout, donc le texte le plus
 * grand possible — et le zoom au doigt reste disponible par-dessus.
 */
const LARGEUR_BUREAU = 850;

function reglerLaMiseEnPage () {
    const existante = document.querySelector('meta[name="viewport"]');
    const meta = existante ?? document.createElement("meta");
    meta.setAttribute("name", "viewport");
    meta.setAttribute(
        "content",
        `width=${LARGEUR_BUREAU}, initial-scale=${(window.screen.width / LARGEUR_BUREAU).toFixed(3)}, minimum-scale=0.2, maximum-scale=5, user-scalable=yes`,
    );
    if (!existante) document.head.appendChild(meta);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reglerLaMiseEnPage, { once: true });
} else {
    reglerLaMiseEnPage();
}

function reglerLeTactile () {
    const style = document.createElement("style");
    style.textContent = STYLES_TACTILES;
    document.documentElement.appendChild(style);
}

reglerLeTactile();

// ── Les objets attendus par Discord et par Voidcord ─────────────────────────────────

/*
 * Discord lit sa langue dans le stockage local avant que les réglages du compte
 * n'arrivent : un bot, qui n'a pas de langue, démarrerait en anglais sans cette ligne.
 */
try {
    if (!window.localStorage.getItem("locale")) window.localStorage.setItem("locale", JSON.stringify("fr"));
} catch {
    /* Discord supprime parfois `localStorage` : ce n'est pas bloquant. */
}

/** Discord efface `window.localStorage` : le jeton s'écrit par une iframe, comme sur le bureau. */
function ecrireJeton (jeton: string) {
    const cadre = document.createElement("iframe");
    document.body.appendChild(cadre);
    (cadre.contentWindow as Window).localStorage.setItem("token", JSON.stringify(jeton));
    cadre.remove();
}

const BotClientNative = {
    getBotInfo: (token: string) => invoquer("app:preload:get_bot_info", token),
    getBotClientVersion: () => demanderMaintenant("app:preload:get_version"),
    getBotClientName: () => demanderMaintenant("app:preload:get_name"),
    getPrivateChannelDefault () {
        return {
            type: 1,
            recipients: [demanderMaintenant("app:preload:get_default_user_patch")],
            // Discord trie les messages privés par `last_message_id` : un flocon très
            // loin dans le futur garde ce salon en tête de liste.
            last_message_id: "9999999999999999999",
            is_spam: false,
            id: "1000000000000000000",
            flags: 0,
        };
    },
    getUserExperiments: (allData: Record<string, string>[], botId?: string) =>
        demanderMaintenant("app:preload:get_experiment", "user", botId, allData),
    getGuildExperiments: () => demanderMaintenant("app:preload:get_experiment", "guild"),
    getApexExperiments: (botId: string) => demanderMaintenant("app:preload:get_experiment", "apex", botId),
    closeWindow: () => action("ecran:fermer", null),
    openAccountLogin: () => invoquer("app:account:open_window"),
    isUserToken: (token: string) => demanderMaintenant("app:preload:get_is_user_token", token) as boolean,
    rememberBot: (token: string) => envoyer("app:account:remember_bot", token),
    getSupportInvite: () => demanderMaintenant("app:support_invite") as string,
    onSupportInviteCopied: (listener: (invite: string) => void) =>
        surCanal("app:support_invite:copied", invite => listener(invite as string)),
    accountList: () => invoquer("app:account:list"),
    accountLogin: (login: string, password: string, captcha?: { key: string; rqtoken: string | null } | null) =>
        invoquer("app:account:login", { login, password, captcha }),
    accountMfa: (ticket: string, code: string, method: string) =>
        invoquer("app:account:mfa", { ticket, code, method }),
    accountSendSms: (ticket: string) => invoquer("app:account:send_sms", ticket),
    accountSolveCaptcha: (sitekey: string, rqdata: string | null) =>
        invoquer("app:account:solve_captcha", { sitekey, rqdata }),
    accountTokenLogin: (token: string) => invoquer("app:account:token_login", token),
    accountRemove: (token: string) => invoquer("app:account:remove", token),
    /*
     * Choisir un compte recharge le client avec son jeton. Sur l'ordinateur le processus
     * principal injectait le jeton puis rechargeait la fenêtre ; ici c'est la page qui le
     * fait, puisque le stockage local lui appartient.
     */
    async accountUse (token: string) {
        await invoquer("app:account:use", token);
        ecrireJeton(token);
        window.location.replace("/app");
        return true;
    },
    async accountOpenWindow (token: string) {
        await invoquer("app:account:open_client_window", token);
        ecrireJeton(token);
        window.location.replace("/app");
        return true;
    },
    onOpenInvite: (listener: (code: string) => void) =>
        surCanal("app:invite:open", code => listener(code as string)),
    /* Le partage d'écran n'existe pas sur Android : la liste des sources reste vide. */
    onScreenShareSources: (listener: (sources: unknown[]) => void) =>
        surCanal("app:picker:sources", sources => listener((sources as unknown[]) ?? [])),
    chooseScreenShare: () => undefined,
    checkForUpdates: () => invoquer("app:update:check"),
    installUpdate: () => invoquer("app:update:install"),
    getUpdateState: () => demanderMaintenant("app:update:get_state"),
    onUpdateState: (listener: (state: unknown) => void) => surCanal("app:update:state", state => listener(state)),
    getSettings: () => invoquer("app:settings:get"),
    saveSettings: (valeur: unknown) => invoquer("app:settings:save", valeur),
    openSettings: () => invoquer("app:settings:open"),
    langue: () => (demanderMaintenant("app:langue") as string | null) || "fr",
    accountTokens: () => demanderMaintenant("app:account:tokens") as { id: string; token: string }[] | null,
    getBotAccountIds: () => demanderMaintenant("app:account:bot_ids") as string[],
    getRunningGames: () => demanderMaintenant("app:games:get"),
    onRunningGamesChanged: (listener: (games: unknown[], added: unknown[], removed: unknown[]) => void) =>
        surCanal("app:games:changed", () => listener([], [], [])),
    // La barre de titre de Vesktop : un téléphone n'en a pas.
    close: () => action("ecran:fermer", null),
    minimize: () => undefined,
    maximize: () => undefined,
    focus: () => undefined,
    flashFrame: () => undefined,
    requestOpenMessageEditorWindow: () => invoquer("app:request_open_message_editor_window"),
};

/*
 * Les réglages de compte en protobuf. Sur l'ordinateur, le processus principal les
 * demande à la page, qui répond ; les deux sens passent par le même bus ici.
 */
const protoAPI = {
    GetPreloadedUserSettings: (listener: (botId: string) => unknown) =>
        surCanal("app:preload:get_preloaded_user_settings", botId => listener(botId as string)),
    GetPreloadedUserSettingsResponse: (botId: string, settings: string) =>
        envoyer("app:preload:get_preloaded_user_settings_response", botId, settings),
    SetPreloadedUserSettings: (listener: (botId: string, settings: string) => unknown) =>
        surCanal("app:preload:set_preloaded_user_settings", (botId, settings) =>
            listener(botId as string, settings as string),
        ),
    GetFrecencyUserSettings: (listener: (botId: string) => unknown) =>
        surCanal("app:preload:get_frecency_user_settings", botId => listener(botId as string)),
    GetFrecencyUserSettingsResponse: (botId: string, settings: string) =>
        envoyer("app:preload:get_frecency_user_settings_response", botId, settings),
    SetFrecencyUserSettings: (listener: (botId: string, settings: string) => unknown) =>
        surCanal("app:preload:set_frecency_user_settings", (botId, settings) =>
            listener(botId as string, settings as string),
        ),
};

/** L'écran de démarrage et son animation (`assets/startup/`). */
const startupAPI = {
    getState: () => invoquer("startup:get-state"),
    onStateChanged: (callback: (state: unknown) => void) => surCanal("startup:state", state => callback(state)),
    retry: () => envoyer("startup:retry"),
    quit: () => envoyer("startup:quit"),
    animationFinished: () => envoyer("startup:animation-finished"),
    revealApplication: () => envoyer("startup:reveal"),
};

/** La fenêtre des réglages (`src/Renderer/Settings/`). */
const settingsAPI = {
    get: () => invoquer("settings:get"),
    save: (valeur: unknown) => invoquer("settings:save", valeur),
};

/** Le choix de la langue au premier lancement (`assets/langue/`). */
const langueAPI = {
    choisir: (langue: "fr" | "en") => envoyer("langue:choisir", langue),
};

/** La connexion par compte (`assets/account/`). */
const accountAPI = {
    login: (login: string, password: string, captcha?: { key: string; rqtoken: string | null }) =>
        invoquer("app:account:login", { login, password, captcha }),
    loginWithToken: (token: string) => invoquer("app:account:token_login", token),
    mfa: (ticket: string, code: string, method: "totp" | "sms" | "backup") =>
        invoquer("app:account:mfa", { ticket, code, method }),
    sendSms: (ticket: string) => invoquer("app:account:send_sms", ticket),
    solveCaptcha: (sitekey: string, rqdata: string | null) =>
        invoquer("app:account:solve_captcha", { sitekey, rqdata }),
    listAccounts: () => invoquer("app:account:list"),
    removeAccount: (token: string) => invoquer("app:account:remove", token),
    useAccount: (token: string) => BotClientNative.accountUse(token),
    openAccountWindow: (token: string) => BotClientNative.accountOpenWindow(token),
    closeWindow: () => action("ecran:fermer", null),
};

/*
 * La page de captcha. Sur l'ordinateur elle s'ouvrait dans une fenêtre que le processus
 * principal attendait ; ici l'identifiant du captcha voyage dans l'adresse, et la réponse
 * remonte par le pont.
 */
const captchaAPI = {
    resolve (token: string | null) {
        const id = new URLSearchParams(window.location.search).get("id") ?? "";
        void fetch(`${BASE}/captcha/${encodeURIComponent(id)}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jeton: token }),
        }).finally(() => action("ecran:fermer", null));
    },
};

/** L'éditeur de message (`assets/voidcord-editor/`). */
const electronAPI = {
    reactReady: () => envoyer("app:message_editor_ready"),
    closeWindow: () => action("ecran:fermer", null),
};

Object.assign(window as unknown as Record<string, unknown>, {
    BotClientNative,
    protoAPI,
    startupAPI,
    settingsAPI,
    langueAPI,
    accountAPI,
    captchaAPI,
    electronAPI,
});

/*
 * Ce que `VencordExtension/content.js` faisait comme script de contenu. Les adresses ne
 * viennent plus de `chrome.runtime.getURL` mais du serveur local, qui sert le dossier de
 * l'extension sous `/__vencord/`.
 */
function annoncerVencord () {
    window.postMessage({
        type: "vencord:meta",
        meta: {
            EXTENSION_VERSION: "1.15.15",
            EXTENSION_BASE_URL: `${window.location.origin}/__vencord/`,
            RENDERER_CSS_URL: `${window.location.origin}/__vencord/dist/Vencord.css`,
        },
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", annoncerVencord, { once: true });
} else {
    annoncerVencord();
}

ouvrirLeFlux();
