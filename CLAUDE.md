# Voidcord — notes pour Claude

Ce fichier voyage avec le dépôt : il est lu automatiquement par Claude Code sur n'importe
quel ordinateur après un `git clone`. Il contient ce qui ne se devine pas en lisant le
code.

## Ce qu'est Voidcord

Un client Discord de bureau (Electron) qui réunit comptes et bots dans une seule
application, dérivé de [aiko-chan-ai/DiscordBotClient](https://github.com/aiko-chan-ai/DiscordBotClient).

- Site : https://b-loom.github.io/Voidcord/
- Serveur d'entraide : https://discord.gg/TNTYSmy4mX

## Le piège principal : ne jamais écrire dans `Vencord/`

`Vencord/` est un clone jetable. `npm run requirement` le remet à zéro par un
`git reset --hard`, et il est exclu de git.

Depuis la 1.2.8, Vencord et le plugin botClient sont **épinglés** sur une révision
précise, listée dans `scripts/build-dependencies.json`. Monter de version, c'est changer
ces deux empreintes puis refaire tourner `npm run requirement` — et vérifier le calque,
car Vencord retire régulièrement des composants (`Forms`, `Text`, `Button` et `Switch` ont
disparu de `@webpack/common` en 1.15.15 ; `components/legacyUi.tsx`, dans le calque,
rebâtit l'ancienne forme pour les écrans de Voidcord).

Tout le code écrit pour Vencord — le plugin Voidcord, VoidcordApparence, les traductions
françaises, les retouches aux pages de réglages — vit dans **`voidcord/vencord/`**, qui est
versionné. `scripts/applyVoidcordOverlay.mjs` le recopie sur le clone avant chaque
compilation.

Modifier `Vencord/` directement, c'est perdre la modification au prochain
`npm run requirement` et ne jamais la voir partir sur GitHub.

## Rien n'est écrit deux fois

Trois textes ont une source unique, et des scripts les recopient :

| Texte | Source | Recopié par |
| --- | --- | --- |
| Documentation dans l'app, et `readme.md` | `readme.fr.md`, `readme.en.md` | `scripts/syncReadme.mjs` |
| Pages du site, en deux langues | les deux readme, les deux changelogs, LICENSE, `package.json` | `scripts/buildSite.mjs` |
| Code Vencord | `voidcord/vencord/` | `scripts/applyVoidcordOverlay.mjs` |

L'ordre compte : `syncReadme` écrit dans `voidcord/`, **puis** l'overlay recopie sur le
clone. L'inverse annulerait la synchronisation en silence — c'est arrivé une fois.

Le site paraît en deux langues : l'anglais à la racine de `docs/`, le français sous
`docs/fr/`, chaque page portant le lien vers son équivalent dans l'autre langue.

Ne jamais modifier à la main `docs/**.html`, `readme.md`, ni le `README` dans `docs.ts` :
la modification serait écrasée au build suivant. `readme.md` est la page d'accueil du
dépôt, produite en réunissant l'anglais puis le français ; les originaux sont
`readme.en.md` et `readme.fr.md`.

## Deux langues

Voidcord se lit en français ou en anglais, et le français est l'original : c'est la langue
du projet, et la traduction vient après. Le choix vit dans les réglages, et les textes
sont écrits côte à côte plutôt que derrière des clés — `t("Partager", "Share")` — pour
qu'une traduction oubliée se voie à la lecture.

Les deux longs textes, la documentation et le changelog, ne tiennent pas dans un appel de
fonction : ils vivent dans `docs.ts` pour le français et `docs.en.ts` pour l'anglais, et
`VoidcordTab` choisit selon `enAnglais()`. **Ajouter une entrée au changelog, c'est l'écrire
dans les deux fichiers.**

La langue est lue une seule fois, au chargement de la page : la changer en cours de route
ne touche pas les écrans déjà affichés. La page des réglages propose donc de recharger.

## Les réglages ne sont plus un fichier à éditer

L'éditeur Monaco de `assets/config/` a disparu avec la 3.10.3 d'origine. Les réglages
vivent maintenant dans une vraie fenêtre : le schéma est dans `src/shared/Settings.ts`
(une seule source pour le formulaire et la validation IPC), l'interface React dans
`src/Renderer/Settings/`, compilée à part par Vite (`npm run build:settings`, appelé par
`build:ts`). Ajouter un réglage, c'est ajouter une entrée à `settingsDefinitions` : le
formulaire et la validation suivent.

Les preloads ont déménagé dans `src/AppCore/Preloads/`, et les fenêtres autres que le
client dans `src/AppCore/Windows/`.

## Le contrôle d'accès IPC, et les fenêtres de Voidcord

La 3.10.3 a fermé l'IPC : chaque gestionnaire vérifie que l'appel vient bien de la
fenêtre Discord (`isTrustedAppFrame`). Voidcord ouvre une fenêtre de client **par compte**,
qui n'est pas cette fenêtre-là : `isTrustedClientFrame` (dans `IPCManager.ts`) élargit le
contrôle à ces fenêtres, et `isAccountWindowFrame` réserve les gestionnaires qui touchent
aux comptes enregistrés à la fenêtre de connexion et à son captcha. Un gestionnaire
ajouté sans l'un des deux renvoie `null` dans les fenêtres supplémentaires — sans erreur
visible.

## Numérotation des versions

Le dernier chiffre avance d'un cran, **et le compte s'arrête à `.9`** : après `1.0.9`
vient `1.1.1`, puis `1.1.2`. Le `.0` est sauté. C'est un choix de Bloom, qui a fait
renuméroter tout l'historique pour cela.

## Publier une version

1. Numéro dans `package.json`.
2. Entrée de changelog en tête de `CHANGELOG` dans
   `voidcord/vencord/src/userplugins/botClient/components/docs.ts`.
3. `npm run build` — compile l'app, l'installateur et le site. Fermer Voidcord avant, sinon
   le build échoue sur un fichier verrouillé.
4. Commit, push.
5. Release GitHub avec `Voidcord-win-x64.exe`, son `.blockmap` et `latest.yml` : les trois
   sont nécessaires, `latest.yml` étant ce que les installations lisent pour se mettre à
   jour.

`npm run build:fast` ne produit que `dist/win-unpacked`, pour tester vite sans installateur.

## Diagnostiquer

Le journal `%APPDATA%\Voidcord\logs\main.log` reçoit les messages du processus principal
**et** la console du client. C'est l'outil le plus utile du projet.

Quand une correction ne marche pas, instrumenter plutôt que formuler une hypothèse de
plus. Un exemple vécu : trois tentatives pour comprendre pourquoi un compte ne pouvait pas
rejoindre un serveur, jusqu'à ce qu'une trace montre que le refus venait de Voidcord
elle-même — un `acceptInvite` hérité du projet d'origine, écrit pour les bots et appliqué
à tout le monde.

**Bot et compte utilisateur ne suivent pas le même chemin.** Beaucoup de code hérité
bloque des fonctions parce qu'un bot ne peut pas les utiliser ; il faut vérifier que
`isUserAccountSession()` laisse passer les comptes. C'est la source de bugs la plus
fréquente ici.

## Attentes de Bloom

- Tout en français, y compris les messages d'erreur.
- Il communique par captures d'écran numérotées et n'est pas développeur : ses captures
  décrivent ce qu'il voit, et c'est souvent l'indice décisif.
- Ne jamais annoncer qu'une correction marche sans l'avoir vérifiée.
