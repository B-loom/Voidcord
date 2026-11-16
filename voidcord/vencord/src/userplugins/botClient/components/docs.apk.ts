/* Copyright Elysia © 2025. All rights reserved */

/*
 * Ce que l'onglet Voidcord affiche sur Android, et nulle part ailleurs.
 *
 * Le portage Android vit dans son propre dépôt — B-loom/Voidcord-Apk — avec sa version,
 * son changelog et ses publications. Lui faire afficher la documentation de l'application
 * de bureau mentait deux fois : sur ce qui tourne, et sur ce qu'il faut faire pour
 * l'installer. `VoidcordTab` choisit entre ces textes et ceux de `docs.ts` selon la
 * plateforme ; rien de ce qui est ici n'atteint la version PC.
 *
 * Les deux langues sont côte à côte, comme partout dans le projet.
 */

export const README_APK = `# Voidcord Apk

Voidcord sur ton téléphone Android : tes comptes Discord et tes bots dans une seule
application.

Rien n'a été réécrit. C'est le même serveur, les mêmes routes, les mêmes écrans de
réglages, la même animation de démarrage et le même calque Vencord que sur l'ordinateur.
Seul ce qui passait par Electron a dû être remplacé.

## Comment ça marche

Sur un ordinateur, Voidcord est un serveur local devant lequel Electron place une fenêtre,
en faisant croire au client Discord qu'il parle à \`discord.com\`. Une WebView ne sait pas
détourner un nom de domaine : le client est donc servi depuis \`http://127.0.0.1\` — que
Chromium traite comme une origine sûre — et Node.js tourne à l'intérieur de l'application.

## Installer

Télécharge l'APK qui correspond à ton téléphone depuis les versions publiées, ouvre-le
depuis ton gestionnaire de fichiers, et autorise l'installation de sources inconnues quand
Android le demande. Presque tous les téléphones vendus depuis 2019 veulent le fichier
\`arm64-v8a\`.

Android 8.0 ou plus récent. Pas besoin de root.

## Ce qui ne marche pas

Une partie vient de Voidcord, l'autre de Discord.

- **Le partage d'écran.** Une page web n'a aucun accès à l'image de l'appareil, et Android
  ne le lui donne pas.
- **La détection de jeux.** Elle lit les processus de Windows.
- **Les mises à jour.** Android exige que tu confirmes toi-même l'installation d'un APK :
  l'application annonce la nouvelle version et ouvre la page des publications.
- **La boutique, Nitro et les quêtes.** Ces pages demandent les rouages de paiement du
  client officiel. Leurs entrées sont retirées.

## Où trouver le reste

Le dépôt : https://github.com/B-loom/Voidcord-Apk

Le site : https://b-loom.github.io/Voidcord-Apk/
`;

export const README_APK_EN = `# Voidcord Apk

Voidcord on your Android phone: your Discord accounts and your bots in one app.

Nothing was rewritten. It is the same server, the same routes, the same settings screens,
the same startup animation and the same Vencord layer as the desktop version. Only what
went through Electron had to be replaced.

## How it works

On a computer, Voidcord is a local server with an Electron window in front of it, and
Electron makes the Discord client believe it is talking to \`discord.com\`. A WebView
cannot redirect a domain name, so the client is served from \`http://127.0.0.1\` — which
Chromium treats as a secure origin — and Node.js runs inside the app itself.

## Install

Download the APK for your phone from the published releases, open it from your file
manager, and allow installation from unknown sources when Android asks. Almost every phone
sold since 2019 needs the \`arm64-v8a\` file.

Android 8.0 or newer. No root needed.

## What does not work

Some of this is Voidcord, some of it is Discord.

- **Screen sharing.** A web page has no access to the device's screen, and Android does not
  grant it one.
- **Game detection.** It reads Windows processes.
- **Updates.** Android requires you to confirm an APK install yourself: the app announces
  the new version and opens the releases page.
- **The shop, Nitro and quests.** Those pages need the official client's payment
  machinery. Their entries are removed.

## Where to find the rest

The repository: https://github.com/B-loom/Voidcord-Apk

The website: https://b-loom.github.io/Voidcord-Apk/
`;

export const CHANGELOG_APK = `# Nouveautés

## 1.0.0

**La première version.** Voidcord tourne sur Android : tout le serveur et ses 133 routes,
les écrans de réglages, la connexion par compte, l'animation de démarrage et le calque
Vencord — le même code que sur l'ordinateur, avec Node.js qui tourne dans l'application.

- Le serveur Voidcord tourne dans l'application par nodejs-mobile, et une WebView charge
  le client Discord depuis \`http://127.0.0.1\`, sur un port fixe pour que les comptes
  restent connectés d'un lancement à l'autre.
- Electron est remplacé par un calque : \`net.fetch\` et \`net.request\` avec leur pot à
  cookies, le journal, l'IPC, les préchargements et les redirections d'images.
- Voidcord se présente comme un navigateur de bureau, le seul client que Discord laisse
  entrer avec le vocal, les GIF, les autocollants et les émojis personnalisés.
- L'animation de démarrage se joue en paysage, puis le téléphone retrouve son orientation.
- Les écrans de réglages, de comptes, de langue, d'éditeur de message et de captcha sont
  ceux du bureau, sans modification.
- Un appui long ouvre le menu de Discord au lieu de sélectionner le texte.
- Un appel continue quand on quitte l'application, tenu par un service de premier plan.
- La boutique, Nitro et les quêtes sont retirés : ces pages ne mènent nulle part ici.
`;

export const CHANGELOG_APK_EN = `# What's new

## 1.0.0

**The first version.** Voidcord runs on Android: the whole server and its 133 routes, the
settings screens, the account sign-in, the startup animation and the Vencord layer — the
same code as the desktop version, with Node.js running inside the app.

- The Voidcord server runs inside the app through nodejs-mobile, and a WebView loads the
  Discord client from \`http://127.0.0.1\`, on a fixed port so accounts stay signed in from
  one launch to the next.
- Electron is replaced by a layer of its own: \`net.fetch\` and \`net.request\` with their
  cookie jar, the log, the IPC, the preloads and the branding redirects.
- Voidcord presents itself as a desktop browser, the only client Discord lets in with
  voice, GIFs, stickers and custom emoji.
- The startup animation plays in landscape, then the phone returns to its own orientation.
- The settings, accounts, language, message editor and captcha screens are the desktop
  pages, unchanged.
- A long press opens Discord's menu instead of selecting text.
- A call keeps running when you leave the app, held by a foreground service.
- The shop, Nitro and quests are removed: those pages lead nowhere here.
`;
