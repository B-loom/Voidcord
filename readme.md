<!--
  Fichier produit : readme.en.md et readme.fr.md sont les originaux,
  scripts/syncReadme.mjs les réunit ici à chaque compilation.
  Toute modification faite directement dans ce fichier sera perdue.
-->

**English below · [Version française](#francais)**

# Nebula

Nebula is a desktop Discord client that brings **your Discord accounts** and **your bots**
together in one application: one window per account, the same client for all of them.

---

## ⚠️ Read this before using Nebula

> **This project was written with [Claude](https://claude.ai), Anthropic's assistant.**

> **I am responsible for nothing.** Not for a disabled or banned account, not for a deleted
> bot, not for lost data, not for your computer crashing, not for anything else that
> happens while using Nebula. You use it at your own risk.

> **A third-party client goes against Discord's terms of service.** Logging in with a user
> account from anything other than the official client can get that account disabled. Bots
> use the official API and do not have this problem.

> **Nebula is not an original project.** It is a modified version of
> **[aiko-chan-ai/DiscordBotClient](https://github.com/aiko-chan-ai/DiscordBotClient)**,
> which deserves all the credit for the underlying work. Thank you to its author.

> **Discord updates do not come from me.** When Discord changes and the client breaks, I
> wait for **aiko-chan-ai** to publish an update to the original project, then carry it
> over here. So time can pass between something breaking and it being fixed.

`requirement` installs the root lockfile, checks out the pinned Vencord, BotClient plugin, and Discohook revisions from `scripts/build-dependencies.json`. Existing checkouts are never reset; a mismatched revision stops with an error so local work is not lost. `build` packages locally without publishing. Maintainers should use the [release process](docs/release-process.md) for tags and artifacts. After building, run `npm run typecheck` for TypeScript and `npm test` on Windows for the Electron integration suite. Use `npm start` to launch the app.

---

## The website

**https://b-loom.github.io/discord-bot-client-Nebula/**

Download, documentation, what's new and licence, all in one place.

## Installing

Download the latest installer from the website or from the
[Releases](https://github.com/B-loom/discord-bot-client-Nebula/releases) page, then run it.
It lets you choose the install folder and creates the usual shortcuts.

Windows will probably show a warning on launch: the application is not signed with a paid
certificate. Go through "More info", then "Run anyway".

## Signing in

### With a Discord account

Open the login window — from the link under the sign-in button, from "Add an account", or
from Nebula's icon in the system tray. Enter your email address and your password; Nebula
handles the rest:

- the captcha, in a window of its own;
- two-factor authentication, by app, by SMS or by backup code.

You can also paste an account token directly if you already have one.

Only the token is kept, in the `accounts.json` file inside Nebula's data folder, on this
computer. **Your password is never saved** and never leaves the login window.

### With a bot

Paste the bot's token on the login screen. Remember to enable the **MessageContent** intent
in your application's settings on the developer portal, otherwise the client will show
empty messages.

## Several accounts at once

Every saved account opens in its own window, with its own session: one user account and ten
bots can run side by side without getting in each other's way. The "Open in a new window"
button in the login window does this.

In the account picker, user accounts and bots are listed under two separate headings.

## What a bot cannot do

A bot has no Nitro, no subscription and no payment method; it has no friends and no direct
messages in the usual sense, and it cannot join a server from a client — only the server
owner can add it, through its OAuth invite link.

The pages concerned are not hidden: they explain why they are of no use here. With a user
account, the usual Discord client comes back.

## What Nebula adds

- **Game detection**: the game you are playing shows on your profile, without the official
  client.
- **Message editor**: embeds, buttons, files and an emoji catalogue, for bots. The older,
  simpler embed editor is still available in the BotClient plugin's settings.
- **Appearance**: a plugin to change the displayed name and pick your badges. Purely
  visual, nothing is sent to Discord.
- **Interface in French**, error messages included.

## Settings

Right-click the icon in the system tray, then **Settings**, to open the settings window:
startup screen style, encrypted DNS and which provider, system proxy, guilds per shard,
automatic update checks. A search box at the top of the window finds a setting by name.

Some settings only take effect on the next launch; the window says so for each of them.

## Updates

Shortly after starting, Nebula checks whether a newer version exists on this repository's
releases page. If there is one, a notification tells you and the update downloads in the
background; it installs when you close the application.

This check can be turned off in the settings; the manual check, from the **Nebula** tab,
remains available.

Each version's changes are in the client's **Nebula → What's new** tab, and this page is
the text you are reading in **Nebula → Documentation**.

## A bug, a question?

Join the Discord server: **https://discord.gg/TNTYSmy4mX**

That is the only place where I answer. For a bug, say what you were doing, what happened,
and whether you were signed in with an account or with a bot — the two do not follow the
same path through the application, and the answer depends on it.

## Licence and credits

Original work: **[aiko-chan-ai/DiscordBotClient](https://github.com/aiko-chan-ai/DiscordBotClient)**.
Nebula is a personal modification of it, written with Claude.

---

<a name="francais"></a>

# Nebula

Nebula est un client Discord de bureau qui réunit **tes comptes Discord** et **tes bots**
dans une seule application : une fenêtre par compte, le même client pour tous.

---

## ⚠️ À lire avant d'utiliser Nebula

> **Ce projet a été écrit avec [Claude](https://claude.ai), l'assistant d'Anthropic.**

> **Je ne suis responsable de rien.** Ni d'un compte désactivé ou banni, ni d'un bot
> supprimé, ni d'une perte de données, ni d'un plantage de ton ordinateur, ni de quoi que
> ce soit d'autre qui arriverait en utilisant Nebula. Tu l'utilises à tes risques.

> **Un client tiers est contraire aux conditions d'utilisation de Discord.** Se connecter
> avec un compte utilisateur depuis autre chose que le client officiel peut entraîner la
> désactivation de ce compte. Les bots, eux, utilisent l'API officielle et ne posent pas
> ce problème.

> **Nebula n'est pas un projet original.** C'est une version modifiée de
> **[aiko-chan-ai/DiscordBotClient](https://github.com/aiko-chan-ai/DiscordBotClient)**,
> à qui revient tout le travail de fond. Merci à l'auteur.

> **Les mises à jour de Discord ne viennent pas de moi.** Quand Discord change et que le
> client casse, j'attends que **aiko-chan-ai** publie une mise à jour du projet d'origine,
> puis je la reprends ici. Il peut donc s'écouler du temps entre le moment où quelque
> chose casse et le moment où c'est réparé.

`requirement` installs the root lockfile, checks out the pinned Vencord, BotClient plugin, and Discohook revisions from `scripts/build-dependencies.json`. Existing checkouts are never reset; a mismatched revision stops with an error so local work is not lost. `build` packages locally without publishing. Maintainers should use the [release process](docs/release-process.md) for tags and artifacts. After building, run `npm run typecheck` for TypeScript and `npm test` on Windows for the Electron integration suite. Use `npm start` to launch the app.

---

## Le site

**https://b-loom.github.io/discord-bot-client-Nebula/**

Téléchargement, documentation, nouveautés et licence, au même endroit.

## Installer

Télécharge l'installateur de la dernière version depuis le site ou depuis la page
[Releases](https://github.com/B-loom/discord-bot-client-Nebula/releases), puis lance-le.
Il te laisse choisir le dossier d'installation et crée les raccourcis habituels.

Windows affichera probablement un avertissement au lancement : l'application n'est pas
signée par un certificat payant. Passe par « Informations complémentaires » puis
« Exécuter quand même ».

## Se connecter

### Avec un compte Discord

Ouvre la fenêtre de connexion — depuis le lien sous le bouton de connexion, depuis
« Ajouter un compte », ou depuis l'icône de Nebula dans la barre des tâches. Saisis ton
adresse e-mail et ton mot de passe ; Nebula s'occupe du reste :

- le captcha, dans une fenêtre dédiée ;
- la double authentification, par application, par SMS ou par code de secours.

Tu peux aussi coller directement un token de compte si tu en as déjà un.

Seul le token est conservé, dans le fichier `accounts.json` du dossier de données de
Nebula, sur cet ordinateur. **Ton mot de passe n'est jamais enregistré** et ne quitte pas
la fenêtre de connexion.

### Avec un bot

Colle le token du bot sur l'écran de connexion. Pense à activer l'intent
**MessageContent** dans les paramètres de ton application sur le portail développeur,
sinon le client affichera des messages vides.

## Plusieurs comptes à la fois

Chaque compte enregistré s'ouvre dans sa propre fenêtre, avec sa propre session : un
compte utilisateur et dix bots peuvent tourner côte à côte sans se gêner. Le bouton
« Ouvrir dans une nouvelle fenêtre » de la fenêtre de connexion s'en charge.

Dans le sélecteur de comptes, les comptes utilisateurs et les bots sont rangés sous deux
intitulés séparés.

## Ce qu'un bot ne peut pas faire

Un bot n'a ni Nitro, ni abonnement, ni moyen de paiement ; il n'a pas d'amis et pas de
messages privés au sens habituel, et il ne peut pas rejoindre un serveur depuis un client
— seul le propriétaire du serveur peut l'ajouter, via son lien d'invitation OAuth.

Les pages concernées ne sont pas cachées : elles expliquent pourquoi elles ne servent à
rien ici. Avec un compte utilisateur, le client Discord habituel revient.

## Ce que Nebula ajoute

- **Détection des jeux** : le jeu en cours apparaît sur le profil, sans le client officiel.
- **Éditeur de messages** : embeds, boutons, fichiers et catalogue d'émojis, pour les bots.
  L'ancien éditeur d'embed, plus simple, reste disponible dans les réglages du plugin
  BotClient.
- **Apparence** : un plugin pour changer le nom affiché et choisir ses badges. Purement
  visuel, rien n'est envoyé à Discord.
- **Interface en français**, y compris les messages d'erreur.

## Réglages

Un clic droit sur l'icône dans la zone de notification, puis **Paramètres**, ouvre la
fenêtre des réglages : style de l'écran de démarrage, DNS chiffré et choix du
fournisseur, proxy du système, nombre de serveurs par shard, recherche automatique des
mises à jour. Une recherche en haut de la fenêtre retrouve un réglage par son nom.

Certains réglages ne prennent effet qu'au lancement suivant ; la fenêtre le dit pour
chacun d'eux.

## Mises à jour

Nebula regarde, peu après son démarrage, s'il existe une version plus récente sur la page
des releases de ce dépôt. Si c'est le cas, une notification te le dit et la mise à jour se
télécharge en arrière-plan ; elle s'installe à la fermeture de l'application.

Cette recherche peut être coupée dans les réglages ; la recherche manuelle, depuis
l'onglet **Nebula**, reste possible.

Les nouveautés de chaque version sont dans l'onglet **Nebula → Nouveautés** du client, et
cette page est le texte que tu lis dans **Nebula → Documentation**.

## Un bug, une question ?

Rejoins le serveur Discord : **https://discord.gg/TNTYSmy4mX**

C'est le seul endroit où je réponds. Pour un bug, dis ce que tu faisais, ce qui s'est passé,
et si tu étais connecté avec un compte ou avec un bot — les deux ne suivent pas le même
chemin dans l'application, et la réponse en dépend.

## Licence et crédits

Travail d'origine : **[aiko-chan-ai/DiscordBotClient](https://github.com/aiko-chan-ai/DiscordBotClient)**.
Nebula en est une modification personnelle, écrite avec Claude.
