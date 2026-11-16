/* Copyright Elysia © 2025. All rights reserved */

/*
 * Prépare le serveur de Voidcord pour Android.
 *
 * Le résultat est un dossier `nodejs-project/` que l'APK embarque et que l'application
 * recopie dans son espace privé au premier lancement : un seul fichier JavaScript pour le
 * serveur, le calque injecté dans la page, et les ressources que le serveur sert.
 *
 * Deux choses sont engendrées ici :
 *
 * 1. `src/Mobile/routes.generated.ts`. L'APIServer parcourt `src/AppCore/routes/` et
 *    charge chaque fichier par `require`. Un paquet compilé n'a plus de dossier à
 *    parcourir : la liste des 133 routes est donc écrite à l'avance, dans le même ordre
 *    que le parcours du disque — les routes fixes avant les routes à paramètre, sans quoi
 *    `/users/@me` serait capté par `/users/:id`.
 *
 * 2. Le paquet lui-même, par esbuild, avec `electron`, `electron-log` et
 *    `electron-updater` remplacés par les calques de `src/Mobile/shims/`.
 */

import * as esbuild from "esbuild";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const racine = fileURLToPath(new URL("..", import.meta.url));
const dossierRoutes = path.join(racine, "src", "AppCore", "routes");
const sortie = path.join(racine, "android", "app", "src", "main", "assets", "nodejs-project");

/** Le même parcours, et surtout le même tri, que `traverseDirectorySync`. */
function parcourir (dossier) {
    const resultat = [];
    const entrees = readdirSync(dossier).sort((a, b) => {
        const aParam = a.startsWith("#");
        const bParam = b.startsWith("#");
        if (aParam && !bParam) return 1;
        if (!aParam && bParam) return -1;
        return a.localeCompare(b);
    });
    for (const nom of entrees) {
        const chemin = path.join(dossier, nom);
        if (/^\./.test(nom)) continue;
        const etat = lstatSync(chemin);
        if (etat.isFile() && /^([^.].*)(?<!\.d)\.(ts|js)$/.test(nom)) resultat.push(chemin);
        else if (etat.isDirectory()) resultat.push(...parcourir(chemin));
    }
    return resultat;
}

function engendrerRoutes () {
    const fichiers = parcourir(dossierRoutes);
    const lignes = [
        "/* Copyright Elysia © 2025. All rights reserved */",
        "",
        "/*",
        " * Engendré par `scripts/buildMobile.mjs` — ne pas modifier à la main.",
        " *",
        " * La liste des routes de l'APIServer, dans l'ordre du parcours du disque, pour que",
        " * le portage Android n'ait pas besoin de lire un dossier qui n'existe plus.",
        " */",
        "",
    ];
    const entrees = [];
    fichiers.forEach((fichier, index) => {
        const relatif = path.relative(dossierRoutes, fichier).split(path.sep).join("/");
        const sansExtension = relatif.replace(/\.(ts|js)$/, "");
        lignes.push(`import * as r${index} from "../AppCore/routes/${sansExtension}";`);
        /*
         * Le chemin garde sa barre oblique de tête et son extension : `registerRouteSync`
         * retire la racine, puis l'extension, puis `/index`. Comme la racine n'apparaît
         * pas dans un chemin relatif, le remplacement ne fait rien et le calcul tombe
         * juste — `/users/@me/index.ts` devient bien `/users/@me`.
         */
        entrees.push(`    { file: "/${relatif}", module: r${index} }`);
    });
    lignes.push("", "import type { RouteChargee } from \"../AppUtils/RegisterRoutes\";", "");
    lignes.push("const routes: RouteChargee[] = [", `${entrees.join(",\n")},`, "];", "", "export default routes;", "");
    const cible = path.join(racine, "src", "Mobile", "routes.generated.ts");
    writeFileSync(cible, lignes.join("\n"), "utf8");
    console.log(`[mobile] ${fichiers.length} routes listées dans src/Mobile/routes.generated.ts`);
}

const calques = {
    electron: path.join(racine, "src", "Mobile", "shims", "electron.ts"),
    "electron-log": path.join(racine, "src", "Mobile", "shims", "electron-log.ts"),
    "electron-updater": path.join(racine, "src", "Mobile", "shims", "electron-updater.ts"),
};

/*
 * Les classes Unicode, et le V8 de nodejs-mobile.
 *
 * nodejs-mobile est compilé sans ICU — `typeof Intl === "undefined"` sur l'appareil — et
 * son V8 ne connaît alors aucune propriété Unicode : `\\p{Letter}` et les suivantes sont
 * refusées, en littéral comme à travers `new RegExp`. Un seul motif du paquet en contient,
 * celui des mentions de commande de `discord-api-types/globals.js`, et il suffisait à
 * empêcher le module de se charger : l'application se fermait sur l'animation de démarrage,
 * avec pour seul indice un `SyntaxError` perdu dans logcat.
 *
 * Les propriétés sont donc remplacées par des plages de points de code. C'est une
 * approximation : elle couvre le latin, les chiffres, les écritures que Discord autorise
 * dans un nom de commande, et le devanagari et le thaï que le motif nommait. Voidcord
 * n'évalue jamais ce motif côté serveur — il sert à reconnaître `</nom:id>` dans le texte
 * d'un message, côté client — mais le module doit se charger pour les énumérations qu'il
 * apporte.
 *
 * La réécriture porte sur le paquet, pas sur `node_modules`, qu'un `npm install`
 * remettrait à zéro.
 */
const CLASSES_SANS_ICU = {
    "\\p{Letter}":
        "a-zA-Z\\u00AA\\u00B5\\u00BA\\u00C0-\\u02AF\\u0370-\\u058F\\u05D0-\\u05F2" +
        "\\u0620-\\u064A\\u0671-\\u06D3\\u0710-\\u072F\\u0780-\\u07A5\\u0905-\\u0939" +
        "\\u0E01-\\u0E2E\\u10A0-\\u10FF\\u1100-\\u11FF\\u1E00-\\u1FFF\\u3041-\\u3096" +
        "\\u30A1-\\u30FA\\u3105-\\u312F\\u4E00-\\u9FFF\\uAC00-\\uD7A3\\uF900-\\uFAFF",
    "\\p{Number}": "0-9\\u0660-\\u0669\\u06F0-\\u06F9\\u0966-\\u096F\\u0E50-\\u0E59\\uFF10-\\uFF19",
    "\\p{sc=Deva}": "\\u0900-\\u097F",
    "\\p{Script=Devanagari}": "\\u0900-\\u097F",
    "\\p{sc=Thai}": "\\u0E00-\\u0E7F",
    "\\p{Script=Thai}": "\\u0E00-\\u0E7F",
};

function adapterAuV8SansIcu (fichier) {
    let texte = readFileSync(fichier, "utf8");
    let remplacements = 0;
    for (const [propriete, plages] of Object.entries(CLASSES_SANS_ICU)) {
        const avant = texte.split(propriete).length - 1;
        if (avant === 0) continue;
        texte = texte.replaceAll(propriete, plages);
        remplacements += avant;
    }

    /*
     * Le garde-fou. Une propriété oubliée ne se verrait qu'au lancement de l'application,
     * sous la forme d'un écran qui se ferme : mieux vaut que la compilation s'arrête ici.
     */
    const restantes = texte.match(/\\p\{[^}]*\}/g);
    if (restantes) {
        throw new Error(
            "Propriétés Unicode encore présentes dans le paquet, que nodejs-mobile refusera : " +
                [...new Set(restantes)].join(", ") +
                "\nAjoute-les à CLASSES_SANS_ICU dans scripts/buildMobile.mjs.",
        );
    }

    if (remplacements === 0) {
        console.log("[mobile] aucune propriété Unicode à adapter");
        return;
    }
    writeFileSync(fichier, texte, "utf8");
    console.log(`[mobile] ${remplacements} propriété(s) Unicode remplacée(s) par des plages (nodejs-mobile est sans ICU)`);
}

async function compiler () {
    mkdirSync(sortie, { recursive: true });

    await esbuild.build({
        entryPoints: [path.join(racine, "src", "Mobile", "server.ts")],
        outfile: path.join(sortie, "main.js"),
        bundle: true,
        platform: "node",
        /*
         * nodejs-mobile est bâti sur Node 18 : viser plus haut laisserait passer une
         * syntaxe que le téléphone ne sait pas lire, et l'erreur n'apparaîtrait qu'au
         * lancement de l'application.
         */
        target: "node18",
        format: "cjs",
        alias: calques,
        /*
         * Ces trois-là ne sont requis que par du code que le portage n'atteint pas, et
         * tirent des binaires natifs ou l'exécutable d'Electron.
         */
        external: ["electron-context-menu", "@electron/remote", "fsevents"],
        minify: true,
        /*
         * `keepNames` est indispensable : `registerRouteSync` reconnaît un routeur Express
         * au nom de sa fonction (`router`), que la minification renommerait — et les 133
         * routes seraient alors toutes refusées, au profit du proxy, sans rien casser de
         * visible avant la première page blanche.
         */
        keepNames: true,
        sourcemap: false,
        legalComments: "none",
        logLevel: "info",
        define: { "process.env.NODE_ENV": '"production"' },
    });

    adapterAuV8SansIcu(path.join(sortie, "main.js"));

    await esbuild.build({
        entryPoints: [path.join(racine, "src", "Mobile", "pont.ts")],
        outfile: path.join(sortie, "mobile", "pont.js"),
        bundle: true,
        platform: "browser",
        target: "chrome111",
        format: "iife",
        minify: true,
        legalComments: "none",
        logLevel: "info",
    });
}

/** Ce que le serveur sert depuis le disque, et rien de plus. */
function copierRessources () {
    const aCopier = [
        ["assets/snapshot", "assets/snapshot"],
        ["assets/startup", "assets/startup"],
        ["assets/account", "assets/account"],
        ["assets/langue", "assets/langue"],
        ["assets/voidcord-editor", "assets/voidcord-editor"],
        ["assets/branding", "assets/branding"],
        ["assets/icon.png", "assets/icon.png"],
        ["VencordExtension/content.js", "VencordExtension/content.js"],
        ["VencordExtension/dist", "VencordExtension/dist"],
        ["VencordExtension/vendor", "VencordExtension/vendor"],
        ["build/Renderer/Settings", "build/Renderer/Settings"],
    ];
    for (const [depuis, vers] of aCopier) {
        const source = path.join(racine, depuis);
        if (!existsSync(source)) {
            console.warn(`[mobile] absent, ignoré : ${depuis}`);
            continue;
        }
        const cible = path.join(sortie, vers);
        rmSync(cible, { recursive: true, force: true });
        mkdirSync(path.dirname(cible), { recursive: true });
        cpSync(source, cible, { recursive: true });
    }
    /*
     * nodejs-mobile charge `main.js` d'un dossier de projet : un `package.json` minimal
     * suffit, et évite qu'il remonte chercher celui du dépôt.
     */
    writeFileSync(
        path.join(sortie, "package.json"),
        `${JSON.stringify({ name: "voidcord-mobile", version: "1.0.0", main: "main.js", private: true }, null, 2)}\n`,
        "utf8",
    );
    console.log(`[mobile] ressources copiées dans ${path.relative(racine, sortie)}`);
}

engendrerRoutes();
await compiler();
copierRessources();
console.log("[mobile] prêt — `cd android && ./gradlew assembleDebug`");
