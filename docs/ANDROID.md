# Voidcord sur Android

Voidcord tourne sur un téléphone sans que rien n'ait été réécrit : c'est le même serveur,
les mêmes 133 routes, les mêmes pages de réglages, la même animation de démarrage et le
même calque Vencord que sur l'ordinateur. Seul change ce qui, sur le bureau, passait par
Electron.

## L'idée

Sur l'ordinateur, Voidcord est un serveur HTTPS local devant lequel Electron place une
fenêtre, en faisant croire au client Discord qu'il parle à `discord.com` :

```
Electron ──host-rules: discord.com → 127.0.0.1:port──► APIServer (Express) ──► Discord
```

Une WebView ne sait pas détourner un nom de domaine. Le client est donc servi depuis
`http://127.0.0.1:<port>` — que Chromium traite comme une origine sûre, au même titre que
HTTPS — et toutes ses requêtes, qui sont relatives, retombent d'elles-mêmes sur le serveur :

```
WebView ──http://127.0.0.1:port/app──► APIServer (Express, dans Node) ──► Discord
```

Node tourne dans le processus de l'application, par
[nodejs-mobile](https://github.com/nodejs-mobile/nodejs-mobile) : une `libnode.so`
compilée pour Android, lancée par un petit pont JNI.

## Ce qui remplace Electron

| Sur l'ordinateur | Sur Android |
| --- | --- |
| `electron` (`app`, `net`, `nativeImage`, fenêtres) | `src/Mobile/shims/electron.ts` |
| `electron-log` | `src/Mobile/shims/electron-log.ts` (journal + logcat) |
| `electron-updater` | `src/Mobile/shims/electron-updater.ts` (annonce, l'APK s'installe à la main) |
| `ipcMain` / `ipcRenderer` | `src/Mobile/ipc.ts` + `POST /__mobile/ipc` |
| `webContents.send` | flux d'évènements `GET /__mobile/evenements` |
| `ipcRenderer.sendSync` | `@JavascriptInterface` (`PontVoidcord.kt`), repli sur un `XMLHttpRequest` synchrone |
| les préchargements (`Preloads/`) | `src/Mobile/pont.ts`, injecté dans la page |
| l'extension Vencord | un `<script>` injecté, servi sous `/__vencord/` |
| `host-rules` vers `discord.com` | réécriture dans `pont.ts` + `Branding.kt` |
| le pot à cookies de la session | un pot en mémoire dans le calque `net.fetch` |
| la redirection des images de marque | `Branding.kt`, par `shouldInterceptRequest` |
| une fenêtre par écran | `MainActivity` pour le client, `EcranWebActivity` pour le reste |

Les écrans secondaires — réglages, comptes, langue, éditeur de message, captcha — chargent
les pages du bureau sans la moindre modification.

## Compiler

```bash
npm run mobile:deps   # une fois : télécharge nodejs-mobile (189 Mo décompressés)
npm run apk:debug     # APK de test, installable tel quel
```

Le résultat arrive dans `dist/`. `npm run apk` produit la version de publication, qu'il
faut signer (`apksigner`) avant qu'Android n'accepte de l'installer.

Une seule architecture est compilée par défaut, `arm64-v8a` : c'est ce qu'attend tout
téléphone vendu depuis 2019, et chaque `libnode.so` pèse soixante mégaoctets. Pour les
autres :

```bash
VOIDCORD_ABI=arm64-v8a,armeabi-v7a,x86_64 npm run apk
```

Il faut le SDK Android (plateforme 37, build-tools 36, NDK 28, CMake 3.31) et un JDK 21.
`android/local.properties` dit où se trouve le SDK.

## Diagnostiquer

Le journal du serveur part dans logcat, sous l'étiquette `Voidcord` :

```bash
adb logcat -s Voidcord:V nodejs:V
```

Et le fichier, comme sur l'ordinateur :

```bash
adb shell run-as com.voidcord.mobile cat files/voidcord-data/logs/main.log
```

Si l'application se ferme sur l'animation de démarrage, c'est presque toujours le serveur
qui n'a pas démarré : `files/voidcord-data/port.erreur` porte alors la trace.

La WebView s'inspecte depuis Chrome, à `chrome://inspect`, pour les versions de test.

## Les pièges rencontrés

**nodejs-mobile est compilé sans ICU.** Son V8 ne connaît aucune propriété Unicode :
`\p{Letter}` et consorts sont refusés, en littéral comme à travers `new RegExp`. Un seul
motif du paquet en contenait — celui des mentions de commande de `discord-api-types` — et
il suffisait à empêcher le serveur de démarrer. `scripts/buildMobile.mjs` les remplace par
des plages de points de code, et s'arrête s'il en reste une.

**La minification renomme les fonctions.** `registerRouteSync` reconnaît un routeur
Express au nom de sa fonction : sans `keepNames`, les 133 routes étaient toutes refusées,
et chaque appel partait au proxy — sans erreur visible avant la première page blanche.

**Le dossier du serveur doit être recopié hors de l'APK.** Node ne sait pas charger un
module depuis une archive. La copie n'est refaite que si la version ou la date
d'installation du paquet a changé.

**L'animation de démarrage est servie depuis les ressources, pas par le serveur**, puisque
le serveur n'existe pas encore quand elle s'affiche. `WebViewAssetLoader` lui donne une
vraie origine HTTPS, sans laquelle son `Content-Security-Policy` refuserait ses propres
scripts et l'injection au début du document n'accepterait pas l'origine.

**Le client écrit des adresses absolues vers `discord.com`.** C'est le piège le plus coûteux
du portage, parce qu'il ne se voit nulle part avant de tout casser. Discord ne demande pas
seulement `/api/v9/…` : il écrit aussi `https://discord.com/api/v9/channels/…/messages`.
Sur l'ordinateur, `host-rules` fait pointer ce nom vers le serveur local, et personne ne
remarque rien. Ici l'origine est `http://127.0.0.1:<port>` : la requête part vers le vrai
Discord et meurt en CORS. Le salon de Sakura affichait « Échec du chargement des messages »,
et les émojis de l'application ne se rafraîchissaient plus.

Le détour se fait à deux endroits, et il faut les deux :

- `src/Mobile/pont.ts` réécrit `fetch`, `XMLHttpRequest` et `sendBeacon` — tout ce qui passe
  par JavaScript, y compris les `POST`.
- `Branding.kt` rattrape le reste dans `shouldInterceptRequest` : un `<img src>`, une feuille
  de style. Seulement les `GET` — une WebView ne donne pas le corps d'un `POST`, mais aucun
  `POST` ne passe par là.

Le CDN (`cdn.discordapp.com`, `media.discordapp.net`) et les invitations gardent leurs
adresses : celles-là doivent bien sortir du téléphone.

**Les images de Voidcord n'existent pas sur le CDN de Discord.** Sakura est le compte système
de Voidcord, et Discord la traite comme n'importe quel utilisateur : il réclame son avatar et
sa bannière à `cdn.discordapp.com`. Electron redirige ces adresses au niveau de la session ;
`Branding.kt` fait la même chose dans la WebView. Attention au schéma : le message d'accueil
écrit ses émojis en `http://` et l'avatar en `https://` — filtrer sur `https://` seul laissait
les trois boutons sans icône pendant que l'avatar, lui, s'affichait.

**Une WebView n'a pas `getDisplayMedia`.** Le greffon de partage d'écran de Vencord s'en
empare au premier niveau de son module — `navigator.mediaDevices.getDisplayMedia.bind(…)` —
et son absence faisait tomber le paquet Vencord entier : plus de greffon Voidcord, plus
d'onglet Voidcord, plus de page de connexion par jeton. `src/Mobile/pont.ts` pose une
fonction qui refuse proprement, avant que Vencord ne se charge.

**Les pages de Voidcord se ferment à toute connexion** (`connect-src 'none'`), ce qui est
juste sur l'ordinateur où elles parlent par l'IPC d'Electron. Ici l'IPC *est* une requête
vers le serveur local : le serveur ouvre donc `connect-src` sur `'self'` au moment où il
sert ces pages. Sans cela, la page des réglages s'affichait vide.

**Vencord ne va que dans le client.** L'injecter aussi dans les pages de réglages ou de
connexion ne sert à rien et peut les casser.

**La barre de titre de Windows.** Discord la dessine parce que Voidcord lui fait croire
qu'il tourne sur un bureau : trois boutons qui ne font rien et trente-deux pixels perdus.
Elle est masquée par le calque, sur le préfixe de classe — l'empreinte change à chaque
version de Discord.

**La croix de l'écran de démarrage quitte l'application.** C'est son rôle sur
l'ordinateur ; sur un téléphone on la prend pour un « passer », et elle ferme Voidcord au
moment d'y entrer. Elle est masquée : on passe l'animation avec « Passer », et on quitte
avec le bouton retour d'Android.

## Ce qui ne marche pas, et pourquoi

- **Le partage d'écran.** Android ne l'expose pas à une WebView.
- **La détection de jeux.** Elle lit les processus de Windows.
- **La mise à jour automatique.** Android exige que l'utilisateur confirme l'installation
  d'un APK : l'application annonce la version disponible et ouvre la page des versions.
- **L'icône de l'embed d'accueil reste parfois vide.** `SystemMessages.ts` la fait venir
  d'imgur (`i.imgur.com`), pas des fichiers de l'application : elle dépend donc du réseau
  du téléphone. La loger dans `assets/branding/` comme les autres la rendrait sûre.
- **Le téléphone bascule en paysage pendant l'animation.** Elle est dessinée pour une
  fenêtre de 1536 sur 864 : en portrait, on n'en voyait que le centre et le bouton
  « Passer » tombait hors de l'écran. L'orientation revient à celle du téléphone dès que
  le client paraît.

## Le client de bureau, et pourquoi

Voidcord se présente à Discord comme **Chrome sous Windows**, pas comme un téléphone. Ce
n'est pas un détail de confort : Discord ampute son client web mobile, et plusieurs plaintes
qui ressemblaient à des bugs du portage venaient de là. Mesuré sur un Galaxy A22, dans le
même salon, avant et après le changement de la chaîne d'identification :

| | mobile | bureau |
| --- | --- | --- |
| Sélecteur de GIF | absent | présent |
| Autocollants | absents | présents |
| Salons vocaux visibles | 0 | 3 |
| Barre des serveurs | repliée | 71 entrées |
| Micro | « navigateur non pris en charge » | fonctionne |

La WebView, elle, n'a jamais rien manqué : `RTCPeerConnection`, `getUserMedia` et les
WebSockets y fonctionnent, et le micro s'ouvre. C'est Discord qui ferme la porte d'après la
chaîne d'identification.

Le prix à payer est la mise en page : le client de bureau se déplie sur mille vingt-quatre
points, que `reglerLaMiseEnPage` dans `src/Mobile/pont.ts` réduit à la largeur de l'écran.
Le texte est petit, mais tout est à sa place et le zoom au doigt reste disponible.

**Les images en clair.** Quelques émojis sont demandés en `http://` sur le CDN de Discord.
Android refuse le trafic en clair depuis la version 9, et la configuration réseau ne
l'autorise que vers 127.0.0.1 : ces images restaient vides, sans rien dans la console.
`Branding.kt` les rejoue en `https`.
