/* Copyright Elysia © 2025. All rights reserved */

/*
 * Le point d'entrée du serveur Voidcord sur Android.
 *
 * Il fait ce que `src/index.ts` et `src/AppCore/index.ts` font ensemble sur l'ordinateur,
 * moins tout ce qui touche aux fenêtres : charger les 133 routes, démarrer l'APIServer,
 * et servir à la WebView les pages locales de Voidcord — l'animation de démarrage, les
 * réglages, la connexion par compte, le choix de la langue, l'éditeur de message.
 *
 * Deux différences avec le bureau, et elles comptent :
 *
 * 1. Pas de HTTPS. Electron faisait croire au client qu'il parlait à `discord.com` grâce
 *    à `host-rules`, ce qu'une WebView ne sait pas faire. Le client est donc servi depuis
 *    `http://127.0.0.1:<port>` — que Chromium traite comme une origine sûre, au même titre
 *    que HTTPS — et toutes ses requêtes, relatives, retombent d'elles-mêmes sur ce serveur.
 *
 * 2. Pas d'extension. Vencord est injecté dans la page par deux balises `<script>` au lieu
 *    d'être chargé comme extension de navigateur.
 */

import express from "express";
import fs from "fs";
import http from "http";
import path from "path";

import { provideRoutes } from "../AppUtils/RegisterRoutes";
import { Annonce, bus } from "./bus";
import { HoteIPC } from "./ipc";
import routesMobiles from "./routes.generated";

declare global {
    interface BigInt {
        toJSON (): string;
    }
}
BigInt.prototype.toJSON = function () {
    return this.toString();
};

const racineApplication = process.env.VOIDCORD_APP_PATH ?? process.cwd();
const donnees = process.env.VOIDCORD_USER_DATA ?? path.join(process.cwd(), "userData");
const fichierPort = process.env.VOIDCORD_PORT_FILE ?? path.join(donnees, "port");

const cheminAssets = (...parties: string[]) => path.join(racineApplication, "assets", ...parties);

/** Le calque, ajouté à toute page servie d'ici : c'est lui qui remplace les préchargements. */
const CALQUE = '<script src="/__mobile/pont.js"></script>';

/** Vencord ne va que dans le client : les pages de Voidcord n'en ont que faire. */
const VENCORD = '<script src="/__vencord/dist/Vencord.js"></script>';

/**
 * Injecte le calque et Vencord dans une page.
 *
 * L'ordre est le seul point délicat : `pont.js` installe `BotClientNative` et `protoAPI`,
 * dont le greffon Voidcord de Vencord se sert dès son chargement. Inversé, l'onglet
 * Voidcord des réglages apparaît vide.
 */
/**
 * Ouvre `connect-src` sur l'origine de la page.
 *
 * Les pages de Voidcord — les réglages, le choix de la langue — se ferment à toute
 * connexion : `connect-src 'none'`. C'est juste sur l'ordinateur, où elles parlent au
 * processus principal par l'IPC d'Electron et n'ont aucun réseau à faire. Ici l'IPC
 * **est** une requête vers le serveur local : sans cette ouverture, la page des réglages
 * s'affiche vide et la console annonce un refus de politique de sécurité.
 *
 * Seul `'self'` est ajouté : la page ne gagne le droit de parler qu'à son propre serveur,
 * qui n'écoute que sur 127.0.0.1.
 */
function ouvrirLaPolitique (html: string) {
    return html.replace(/connect-src\s+'none'/gi, "connect-src 'self'");
}

function injecter (html: string, avecVencord: boolean) {
    if (html.includes("/__mobile/pont.js")) return html;
    const scripts = avecVencord ? CALQUE + VENCORD : CALQUE;
    const avecPolitique = ouvrirLaPolitique(html);
    const tete = avecPolitique.indexOf("<head>");
    if (tete !== -1) return avecPolitique.slice(0, tete + 6) + scripts + avecPolitique.slice(tete + 6);
    return scripts + avecPolitique;
}

function servirPage (reponse: express.Response, fichier: string, avecVencord = false) {
    try {
        reponse.type("html").send(injecter(fs.readFileSync(fichier, "utf8"), avecVencord));
    } catch (error) {
        reponse.status(500).type("text/plain").send(`Page introuvable : ${fichier}\n${String(error)}`);
    }
}

/**
 * Sert un dossier de pages locales : les `.html` passent par l'injection, le reste
 * (styles, scripts, polices, images) est servi tel quel.
 */
function dossierLocal (dossier: string) {
    const routeur = express.Router();
    routeur.get(/\.html$/, (requete, reponse) => {
        const cible = path.join(dossier, path.normalize(requete.path).replace(/^([/\\])+/, ""));
        if (!cible.startsWith(dossier)) return reponse.status(403).end();
        return servirPage(reponse, cible);
    });
    routeur.get("/", (_requete, reponse) => servirPage(reponse, path.join(dossier, "index.html")));
    routeur.use(express.static(dossier));
    return routeur;
}

async function demarrer () {
    /*
     * Les routes d'abord : l'APIServer les enregistre au chargement du module, et sur
     * Android il n'y a pas de dossier `routes/` à parcourir. La liste est engendrée au
     * moment de la compilation par `scripts/buildMobile.mjs`.
     */
    provideRoutes(routesMobiles);

    const ipc = new HoteIPC();
    ipc.etat({ phase: "loading" });

    const { expressApp } = await import("../AppCore/APIServer");

    const racine = express();
    racine.disable("x-powered-by");

    // ── Le pont avec la page ────────────────────────────────────────────────────────
    const pont = express.Router();
    pont.use(express.json({ limit: "2mb" }));

    pont.post("/ipc", async (requete, reponse) => {
        const { canal, args } = (requete.body ?? {}) as { canal?: string; args?: unknown[] };
        if (typeof canal !== "string") return reponse.status(400).json({ ok: false, erreur: "Canal manquant." });
        return reponse.json(await ipc.appeler(canal, Array.isArray(args) ? args : []));
    });

    pont.post("/captcha/:id", (requete, reponse) => {
        const { jeton } = (requete.body ?? {}) as { jeton?: string | null };
        const connu = ipc.resoudreCaptcha(requete.params.id, jeton ?? null);
        return reponse.json({ ok: connu });
    });

    /*
     * Les annonces du serveur vers la page, par flux d'évènements. C'est ce qui remplace
     * `webContents.send` : l'état du démarrage, les mises à jour, l'écran à ouvrir.
     */
    pont.get("/evenements", (requete, reponse) => {
        reponse.writeHead(200, {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
        });
        reponse.write(": ouvert\n\n");
        const ecouteur = (annonce: Annonce) => {
            reponse.write(`data: ${JSON.stringify(annonce)}\n\n`);
        };
        bus.on("annonce", ecouteur);
        // Un commentaire toutes les vingt secondes : sans trafic, Android coupe le flux.
        const battement = setInterval(() => reponse.write(": battement\n\n"), 20_000);
        requete.on("close", () => {
            clearInterval(battement);
            bus.off("annonce", ecouteur);
        });
    });

    pont.get("/pont.js", (_requete, reponse) => {
        reponse.type("application/javascript").sendFile(path.join(racineApplication, "mobile", "pont.js"));
    });

    racine.use("/__mobile", pont);

    // ── Les pages locales de Voidcord, servies depuis l'origine du client ───────────
    racine.use("/__mobile/demarrage", dossierLocal(cheminAssets("startup")));
    racine.use("/__mobile/compte", dossierLocal(cheminAssets("account")));
    racine.use("/__mobile/langue", dossierLocal(cheminAssets("langue")));
    racine.use("/__mobile/editeur", dossierLocal(cheminAssets("voidcord-editor")));
    racine.use("/__mobile/reglages", dossierLocal(path.join(racineApplication, "build", "Renderer", "Settings")));

    // ── Vencord, à la place de l'extension de navigateur ───────────────────────────
    racine.use("/__vencord", express.static(path.join(racineApplication, "VencordExtension")));

    /*
     * La page du client. L'APIServer la sert aussi, mais sans l'injection : elle est donc
     * interceptée avant lui, pour les mêmes chemins que les siens.
     */
    const pageClient: express.RequestHandler = (_requete, reponse) =>
        servirPage(reponse, cheminAssets("snapshot", "index.html"), true);
    /*
     * La page de captcha, avec le calque : hCaptcha n'accepte sa clé que depuis l'origine
     * du client, c'est donc bien ce chemin-là qu'il faut servir, et non le dossier local.
     */
    racine.get("/__botclient/captcha", (_requete, reponse) =>
        servirPage(reponse, cheminAssets("account", "captcha.html")),
    );
    racine.get("/", pageClient);
    racine.get("/app", pageClient);
    racine.get("/login", pageClient);
    racine.get("/channels/*", pageClient);

    // ── Tout le reste : l'APIServer de Voidcord, inchangé ──────────────────────────
    racine.use(expressApp);

    /*
     * Un port fixe, et c'est important.
     *
     * Le navigateur range le stockage local par origine, et l'origine comprend le port :
     * `http://127.0.0.1:41287` et `http://127.0.0.1:38194` sont deux mondes séparés. Avec
     * un port tiré au sort à chaque lancement, le jeton écrit par Discord disparaissait à
     * la fermeture de l'application — il n'était pas effacé, il était rangé ailleurs, et
     * il fallait se reconnecter à chaque fois.
     *
     * Le numéro est choisi dans la plage réservée aux usages privés, loin de ce qu'une
     * autre application prendrait. S'il est déjà pris, on repart sur un port au hasard :
     * mieux vaut une session perdue qu'une application qui ne démarre pas.
     */
    const PORT_FIXE = 47653;
    const serveur = http.createServer(racine);
    await new Promise<void>(resolve => {
        serveur.once("error", () => {
            process.stdout.write(`Voidcord : le port ${PORT_FIXE} est pris, un autre sera utilisé\n`);
            serveur.listen(0, "127.0.0.1", () => resolve());
        });
        serveur.listen(PORT_FIXE, "127.0.0.1", () => resolve());
    });

    const port = (serveur.address() as { port: number }).port;
    fs.mkdirSync(path.dirname(fichierPort), { recursive: true });
    fs.writeFileSync(fichierPort, String(port), "utf8");
    process.stdout.write(`VOIDCORD_PORT ${port}\n`);
    ipc.etat({ phase: "ready" });

    /*
     * Le mode veille d'Android peut suspendre le processus : une connexion restée ouverte
     * trop longtemps bloque alors le serveur au réveil. Deux minutes suffisent au client,
     * qui rouvre ses requêtes de lui-même.
     */
    serveur.keepAliveTimeout = 120_000;
    serveur.headersTimeout = 125_000;
}

demarrer().catch(error => {
    process.stderr.write(`Voidcord : le serveur n'a pas démarré — ${String(error)}\n`);
    try {
        fs.writeFileSync(`${fichierPort}.erreur`, String(error instanceof Error ? error.stack : error), "utf8");
    } catch {
        /* Rien de plus à tenter. */
    }
    process.exit(1);
});
