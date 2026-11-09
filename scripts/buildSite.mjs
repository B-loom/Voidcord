/* Copyright Elysia © 2025. All rights reserved */

/*
 * Le site est engendré depuis le projet lui-même : la page de documentation depuis les
 * readme, le changelog depuis celui qu'embarque le client, la licence depuis LICENSE et
 * le numéro depuis package.json. Rien n'est écrit deux fois, donc rien ne peut dériver.
 *
 * Il paraît en deux langues. L'anglais est à la racine, parce que c'est ce que lira
 * quelqu'un qui arrive sans rien savoir du projet ; le français vit sous /fr/. Chaque
 * page porte le lien vers son équivalent dans l'autre langue, et les deux jeux sortent
 * des mêmes sources : une traduction oubliée se verrait tout de suite.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "docs");

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const licence = fs.readFileSync(path.join(root, "LICENSE"), "utf8");

/** Le changelog vit dans un littéral gabarit : on le relit en défaisant les échappements */
function changelogDe (fichier, nom) {
    const source = fs.readFileSync(
        path.join(root, "voidcord/vencord/src/userplugins/botClient/components", fichier),
        "utf8",
    );
    const trouve = new RegExp(`export const ${nom} = \`([\\s\\S]*?)\`;`).exec(source);
    if (!trouve) throw new Error(`${nom} est introuvable dans ${fichier}`);
    return trouve[1]
        .split("\\`").join("`")
        .split("\\${").join("${")
        .split("\\\\").join("\\");
}

const REPO = "https://github.com/B-loom/Voidcord";
const INVITE = "https://discord.gg/TNTYSmy4mX";
const DOWNLOAD = `${REPO}/releases/latest/download/Voidcord-win-x64.exe`;
const ORIGINE = "https://github.com/aiko-chan-ai/DiscordBotClient";

const escape = (text) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** **bold**, `code` and [links](url), in that order so none swallows another */
function inline (text) {
    return escape(text)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Just enough Markdown for what this project writes: no tables, no images */
function markdown (source) {
    const html = [];
    let list = null;
    let quote = null;

    const closeList = () => {
        if (!list) return;
        html.push(`<${list.tag}>${list.items.map(i => `<li>${i}</li>`).join("")}</${list.tag}>`);
        list = null;
    };
    const closeQuote = () => {
        if (!quote) return;
        html.push(`<blockquote>${quote.map(line => `<p>${line}</p>`).join("")}</blockquote>`);
        quote = null;
    };

    for (const raw of source.split("\n")) {
        const line = raw.trimEnd();

        if (line.startsWith(">")) {
            closeList();
            const text = line.replace(/^>\s?/, "");
            if (text.trim()) (quote ??= []).push(inline(text));
            else closeQuote();
            continue;
        }
        closeQuote();

        const ordered = /^\d+\.\s+(.*)$/.exec(line);
        const bullet = /^[-*]\s+(.*)$/.exec(line);

        if (bullet || ordered) {
            const tag = bullet ? "ul" : "ol";
            if (list && list.tag !== tag) closeList();
            list ??= { tag, items: [] };
            list.items.push(inline((bullet ?? ordered)[1]));
            continue;
        }

        // An indented line continues the bullet above it
        if (list && /^\s+\S/.test(raw)) {
            list.items[list.items.length - 1] += ` ${inline(line.trim())}`;
            continue;
        }

        closeList();

        if (/^-{3,}$/.test(line)) html.push("<hr>");
        else if (line.startsWith("### ")) html.push(`<h3>${inline(line.slice(4))}</h3>`);
        else if (line.startsWith("## ")) html.push(`<h2>${inline(line.slice(3))}</h2>`);
        else if (line.startsWith("# ")) html.push(`<h1>${inline(line.slice(2))}</h1>`);
        else if (line.trim()) html.push(`<p>${inline(line)}</p>`);
    }

    closeList();
    closeQuote();
    return html.join("\n");
}

const DISCORD_ICON = `<svg viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z"/></svg>`;
const GITHUB_ICON = `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;
const DOWNLOAD_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3v10.6l3.3-3.3 1.4 1.4-5.7 5.7-5.7-5.7 1.4-1.4L10 13.6V3h2ZM4 19h16v2H4v-2Z"/></svg>`;

/*
 * Tout ce qui se dit sur le site, une langue par entrée. L'anglais d'abord : c'est lui
 * qui sort à la racine.
 */
const LANGUES = [
    {
        code: "en",
        dossier: "",
        autre: { code: "fr", libelle: "Français", href: "fr/" },
        readme: "readme.en.md",
        changelog: () => changelogDe("docs.en.ts", "CHANGELOG_EN"),
        description: "A desktop Discord client that brings your Discord accounts and your bots together in one application.",
        resume: "Your Discord accounts and your bots in one application.",
        nav: [
            { fichier: "index.html", libelle: "Home" },
            { fichier: "documentation.html", libelle: "Documentation" },
            { fichier: "changelog.html", libelle: "What's new" },
            { fichier: "licence.html", libelle: "Licence" },
        ],
        titres: {
            index: "Voidcord",
            documentation: "Documentation · Voidcord",
            changelog: "What's new · Voidcord",
            licence: "Licence · Voidcord",
        },
        piedDePage: ["Source code", "All releases", "Discord server"],
        accroche: `Your Discord accounts and your bots in one application.
        One window per account, the same client for all of them.`,
        telecharger: "Download for Windows",
        serveur: "Discord server",
        source: "Source code",
        version: "Version",
        voirNouveautes: "See what's new",
        note: "Windows 64-bit · installer · automatic updates",
        titreFonctions: "What Voidcord does",
        fonctions: [
            ["Accounts and bots together", "Sign in by email, by account token or by bot token. Captcha and two-factor handled."],
            ["As many accounts as you like", "Each in its own window and its own session, sorted between users and bots."],
            ["Game detection", "The game you are playing shows on your profile, without the official client."],
            ["Message editor", "Embeds, buttons, files and an emoji catalogue, for bots."],
            ["In French, or in English", "The interface, the plugins and the error messages follow the language you choose."],
            ["Updates", "Voidcord tells you when a version is out, downloads it and installs it on restart."],
        ],
        titreInstaller: "Installing",
        etapes: [
            "Download <strong>Voidcord-win-x64.exe</strong> with the button above.",
            "Run it. Windows will show a warning, the application not being signed with a paid certificate: go through <strong>More info</strong>, then <strong>Run anyway</strong>.",
            "Choose the install folder. That's all.",
        ],
        titreAvertissements: "Read this before using Voidcord",
        avertissements: [
            [
                "A third-party client goes against Discord's terms of service.",
                "Logging in with a user account from anything other than the official client can get that account disabled. Bots use the official API and do not have this problem.",
            ],
            [
                "No responsibility is taken.",
                "Not for a banned account, not for a deleted bot, not for lost data, not for anything else. You use it at your own risk.",
            ],
            [
                "Voidcord is not an original project.",
                `It is a modified version of <a href="${ORIGINE}">aiko-chan-ai/DiscordBotClient</a>, which deserves all the credit for the underlying work. When Discord changes and the client breaks, the fix is awaited from the original project before being carried over here.`,
            ],
            [
                'This project was written with <a href="https://claude.ai">Claude</a>.',
                "Anthropic's assistant.",
            ],
        ],
        titreAide: "A bug, a question?",
        aide: `Everything happens on <a href="${INVITE}">the Discord server</a>. For a bug, say what
        you were doing, what happened, and whether you were signed in with an account or
        with a bot: the two do not follow the same path through the application, and the
        answer depends on it.`,
        licenceTitre: "Licence",
        licenceTexte: "Voidcord is published under the <strong>GNU General Public License v3</strong>, like the project it derives from.",
    },
    {
        code: "fr",
        dossier: "fr",
        autre: { code: "en", libelle: "English", href: "../" },
        readme: "readme.fr.md",
        changelog: () => changelogDe("docs.ts", "CHANGELOG"),
        description: "Un client Discord de bureau qui réunit tes comptes Discord et tes bots dans une seule application.",
        resume: "Tes comptes Discord et tes bots dans une seule application.",
        nav: [
            { fichier: "index.html", libelle: "Accueil" },
            { fichier: "documentation.html", libelle: "Documentation" },
            { fichier: "changelog.html", libelle: "Nouveautés" },
            { fichier: "licence.html", libelle: "Licence" },
        ],
        titres: {
            index: "Voidcord",
            documentation: "Documentation · Voidcord",
            changelog: "Nouveautés · Voidcord",
            licence: "Licence · Voidcord",
        },
        piedDePage: ["Code source", "Toutes les versions", "Serveur Discord"],
        accroche: `Tes comptes Discord et tes bots dans une seule application.
        Une fenêtre par compte, le même client pour tous.`,
        telecharger: "Télécharger pour Windows",
        serveur: "Serveur Discord",
        source: "Code source",
        version: "Version",
        voirNouveautes: "Voir les nouveautés",
        note: "Windows 64 bits · installateur · mises à jour automatiques",
        titreFonctions: "Ce que fait Voidcord",
        fonctions: [
            ["Comptes et bots ensemble", "Connexion par e-mail, par token de compte ou par token de bot. Captcha et double authentification gérés."],
            ["Autant de comptes que voulu", "Chacun dans sa fenêtre et sa session, rangés entre utilisateurs et bots."],
            ["Détection des jeux", "Le jeu en cours apparaît sur ton profil, sans le client officiel."],
            ["Éditeur de messages", "Embeds, boutons, fichiers et catalogue d'émojis, pour les bots."],
            ["En français, ou en anglais", "L'interface, les plugins et les messages d'erreur suivent la langue choisie."],
            ["Mises à jour", "Voidcord prévient quand une version paraît, la télécharge et l'installe au redémarrage."],
        ],
        titreInstaller: "Installer",
        etapes: [
            "Télécharge <strong>Voidcord-win-x64.exe</strong> avec le bouton plus haut.",
            "Lance-le. Windows affichera un avertissement, l'application n'étant pas signée par un certificat payant : passe par <strong>Informations complémentaires</strong> puis <strong>Exécuter quand même</strong>.",
            "Choisis le dossier d'installation. C'est tout.",
        ],
        titreAvertissements: "À lire avant d'utiliser Voidcord",
        avertissements: [
            [
                "Un client tiers est contraire aux conditions d'utilisation de Discord.",
                "Se connecter avec un compte utilisateur depuis autre chose que le client officiel peut entraîner la désactivation de ce compte. Les bots, eux, passent par l'API officielle et ne posent pas ce problème.",
            ],
            [
                "Aucune responsabilité n'est assumée.",
                "Ni pour un compte banni, ni pour un bot supprimé, ni pour une perte de données, ni pour quoi que ce soit d'autre. Tu l'utilises à tes risques.",
            ],
            [
                "Voidcord n'est pas un projet original.",
                `C'est une version modifiée de <a href="${ORIGINE}">aiko-chan-ai/DiscordBotClient</a>, à qui revient tout le travail de fond. Quand Discord change et que le client casse, la correction est attendue du projet d'origine avant d'être reprise ici.`,
            ],
            [
                'Ce projet a été écrit avec <a href="https://claude.ai">Claude</a>.',
                "L'assistant d'Anthropic.",
            ],
        ],
        titreAide: "Un bug, une question&nbsp;?",
        aide: `Tout se passe sur <a href="${INVITE}">le serveur Discord</a>. Pour un bug, dis ce que
        tu faisais, ce qui s'est passé, et si tu étais connecté avec un compte ou avec un
        bot&nbsp;: les deux ne suivent pas le même chemin dans l'application, et la réponse
        en dépend.`,
        licenceTitre: "Licence",
        licenceTexte: "Voidcord est publiée sous la <strong>GNU General Public License v3</strong>, comme le projet dont elle dérive.",
    },
];

/**
 * Une page complète. `racine` est le chemin vers les fichiers communs — la feuille de
 * style et l'icône vivent à la racine du site, et les pages françaises sont un cran plus
 * bas.
 */
function page (langue, { fichier, titre, corps, large = false }) {
    const racine = langue.dossier ? "../" : "";

    const nav = langue.nav.map(item =>
        `<a class="${item.fichier === fichier ? "nav-link current" : "nav-link"}" href="${item.fichier}">${item.libelle}</a>`,
    ).join("");

    /*
     * Le lien de langue mène à la même page dans l'autre langue, pas à son accueil :
     * changer de langue au milieu du changelog doit laisser sur le changelog.
     */
    const ailleurs = `${langue.autre.href}${fichier}`;

    return `<!doctype html>
<html lang="${langue.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title>
<meta name="description" content="${langue.description}">
<link rel="icon" href="${racine}icon.png">
<link rel="stylesheet" href="${racine}style.css">
<link rel="alternate" hreflang="${langue.autre.code}" href="${ailleurs}">
<link rel="alternate" hreflang="${langue.code}" href="${fichier}">
<meta property="og:title" content="${titre}">
<meta property="og:description" content="${langue.resume}">
<meta property="og:image" content="${racine}icon.png">
</head>
<body>

<nav class="topbar">
    <a class="brand" href="index.html">
        <img src="${racine}icon.png" alt="">
        <span>Voidcord</span>
        <span class="version">v${pkg.version}</span>
    </a>
    <div class="nav-links">${nav}</div>
    <a class="lang" href="${ailleurs}" hreflang="${langue.autre.code}" lang="${langue.autre.code}">${langue.autre.libelle}</a>
</nav>

<main class="${large ? "wrap wide" : "wrap"}">
${corps}
</main>

<footer>
    <a href="${REPO}">${langue.piedDePage[0]}</a>
    <span>·</span>
    <a href="${REPO}/releases">${langue.piedDePage[1]}</a>
    <span>·</span>
    <a href="${INVITE}">${langue.piedDePage[2]}</a>
</footer>

</body>
</html>
`;
}

function accueil (langue, changelog) {
    // Le premier titre du changelog est la version la plus récente : elle a sa place ici
    const derniere = /^## (v[\d.]+)\s*—\s*(.+)$/m.exec(changelog);

    return `
<header class="hero">
    <img class="hero-icon" src="${langue.dossier ? "../" : ""}icon.png" alt="">
    <h1>Voidcord</h1>
    <p class="tagline">
        ${langue.accroche}
    </p>

    <div class="actions">
        <a class="btn btn-main" href="${DOWNLOAD}">${DOWNLOAD_ICON} ${langue.telecharger}</a>
        <a class="btn btn-ghost" href="${INVITE}">${DISCORD_ICON} ${langue.serveur}</a>
        <a class="btn btn-ghost" href="${REPO}">${GITHUB_ICON} ${langue.source}</a>
    </div>

    <div class="release">
        <span class="pill">${langue.version} ${pkg.version}</span>
        ${derniere ? `<span class="release-name">${escape(derniere[2])}</span>` : ""}
        <a class="release-link" href="changelog.html">${langue.voirNouveautes}</a>
    </div>

    <p class="note">${langue.note}</p>
</header>

<section>
    <h2>${langue.titreFonctions}</h2>
    <div class="grid">
        ${langue.fonctions.map(([titre, texte]) => `<div class="card"><h3>${titre}</h3><p>${texte}</p></div>`).join("\n        ")}
    </div>
</section>

<section>
    <h2>${langue.titreInstaller}</h2>
    <ol class="steps">
        ${langue.etapes.map(etape => `<li>${etape}</li>`).join("\n        ")}
    </ol>
</section>

<section>
    <h2>${langue.titreAvertissements}</h2>

    ${langue.avertissements.map(([titre, texte]) => `<div class="warn">
        <strong>${titre}</strong>
        <p>${texte}</p>
    </div>`).join("\n\n    ")}
</section>

<section>
    <h2>${langue.titreAide}</h2>
    <p class="muted">
        ${langue.aide}
    </p>
</section>
`;
}

let compte = 0;

for (const langue of LANGUES) {
    const dossier = path.join(out, langue.dossier);
    fs.mkdirSync(dossier, { recursive: true });

    const readme = fs.readFileSync(path.join(root, langue.readme), "utf8");
    const changelog = langue.changelog();

    const pages = [
        { fichier: "index.html", titre: langue.titres.index, corps: accueil(langue, changelog) },
        {
            fichier: "documentation.html",
            titre: langue.titres.documentation,
            corps: `<article class="prose">${markdown(readme)}</article>`,
        },
        {
            fichier: "changelog.html",
            titre: langue.titres.changelog,
            corps: `<article class="prose changelog">${markdown(changelog)}</article>`,
        },
        {
            fichier: "licence.html",
            titre: langue.titres.licence,
            corps: `<article class="prose">
<h1>${langue.licenceTitre}</h1>
<p>${langue.licenceTexte}</p>
<pre class="licence">${escape(licence)}</pre>
</article>`,
            large: true,
        },
    ];

    for (const entree of pages) {
        fs.writeFileSync(path.join(dossier, entree.fichier), page(langue, entree));
        compte++;
    }
}

console.log(`Site engendré (${compte} pages, ${LANGUES.length} langues, version ${pkg.version})`);
