/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Documentation shipped inside the bundle, so the pages work from the packaged
 * app without any file next to the executable.
 */

export const README = `# Nebula

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

\`requirement\` installs the root lockfile, checks out the pinned Vencord, BotClient plugin, and Discohook revisions from \`scripts/build-dependencies.json\`. Existing checkouts are never reset; a mismatched revision stops with an error so local work is not lost. \`build\` packages locally without publishing. Maintainers should use the [release process](docs/release-process.md) for tags and artifacts. After building, run \`npm run typecheck\` for TypeScript and \`npm test\` on Windows for the Electron integration suite. Use \`npm start\` to launch the app.

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

Seul le token est conservé, dans le fichier \`accounts.json\` du dossier de données de
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
`;

export const CHANGELOG = `# Nouveautés

## v1.2.9 — Les comptes, les réglages et la langue

### Recharger ne déconnecte plus
- **Ctrl+R renvoyait à l'écran de choix des comptes.** Au rechargement, Discord ouvre la
  passerelle et s'identifie lui-même avant que Nebula n'ait pu intervenir. Le compte
  utilisateur était alors pris pour un bot à l'arrivée du READY, et le client se
  déconnectait tout seul. Nebula reconnaît désormais le compte dès le chargement de la
  page, sans attendre l'identification.

### La langue dit ce qu'elle fait
- **Changer la langue semblait sans effet** : les textes de Nebula sont lus une fois, au
  chargement, et les écrans déjà affichés gardaient l'ancienne. Le choix était bien
  enregistré ; il manquait de le dire. Un bandeau l'annonce maintenant et propose de
  recharger — ce qui ne déconnecte plus. Les réglages qui touchent au réseau (DNS, proxy,
  cache) préviennent, eux, qu'ils attendront le prochain lancement.

### Les réglages, dans la page
- **La documentation et les nouveautés existent en anglais.** Choisir l'anglais dans les
  réglages ne changeait que les boutons et les étiquettes ; ces deux pages restaient en
  français, et ce sont les plus longues. Elles sont traduites, et suivent la langue.

- **Les réglages de Nebula s'affichent et se modifient dans l'onglet Nebula**, sous
  « Réglages » : la langue, le style de l'écran de démarrage, la recherche automatique
  des mises à jour, le DNS chiffré, le proxy du système. La fenêtre à part existe
  toujours, mais il n'y a plus à y passer. Chaque changement est écrit aussitôt.

### Ce que Nebula bridait sans le savoir
- **Les favoris et l'ordre des serveurs revenaient vides**, même après la correction de la
  route : le plugin remplaçait l'appel réseau de Discord par une lecture de sa base
  locale, celle qui ne sert qu'aux bots. La route corrigée n'était donc jamais atteinte.
  Un compte utilisateur repart maintenant sur le réseau.
- **Les autocollants personnalisés étaient refusés à tout le monde.** Le refus venait d'un
  « return false » écrit en dur, légitime pour un bot, appliqué aussi aux comptes. Même
  chose pour les messages longs et pour la qualité du partage d'écran : Discord décide
  désormais lui-même, compte par compte.

### À savoir sur Nitro
Discord compte trois abonnements, et **Nitro Basic n'ouvre pas les mêmes portes que le
Nitro complet** : il réserve les autocollants personnalisés à leur serveur d'origine et
arrête l'envoi à 50 Mo au lieu de 500. Nebula ne travestit plus l'abonnement d'un compte
utilisateur : ce que le client annonce est désormais le vôtre. Ces plafonds-là sont levés
côté client — les serveurs de Discord restent libres de refuser.

### Ton compte n'était plus tout à fait le tien
- **Le vrai Nitro était rabaissé.** Nebula annonçait « Nitro Classic » pour *tous* les
  comptes, le tien compris : Discord refusait donc les autocollants à quelqu'un qui a
  pourtant le Nitro complet. Cette invention sert à un bot, qui n'a ni abonnement ni
  téléphone ; un compte utilisateur garde désormais les siens.
- **Les achats annoncés comme possédés** venaient du même endroit : la boutique croyait
  que tu avais déjà des décorations que tu n'avais pas.
- **Tes favoris de GIF, d'autocollants et d'émojis revenaient vides**, et **l'ordre de tes
  serveurs était perdu au premier lancement.** Même cause : ces deux choses vivent dans
  tes réglages Discord, et Nebula répondait à leur place depuis sa base locale — celle
  qu'elle tient pour les bots, qui n'ont pas de réglages chez Discord. Un compte
  utilisateur est maintenant renvoyé vers Discord.

### Langue
- **Choisir « Français » à l'accueil donnait un client en anglais.** Discord appliquait la
  langue du compte par-dessus celle de Nebula, une fois connecté. Nebula impose
  désormais la sienne.
- **Un bouton « Réglages de Nebula »** dans l'onglet Nebula ouvre la fenêtre des réglages
  — langue, écran de démarrage, mises à jour automatiques, DNS. Elle n'était atteignable
  que par l'icône de la zone de notification.

### Profils
- **Un jeu que tu ne connais pas s'affichait sur ton profil.** Le catalogue de Discord
  associe les jeux à des noms d'exécutables, et plusieurs jeux revendiquent les mêmes —
  « game.exe », « launcher.exe ». Nebula gardait le premier venu, donc un jeu au hasard.
  Les noms partagés sont écartés : mieux vaut ne rien dire que dire n'importe quoi.
- **Le bot connecté porte tous les badges**, comme le compte système.
- **Le compte système est né avec Nebula.** Son profil annonçait le 13 mai 2015, date de
  création de Discord, parce qu'il empruntait un identifiant de cette époque. Il affiche
  désormais le 29 octobre 2026, jour de la première version publiée.

### La boutique et les fenêtres bloquées
- **La fenêtre « Ajouter un mode de paiement »** tournait dans le vide indéfiniment. Elle
  affiche maintenant l'explication habituelle, comme les autres pages qui ont besoin des
  rouages de paiement de Discord.

### Se reconnecter à un compte
- **Le bouton « Connexion » du sélecteur de comptes reconnecte vraiment.** Il renvoyait
  jusqu'ici vers l'écran « Ajouter un compte », puis vers le formulaire de Discord :
  Discord cherche le jeton dans *son* magasin à lui, qui ne contient pas ceux de Nebula,
  conclut qu'il n'y en a pas et affiche « Essaie de te reconnecter ». Nebula prend désormais
  la main sur ce clic et se connecte avec le jeton enregistré, comme si on l'avait collé
  à la main.
- **Plus de fenêtre « Sécurité Windows »** qui demandait une clé d'accès. Elle venait du
  formulaire de connexion de Discord et ne menait nulle part, le serveur local refusant
  déjà WebAuthn. La demande est bloquée avant d'ouvrir quoi que ce soit.
- **Ctrl + R ne déconnecte plus.** Une session ouverte correctement survit au rechargement.

### Comptes et profils
- **Un bot n'affiche plus le jeu de ta machine.** La détection de jeux montre ce qui tourne
  sur l'ordinateur : sur un bot, ce n'est pas son activité mais la tienne, et elle n'a rien
  à faire sur son profil.
- Le cache de réglages de Discord est vidé en changeant de compte : il n'est pas rangé par
  compte, et le suivant héritait des réglages du précédent.

### Interface
- **Les couleurs sont justes à nouveau.** Discord a retiré neuf variables de couleur
  (\`--text-normal\`, \`--header-primary\`, \`--background-primary\`…) : les écrans de Nebula
  qui les nommaient se retrouvaient avec des teintes fausses, ou un fond qui ne
  correspondait plus à celui du client. Trente et un emplacements ont été repris.
- **La boutique le dit au lieu de tourner dans le vide.** La fenêtre « Ajouter un mode de
  paiement » restait à charger indéfiniment : elle a besoin des rouages de paiement de
  Discord, absents ici. Elle affiche maintenant l'explication habituelle.
- **La bande vide au-dessus de la barre de compte** : l'encart de quête était masqué mais
  sa boîte restait, et la boîte garde sa hauteur. Le masquage ne cherche plus un nom de
  classe précis — Discord les renomme à chaque version — mais remonte jusqu'à l'élément
  posé dans la barre latérale.

### Mises à jour
- **Une barre de progression s'affiche par-dessus le client**, où que tu sois, et dit quand
  le téléchargement est fini. Elle n'existait que dans l'onglet Nebula : il fallait y
  penser et l'ouvrir pour savoir où en était la mise à jour.

### Diagnostic
- **Le journal reçoit enfin ce que Nebula écrit depuis le client.** Il ne gardait que les
  erreurs de Discord : les messages de Nebula — reconnexion à un compte, fermeture de la
  passerelle, qualité du partage — n'y arrivaient jamais, alors que ce sont eux qu'on vient
  y chercher dans \`%APPDATA%\\Nebula\\logs\\main.log\`.
- Les réglages et les favoris étaient inaccessibles depuis une fenêtre de client
  supplémentaire : la réponse n'était rendue qu'à la fenêtre principale.

## v1.2.8 — La base passe à DiscordBotClient 3.10.3

Tout le cœur de l'application a été repris sur la version 3.10.3 du projet d'origine,
avec ce qu'elle apporte, et les ajouts de Nebula ont été reportés dessus un par un.

### Nouveautés venues de la 3.10.3
- **Un écran de démarrage**, en deux styles au choix : moderne, ou à la manière de
  Discord. Il dit aussi ce qui se passe quand le démarrage échoue, avec un bouton pour
  réessayer.
- **Une vraie fenêtre de réglages**, avec une recherche, en remplacement de l'éditeur de
  configuration où il fallait écrire le fichier à la main. Elle est en français.
- **Le DNS chiffré accepte plusieurs fournisseurs** (Cloudflare, Google, Quad9), et on
  peut désormais suivre le proxy du système au lieu des connexions directes.
- **La recherche de mise à jour au démarrage peut être coupée.**
- **La limite d'envoi passe à 20 Mo.**
- **L'ancien éditeur d'embed est de retour**, à activer dans les réglages du plugin
  BotClient si tu le préfères à l'éditeur de message.
- **Les emojis d'application apparaissent dans le sélecteur d'emojis.**
- Depuis « Nouveau message », on peut **ouvrir un message privé avec quelqu'un à partir
  de son identifiant**.

### Corrections venues de la 3.10.3
- Le jeton du bot est **vérifié avant certaines requêtes internes**.
- Des **commandes slash qui manquaient** sont revenues.
- Un **message de plus de 2 000 caractères** ne casse plus l'envoi.
- Les salons **Forum et Média** ne restent plus bloqués sur leur squelette de chargement.
- Le chargement du **profil d'un utilisateur** ne tombe plus en panne quand les données
  d'application manquent.
- Une erreur dans un échange interne (IPC) **ne fige plus l'application**.
- Plusieurs défauts de gestion des fenêtres, et le **serveur local renforcé** après des
  signalements de sécurité.
- Les protocoles sont traités plus vite, et des allers-retours inutiles entre le client et
  le processus principal ont disparu.

### Côté Nebula
- Les **fenêtres de client supplémentaires** (une par compte) ont été recollées au
  nouveau contrôle d'accès du processus principal : sans cela, elles n'avaient plus le
  droit de lui parler, et la barre de titre d'une deuxième fenêtre agissait sur la
  première.
- Le DNS chiffré reste **sur Cloudflare par défaut**, comme avant.
- Discord est épinglé sur la version stable 657850, Vencord sur la 1.15.15. Vencord y a
  retiré d'anciens composants : les écrans de Nebula ont été adaptés.
- **Nouvelle image au démarrage**, et le tracé au trait qui la précède a été refait à
  partir d'elle. Le bouton de crédit a disparu avec l'ancienne illustration : Nebula ne
  revendique plus d'auteur pour l'image affichée.

### Corrigé dans la foulée
- **La connexion avec un compte Discord était refusée** par « expéditeur IPC non
  autorisé ». Le nouveau contrôle d'accès de la 3.10.3 n'autorisait que la fenêtre de
  connexion séparée, alors que Nebula dessine l'écran d'ajout de compte à l'intérieur
  de Discord depuis la 1.2.7. Les deux sont acceptés, et eux seuls.
- **Les textes de l'écran d'ajout de compte étaient illisibles**, noirs sur fond sombre.
  Discord a renommé ses couleurs dans le build 657850 : \`--text-normal\`,
  \`--header-primary\` et \`--header-secondary\` n'existent plus, et une couleur introuvable
  ne s'applique pas du tout. Chaque couleur empruntée à Discord a maintenant un repli.
  Les écrans de partage d'écran, de connexion par token et l'onglet Nebula étaient
  touchés par le même défaut.
- **Les messages d'erreur revenus en anglais** sont retraduits : l'expéditeur IPC, le
  jeton de bot invalide, l'avertissement sur l'intent MessageContent, les erreurs de
  configuration et la confirmation de suppression des données. L'écran d'ajout de compte
  n'affiche plus l'habillage d'Electron (« Error invoking remote method... ») autour du
  message.
- **Un bot qui essaie de partager son écran le sait enfin.** Le bouton ne faisait rien :
  Discord réserve « Go Live » aux comptes utilisateurs, et la passerelle des bots ne
  porte pas ces opérations. Un message le dit désormais au lieu du silence.
- **Le partage d'écran ne démarrait plus du tout**, même avec un compte utilisateur. Le
  durcissement de la 3.10.3 n'acceptait les demandes « media » qu'avec du son et sans
  image — or une demande de partage d'écran arrive avec une liste de types **vide**. Elle
  était donc refusée en une milliseconde, avant même que le sélecteur de Nebula existe.
  La caméra, elle, reste refusée. Cette décision vit maintenant dans une fonction à
  part, et un test épingle les huit cas : elle ne pourra plus changer en silence.
- **Un fichier de 12 Mo était refusé** avec « Max file size is 1.00 GB », ce qui ne
  voulait rien dire. Discord a relevé sa limite par défaut à 20 Mio le 3 septembre 2026 ;
  la 3.10.3 n'a relevé que les paliers Nitro, laissant 10 Mio à tous les autres — donc à
  tous les bots. Le plancher est remonté à 20 Mio. Au-delà, il faut un serveur boosté :
  50 Mo au palier 2, 100 Mo au palier 3.
- **Le pavé rouge derrière le bouton micro**, quand il est coupé, ne s'affiche plus.
  L'icône barrée suffisait.

### Partage d'écran
- **La qualité et le nombre d'images par seconde se choisissent** dans le sélecteur, au
  moment de partager : 720p, 1080p, 1440p ou la définition de la source, à 15, 30 ou 60
  images par seconde. Le choix est retenu d'un partage à l'autre. C'est un plafond posé
  sur la capture : Discord réencode ensuite pour la voix, et peut descendre en dessous.

### Autres corrections
- **Une invitation ouverte depuis le client** affichait encore la page « Discord App
  Detected », qui propose d'ouvrir une application de bureau — un cul-de-sac, puisque
  Nebula *est* l'application. Le détour n'était fait que pour les liens ouverts dans une
  nouvelle fenêtre ; il l'est maintenant aussi quand le lien s'ouvre sur place.
- **Chaque fermeture de la passerelle est désormais inscrite au journal** avec son code
  et sa raison, dans \`%APPDATA%\\Nebula\\logs\\main.log\`. Une déconnexion « sans raison »
  laissera ainsi de quoi la comprendre.
- Les deux derniers messages d'erreur de connexion restés en anglais sont traduits.

### Nouveau plugin
- **NebulaPlateforme** choisit l'appareil depuis lequel tu as l'air de te connecter :
  ordinateur, navigateur, téléphone Android, iPhone, console ou casque VR. C'est la
  pastille que les autres voient à côté de ton nom. Le changement prend effet à la
  connexion suivante.

## v1.2.7 — Partage d'écran, fenêtres intégrées et ménage

### Nouveautés
- **Le partage d'écran fonctionne.** Il n'avait jamais marché : aucun gestionnaire de
  capture n'était installé, et Electron refusait la demande sans le moindre message. Un
  sélecteur s'ouvre maintenant dans Discord, avec les onglets Écrans et Fenêtres, les
  vignettes en direct et le choix d'inclure le son de l'ordinateur.
- **La connexion se fait dans Discord**, dans une fenêtre du client, au lieu d'une fenêtre
  séparée. Le captcha garde la sienne : hCaptcha n'est accepté que sur une page servie par
  Discord.
- Un plugin **NebulaStatut** empêche ton activité d'apparaître sur ton profil — le jeu en
  cours, ou tout le reste si tu veux.
- Les plugins écrits pour Nebula ont leur **propre section en haut** de la page des
  plugins, séparés de ceux de Vencord.
- Le message d'accueil gagne un bouton vers **le site du projet**.

### Corrections
- Le partage d'écran ne démarrait jamais, même une fois la capture en place : Nebula
  coupait les opérations « streamCreate », « streamWatch », « streamPing » et « streamDelete » de
  la passerelle pour tout le monde, alors que seul un bot ne peut s'en servir. Le flux
  n'était donc jamais créé. « callConnect » souffrait du même défaut.
- Les deux plugins de partage d'écran de Vencord, écrits pour les navigateurs, se mettaient
  en travers : l'un remplaçait la capture et réclamait du 4K à 120 images par seconde,
  l'autre écrivait 80 Mbit/s dans la négociation. Ils ne s'appliquent plus ici.
- Une invitation ouverte depuis le client affichait la page « Application Discord
  détectée ». Elle s'ouvre maintenant directement dans Discord.
- Dans la fenêtre de connexion, le texte saisi était illisible sur un thème sombre et les
  boutons mal placés.
- Le sélecteur de comptes de Discord remplissait l'écran sans pouvoir défiler.
- L'écran de connexion par token de bot était resté en anglais, comme la fenêtre de
  réglages du partage d'écran.

### Ménage
- L'encart « Booste ton profil », le panneau de quêtes et la ligne d'activité sous ton nom
  ne s'affichent plus : aucun des trois ne mène à quoi que ce soit ici.
- La fenêtre « Envoyer un cadeau » affiche l'explication habituelle au lieu de l'offre
  Nitro.

## v1.2.6 — Rejoindre un serveur, et les mises à jour

### Corrections
- Un compte utilisateur peut enfin rejoindre un serveur. Nebula refusait toute invitation
  avec « cannot join guilds » : ce refus datait du plugin d’origine, écrit pour les bots,
  et ne regardait pas le type de compte. Les modèles de serveur souffraient du même défaut.

### Nouveautés
- L’onglet Nebula indique si l’application est à jour, par une pastille verte ou rouge,
  et un bouton lance la vérification.
- Le téléchargement d’une mise à jour affiche sa progression, puis un bouton pour
  redémarrer et l’installer.

## v1.2.5 — Lien du serveur

### Corrections
- Le bouton du message d’accueil menait vers une invitation expirée.
- Il copie maintenant le lien au lieu de l’ouvrir : le navigateur ne connaît pas ton
  compte et ne pouvait donc pas te faire rejoindre le serveur. Une fenêtre confirme la
  copie, et le lien est à coller dans Discord.

## v1.2.4 — Première version publiée

### Nouveautés
- Nebula prévient quand une nouvelle version est publiée. La recherche vise désormais le
  dépôt du projet, et non plus celui d’origine dont les versions auraient remplacé
  Nebula par une autre application.

### Changements
- Le projet s’installe par un véritable installateur Windows, et le code est publié sur
  GitHub.

## v1.2.3 — Boutons dans le message d’accueil

### Changements
- Le lien du serveur en texte brut laisse place à deux boutons : rejoindre le serveur
  Discord, et ouvrir le projet sur GitHub, chacun avec son logo.

## v1.2.2 — Ménage et fenêtre de connexion

### Corrections
- La fenêtre de connexion ne coupait plus le haut de la liste quand les comptes étaient
  nombreux, et le formulaire se retrouvait hors d’écran. La liste défile désormais seule.

### Changements
- Le build de Discohook, sa copie dans les ressources et les sources Android ont été
  retirés du projet : environ 200 Mo qui ne servaient plus à rien.
- Le code écrit pour Vencord vit maintenant dans nebula/, versionné, et se recopie sur le
  clone à chaque compilation. Une mise à jour de Vencord ne l’efface plus.

## v1.2.1 — Les quêtes aussi

### Changements
- Les quêtes sont bloquées sur les deux clients : leur progression est vérifiée par le
  client officiel de Discord, donc elles n’avanceraient jamais ici, compte ou bot.

## v1.1.9 — Blocage au cas par cas

### Changements
- Seul Nitro est bloqué sur les deux clients, puisque ni un bot ni Nebula ne peuvent
  gérer un abonnement. La Boutique, les Quêtes et la Découverte ne le sont que pour un
  bot : un compte Discord y a toute sa place.
- Le panneau retrouve mieux le bord de la barre latérale, qui change d’une page à l’autre.

## v1.1.8 — Le message remplace la page

### Changements
- Nitro, la Boutique, les Quêtes et la Découverte affichent le message à la place de la
  page, en grand, au lieu de renvoyer à l’accueil. La barre latérale reste utilisable.

## v1.1.7 — Français et pages bloquées

### Nouveautés
- Les plugins de Vencord sont décrits en français, et la page qui les liste aussi.
- NebulaApparence permet de changer le nom affiché et le pseudo séparément.

### Corrections
- La boutique, Nitro et les quêtes sont enfin bloquées, ainsi que la découverte pour un
  bot. Le filtre posé sur le routeur de Discord ne voyait pas les liens de la barre
  latérale ; il surveille maintenant l'adresse elle-même.
- La fiche d'auteur des plugins Nebula montrait le profil d'un contributeur de Vencord,
  dont l'identifiant avait été repris par erreur. Elle affiche désormais Nebula.

## v1.1.6 — Documentation, apparence et pages bloquées

### Nouveautés
- Un plugin « NebulaApparence » permet de changer le nom affiché et de choisir ses badges.
  Tout est local : rien n'est envoyé à Discord et personne d'autre ne le voit.
- Les plugins écrits pour Nebula portent son logo dans la liste des plugins.
- La boutique, Nitro et les quêtes expliquent pourquoi elles ne fonctionnent pas ici au lieu
  de s'ouvrir vides, et la découverte de serveurs fait de même pour un bot.

### Changements
- Les numéros de version avancent d'un cran à la fois. Les anciennes versions ont été
  renumérotées : le compte s'arrête à 1.0.9, puis reprend à 1.1.1, 1.1.2, et ainsi de suite.
- Le message d'accueil renvoie vers le serveur Discord plutôt que vers un compte.
- La page Documentation est désormais le README du projet, recopié à chaque compilation,
  et sait afficher les encadrés, les séparateurs et les liens.

## v1.1.5 — Comptes groupés partout

### Corrections
- Le volet rapide de bascule sépare lui aussi les comptes utilisateurs des bots, comme la
  fenêtre « Gérer les comptes ». Les deux listes lisent le même magasin, qui rend
  désormais les comptes groupés.

## v1.1.4 — Jeux et comptes

### Nouveautés
- Les jeux en cours apparaissent enfin sur le profil. La liste des processus détectés ne
  suffisait pas : Nebula publie maintenant une véritable activité, le même chemin que les
  clients de présence enrichie.
- Le sélecteur de comptes sépare les comptes utilisateurs des bots sous deux intitulés,
  au lieu de tout empiler dans une seule liste.

### Corrections
- L'écran « Application Discord détectée » ne remplace plus le client. Il s'affichait
  parce que le client se croyait sur le web ; Nebula est l'application de bureau.

## v1.1.3 — Identité et sobriété

### Corrections
- La limite de comptes est réellement levée. Le premier correctif ne touchait que la
  troncature qui suit l'ajout ; le refus venait du bouton lui-même, qui affichait l'erreur
  au lieu d'ouvrir la connexion. Les deux sont corrigés.
- Plus aucune trace du nom d'origine : dépôt, identifiant de session, page de
  téléchargement, éditeur de configuration et en-têtes portent désormais Nebula.

### Allègements
- Cinq services de Chromium dont Nebula ne se sert pas sont désactivés : découverte Cast
  sur le réseau, téléchargement de règles d'optimisation, traduction, communication de
  remplissage automatique et suggestions de contenu.
- Le cache disque est plafonné à 64 Mo, là où Chromium le laissait grossir sans limite.
- L'écriture du stockage sur le disque passe d'une fois par minute à une fois toutes les
  cinq minutes, les moments qui comptent restant couverts.

## v1.1.2 — Plus de cinq comptes

### Nouveautés
- Le sélecteur accepte **cent comptes** au lieu de cinq. Discord ne refusait pas le
  sixième : son code coupait la liste au cinquième et déconnectait les suivants. Ni
  constante nommée ni fonction de contrôle, le chiffre était écrit dans l'opération de
  découpe, trouvé en lisant les modules chargés par le client.

## v1.1.1 — Comptes en double

### Corrections
- Un compte connecté plusieurs fois n'apparaît plus en double dans la liste ni dans le
  menu. Chaque connexion produit un token différent, et les entrées étaient comparées par
  token au lieu de l'identifiant du compte.
- Le champ de token de bot a quitté la fenêtre de connexion : il faisait doublon avec
  celui de l'écran d'accueil.
- L'état « compte utilisateur » est remis à zéro quand Discord refuse le token ou à la
  déconnexion, au lieu de rester actif alors que plus personne n'est connecté.

## v1.0.9 — Jeton, sobriété, mises à jour

### Nouveautés
- Connexion à un compte **avec un token**, sans mot de passe ni code à deux facteurs.
  Le token est vérifié auprès de Discord avant d'être enregistré, pour que rien ne casse
  plus tard sans explication.

### Allègements
- Plus aucune journalisation des requêtes : chaque image et chaque script chargés par
  Discord écrivaient une ligne sur le disque, ce qui coûtait du processeur en permanence.
- La détection des jeux examine les processus une fois par minute au lieu de quatre, et
  s'arrête complètement quand aucune fenêtre n'est affichée.

### Corrections
- Plus de notification de mise à jour venant du projet d'origine. Nebula interrogeait son
  dépôt, et accepter une de ses versions aurait remplacé Nebula par une autre application.

## v1.0.8 — Émojis, fichiers et fenêtres

### Nouveautés
- L'éditeur a un **catalogue d'émojis** : un bouton ouvre la liste, rangée par serveur,
  avec une recherche. Plus besoin de copier un identifiant à la main, ni pour le texte
  ni pour les boutons.
- L'éditeur accepte les **pièces jointes** : par le bouton ou par glisser-déposer, dix
  fichiers de 10 Mo au maximum. Un message peut désormais ne contenir qu'un fichier.

### Corrections
- Les boutons de la barre de titre agissent sur leur propre fenêtre. Réduire ou agrandir
  depuis une deuxième fenêtre pilotait la première, parce que la fenêtre visée était
  déduite d'un nom et non de celle d'où venait le clic.
- La fenêtre d'indisponibilité reprend la présentation de la page des paramètres.

## v1.0.7 — Les bots se reconnectent

### Corrections
- Un bot ne pouvait plus se connecter après son premier lancement. En le mémorisant pour
  l'afficher dans la liste des comptes, son jeton se retrouvait au redémarrage parmi ceux
  des comptes utilisateurs — or ces jetons-là sont envoyés à Discord tels quels, sans le
  préfixe réservé aux bots. Les bots sont désormais exclus de cette liste.
- Les greffes posées sur Discord sont isolées les unes des autres : si l'une échoue, elle
  est signalée et les suivantes s'installent quand même, au lieu d'abandonner tout ce qui
  vient après.

## v1.0.6 — L'éditeur envoie vraiment

### Corrections
- L'éditeur de message envoie enfin. La liaison avec le client était bien établie, mais la
  page rejetait le canal parce qu'elle vérifiait l'origine du message : le canal est remis
  depuis le monde isolé du préchargement, où cette origine n'est pas la page elle-même.
- Les nouvelles fenêtres n'ont plus de barre de titre du système : elles reprennent
  l'habillage de la fenêtre principale, où Discord dessine la sienne.
- Le créateur garde ses vrais badges. Les badges décoratifs ajoutés à tous les profils ne
  s'appliquent plus au sien, qui n'affiche donc que ce qu'il a réellement obtenu, plus
  celui de Nebula.
- Les bots sont mémorisés dès qu'ils se connectent, et apparaissent dans leur catégorie
  du menu de la barre des tâches sans avoir à passer par la fenêtre de connexion.
- Créer ou rejoindre un serveur est intercepté plus tôt, à l'ouverture de la fenêtre et
  plus seulement à la validation.

## v1.0.5 — Éditeur de message Nebula

### Nouveautés
- **Nouvel éditeur de message**, écrit pour Nebula, à la place de celui emprunté ailleurs.
  Il gère le contenu, jusqu'à dix embeds complets (titre, description, couleur, auteur,
  miniature, grande image, pied de page, date, champs alignés) et des boutons qui ouvrent
  un lien, avec émojis personnalisés. L'aperçu se met à jour pendant la frappe et la
  mention « bêta » a disparu.
- Le bouton de l'éditeur n'apparaît plus que sur un bot, puisqu'il envoie avec les
  identifiants du bot.
- Créer ou rejoindre un serveur depuis un bot affiche une explication : un bot rejoint un
  serveur par son lien d'invitation OAuth, ajouté par le propriétaire du serveur.
- Les comptes enregistrés sont rangés en deux catégories, **comptes utilisateurs** et
  **bots**, dans la fenêtre de connexion comme dans le menu de la barre des tâches. Un bot
  ouvert dans sa propre fenêtre est mémorisé pour la prochaine fois.

## v1.0.4 — Chaque fenêtre à sa place

### Corrections
- Se connecter à un compte depuis une deuxième fenêtre ne détourne plus la première.
  La fenêtre de connexion retient celle qui l'a ouverte et y renvoie le compte.
- La page indisponible dit la vérité selon le cas : sur un compte, que Nebula ne prend
  pas en charge cette page et qu'il faut passer par le client officiel ; sur un bot,
  qu'un bot n'a ni Nitro ni abonnement.
- Le badge Creator Nebula s'affiche aussi sur un compte utilisateur. Son profil partait
  directement chez Discord, sans passer par l'étape qui ajoute le badge.

## v1.0.3 — Plusieurs fenêtres et identité

### Nouveautés
- Le menu de la barre des tâches ouvre directement une **nouvelle fenêtre Discord**, et
  propose chaque compte enregistré dans sa propre fenêtre. Plusieurs Discord côte à côte,
  chacun avec sa session : un bot ici, ton compte là.
- Badge **Creator Nebula** pour l'auteur du projet, avec le logo de l'application.
- Le salon d'accueil indique qui contacter en cas de problème.

### Corrections
- Nitro, la boutique et les connexions de comptes sont marqués indisponibles pour tout le
  monde, pas seulement pour les bots : ils ont besoin des rouages de paiement et
  d'authentification de Discord, que ce client ne transporte pas. Ça se fait sur le client
  officiel.
- Les jeux détectés sont tracés dans le journal au moment où le client les reçoit, pour
  distinguer un problème de détection d'un problème d'affichage.

## v1.0.2 — Détection des jeux et connexions

### Nouveautés
- Les jeux en cours sont détectés et affichés dans ton activité. Ce client n'a pas le
  module natif de Discord, alors Nebula lit la liste des processus du système et la
  compare au catalogue public des jeux reconnus, toutes les quinze secondes.
- Un bot peut s'ouvrir dans sa propre fenêtre depuis la fenêtre de connexion : un compte
  dans une fenêtre, un bot dans une autre, en même temps.

### Corrections
- Les connexions de comptes externes fonctionnent de nouveau. Le retour d'authentification
  arrive sur une page sans jeton, et la liste des routes interdites aux bots s'appliquait
  à cette page comme s'il s'agissait d'un appel d'API, ce qui la refusait systématiquement.
  Cette liste ne vaut plus que pour les appels d'API.
- Les messages privés enregistrés résistent mieux à un redémarrage brutal : le stockage
  est écrit sur le disque régulièrement, à la mise en veille et à l'extinction, au lieu
  d'attendre le bon vouloir du navigateur.
- Les paramètres s'ouvrent plus vite. Les pages ajoutées par Nebula étaient reconstruites
  à chaque ouverture, ce qui forçait un remontage complet du panneau.
- Une catégorie ne montre plus qu'une seule entrée « Indisponible » au lieu d'en empiler
  une par page masquée.

## v1.0.1 — Corrections et finitions

### Corrections
- Les paramètres ne font plus planter le client. La personnalisation du menu s'appliquait
  à chaque panneau imbriqué au lieu de la seule disposition racine, ce qui insérait des
  sections là où Discord n'en attend pas.
- Le profil du salon système s'affiche enfin avec ses badges, sa biographie et sa bannière.
  Une route interne répondait 404 avant que le profil ne soit construit, parce que les
  fichiers de routes sont enregistrés par ordre alphabétique et qu'un attrape-tout passait
  devant.
- Le salon système reste en tête des messages privés. Discord trie par identifiant du
  dernier message, et le sien était trop bas pour remonter.
- Le client démarre en français même avec un bot, qui n'a pas de langue propre.

### Interface
- Le salon système porte tous les badges Discord et sa bannière est animée.
- Sa date de création est celle de Discord, le 13 mai 2015.
- Le logo de l'application est désormais rond.
- Le menu de la barre des tâches a été allégé.
- La fiche du plugin affiche Nebula comme éditeur.
- La section Nebula est une catégorie à part entière, plus une entrée rangée sous Vencord.
- Les pages indisponibles pour un bot couvrent aussi les applications connectées et les
  autorisations de messages.

### Sous le capot
- Les erreurs du client sont écrites dans le journal de l'application, ce qui permet de
  diagnostiquer un plantage sans ouvrir les outils de développement.
- Les pages ajoutées par Nebula sont protégées : une erreur dans l'une d'elles s'affiche
  à sa place au lieu d'emporter le client.

## v1.0.0 — Nebula

### Connexion avec un compte Discord
- Nouvelle fenêtre de connexion avec adresse e-mail et mot de passe.
- Gestion du captcha dans une fenêtre dédiée, servie depuis l'origine Discord.
- Authentification à deux facteurs : application, SMS et codes de secours.
- Les comptes sont enregistrés et réutilisables en un clic.
- Chaque compte peut s'ouvrir dans sa propre fenêtre, avec sa propre session.

### Compatibilité des comptes utilisateurs
- Les messages privés, la liste des membres, les amis et le vrai profil ne sont plus
  remplacés par les données factices prévues pour les bots.
- L'adresse e-mail et le numéro de téléphone affichés sont les vrais.
- La déconnexion automatique qui visait les comptes non-bot a été supprimée.

### Interface
- L'application s'appelle désormais Nebula, avec une nouvelle icône.
- Toute l'interface de l'application est en français.
- Nouvelle section Nebula dans les paramètres, avec les informations de l'application,
  la documentation et cette page.
- Les pages réservées aux comptes utilisateurs affichent une explication quand un bot
  est connecté.
`;
