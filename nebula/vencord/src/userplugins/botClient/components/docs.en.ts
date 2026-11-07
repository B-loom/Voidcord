/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * The English documentation and changelog, shown when Nebula's language is set to
 * English. The French texts in docs.ts remain the originals: they are written first, and
 * these are their translation. README_EN is copied from README.en.md by
 * scripts/syncReadme.mjs before every build, exactly as README is from README.md.
 */

export const README_EN = `# Nebula

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

\`requirement\` installs the root lockfile, checks out the pinned Vencord, BotClient plugin, and Discohook revisions from \`scripts/build-dependencies.json\`. Existing checkouts are never reset; a mismatched revision stops with an error so local work is not lost. \`build\` packages locally without publishing. Maintainers should use the [release process](docs/release-process.md) for tags and artifacts. After building, run \`npm run typecheck\` for TypeScript and \`npm test\` on Windows for the Electron integration suite. Use \`npm start\` to launch the app.

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

Only the token is kept, in the \`accounts.json\` file inside Nebula's data folder, on this
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
`;

export const CHANGELOG_EN = `# What's new

## v1.2.9 — Accounts, settings and language

### Reloading no longer signs you out
- **Ctrl+R sent you back to the account picker.** On reload, Discord opens the gateway and
  identifies itself before Nebula has had a chance to step in. The user account was then
  taken for a bot when READY arrived, and the client signed itself out. Nebula now
  recognises the account as soon as the page loads, without waiting for the identify.

### The language says what it does
- **Changing the language looked like it did nothing**: Nebula's texts are read once, at
  load time, and screens already on display kept the old language. The choice was being
  saved; what was missing was saying so. A banner now announces it and offers to reload —
  which no longer signs you out. Settings that touch the network (DNS, proxy, cache) say
  instead that they will wait for the next launch.

### Settings, inside the page
- **The documentation and the changelog exist in English.** Choosing English in the
  settings only changed buttons and labels; those two pages stayed in French, and they are
  the longest ones. They are translated, and they follow the language.

- **Nebula's settings are shown and changed in the Nebula tab**, under "Settings": the
  language, the startup screen style, automatic update checks, encrypted DNS, the system
  proxy. The separate window is still there, but you no longer have to go through it. Every
  change is written straight away.

### What Nebula was holding back without knowing
- **Favourites and server order came back empty**, even after the route was fixed: the
  plugin was replacing Discord's network call with a read from its local database, the one
  that only serves bots. The fixed route was therefore never reached. A user account now
  goes back out to the network.
- **Custom stickers were refused for everyone.** The refusal came from a hard-coded
  "return false", fair enough for a bot, applied to accounts as well. Same story for long
  messages: Discord now decides for itself, account by account.

### Worth knowing about Nitro
Discord has three subscriptions, and **Nitro Basic does not open the same doors as full
Nitro**: it keeps custom stickers to their home server and stops uploads at 50 MB instead
of 500. Nebula no longer misrepresents a user account's subscription: what the client
announces is now yours. Those caps are lifted on the client side — Discord's servers remain
free to refuse.

### Your account was no longer quite yours
- **Real Nitro was being downgraded.** Nebula announced "Nitro Classic" for *every*
  account, yours included: Discord was therefore refusing stickers to someone who has full
  Nitro. That invention is meant for a bot, which has neither a subscription nor a phone;
  a user account now keeps its own.
- **Purchases shown as owned** came from the same place: the shop believed you already had
  decorations you did not have.
- **Your favourite GIFs, stickers and emoji came back empty**, and **your server order was
  lost on the first launch.** Same cause: both of those live in your Discord settings, and
  Nebula was answering in their place from its local database — the one it keeps for bots,
  which have no settings at Discord. A user account is now sent back to Discord.

### Language
- **Choosing "Français" on the welcome screen gave an English client.** Discord applied the
  account's language over Nebula's once signed in. Nebula now imposes its own.
- **A "Nebula settings" button** in the Nebula tab opens the settings window — language,
  startup screen, automatic updates, DNS. It could only be reached through the system tray
  icon.

### Profiles
- **A game you do not know was showing on your profile.** Discord's catalogue maps games to
  executable names, and several games claim the same ones — "game.exe", "launcher.exe".
  Nebula kept whichever came first, so a game at random. Shared names are now set aside:
  better to say nothing than to say anything.
- **The signed-in bot wears every badge**, like the system account.
- **The system account was born with Nebula.** Its profile said 13 May 2015, the date
  Discord was created, because it borrowed an id from that era. It now shows 29 October
  2026, the day the first version was published.

### The shop and blocked windows
- **The "Add a payment method" window** span forever. It now shows the usual explanation,
  like the other pages that need Discord's payment machinery.

### Signing back into an account
- **The "Sign in" button in the account picker really does sign you back in.** Until now it
  sent you to the "Add an account" screen, then to Discord's own form: Discord looks for the
  token in *its* store, which does not hold Nebula's, concludes there is none and shows "Try
  signing in again". Nebula now takes over that click and signs in with the saved token, as
  if it had been pasted by hand.
- **No more "Windows Security" window** asking for a passkey. It came from Discord's login
  form and led nowhere, since the local server already refuses WebAuthn. The request is
  blocked before anything opens.
- **Ctrl + R no longer signs you out.** A session opened properly survives a reload.

### Accounts and profiles
- **A bot no longer shows the game running on your machine.** Game detection shows what is
  running on the computer: on a bot that is not its activity but yours, and it has no
  business on its profile.
- Discord's settings cache is emptied when switching accounts: it is not filed per account,
  and the next one inherited the previous one's settings.

### Interface
- **The colours are right again.** Discord removed nine colour variables
  (\`--text-normal\`, \`--header-primary\`, \`--background-primary\`…): Nebula's screens that
  named them ended up with wrong shades, or a background that no longer matched the
  client's. Thirty-one places were reworked.
- **The shop says so instead of spinning.** The "Add a payment method" window kept loading
  forever: it needs Discord's payment machinery, which is not here. It now shows the usual
  explanation.
- **The empty band above the account bar**: the quest card was hidden but its box remained,
  and a box keeps its height. The hiding no longer looks for a precise class name — Discord
  renames them with every release — but walks up to the element placed in the sidebar.

### Updates
- **A progress bar appears over the client**, wherever you are, and says when the download
  is done. It only existed in the Nebula tab: you had to think of it and open it to know
  where the update stood.

### Diagnostics
- **The log finally receives what Nebula writes from inside the client.** It only kept
  Discord's errors: Nebula's own messages — signing back into an account, the gateway
  closing, share quality — never reached it, even though those are exactly what you go
  looking for in \`%APPDATA%\\Nebula\\logs\\main.log\`.
- Settings and favourites were out of reach from an extra client window: the answer was
  only handed back to the main window.

## v1.2.8 — The base moves to DiscordBotClient 3.10.3

The whole core of the application was taken over from version 3.10.3 of the original
project, with everything it brings, and Nebula's additions were carried onto it one by one.

### New in 3.10.3
- **A startup screen**, in two styles: modern, or Discord's way. It also says what happened
  when startup fails, with a button to try again.
- **A real settings window**, with a search box, replacing the configuration editor where
  the file had to be written by hand. It is in French.
- **Encrypted DNS accepts several providers** (Cloudflare, Google, Quad9), and the system
  proxy can now be followed instead of direct connections.
- **The update check at startup can be turned off.**
- **The upload limit goes up to 20 MB.**
- **The old embed editor is back**, to be enabled in the BotClient plugin's settings if you
  prefer it to the message editor.
- **Application emoji appear in the emoji picker.**
- From "New message", you can **open a direct message with someone from their id**.

### Fixed in 3.10.3
- The bot's token is **checked before certain internal requests**.
- **Missing slash commands** are back.
- A **message over 2,000 characters** no longer breaks sending.
- **Forum and Media** channels no longer stay stuck on their loading skeleton.
- Loading **someone's profile** no longer breaks when application data is missing.
- An error in an internal exchange (IPC) **no longer freezes the application**.
- Several window-handling faults, and the **local server hardened** after security reports.
- Protocols are handled faster, and needless round trips between the client and the main
  process are gone.

### On Nebula's side
- The **extra client windows** (one per account) were reattached to the main process's new
  access control: without that they were no longer allowed to talk to it, and a second
  window's title bar acted on the first.
- Encrypted DNS stays **on Cloudflare by default**, as before.
- Discord is pinned to stable build 657850, Vencord to 1.15.15. Vencord removed some older
  components there: Nebula's screens were adapted.
- **A new startup image**, and the line drawing that precedes it was redone from it. The
  credit button disappeared with the old illustration: Nebula no longer claims an author
  for the image shown.

### Fixed right after
- **Signing in with a Discord account was refused** with "unauthorised IPC sender". The new
  access control in 3.10.3 only allowed the separate login window, while Nebula has drawn
  the add-account screen inside Discord since 1.2.7. Both are accepted, and only those two.
- **The add-account screen's text was unreadable**, black on a dark background. Discord
  renamed its colours in build 657850: \`--text-normal\`, \`--header-primary\` and
  \`--header-secondary\` no longer exist, and a colour that cannot be found is not applied
  at all. Every colour borrowed from Discord now has a fallback. The screen-share screen,
  the token login screen and the Nebula tab had the same fault.
- **Error messages that had come back in English** are translated again: the IPC sender, an
  invalid bot token, the MessageContent intent warning, configuration errors and the
  confirmation for deleting data. The add-account screen no longer shows Electron's wrapping
  ("Error invoking remote method…") around the message.
- **A bot that tries to share its screen is finally told.** The button did nothing: Discord
  reserves "Go Live" for user accounts, and the bot gateway does not carry those operations.
  A message now says so instead of silence.
- **Screen sharing would not start at all**, even with a user account. The hardening in
  3.10.3 only accepted "media" requests with sound and without video — but a screen-share
  request arrives with an **empty** list of types. It was therefore refused in a
  millisecond, before Nebula's picker even existed. The camera is still refused. That
  decision now lives in a function of its own, and a test pins down all eight cases: it can
  no longer change in silence.
- **A 12 MB file was refused** with "Max file size is 1.00 GB", which meant nothing. Discord
  raised its default limit to 20 MiB on 3 September 2026; 3.10.3 only raised the Nitro
  tiers, leaving 10 MiB for everyone else — so for every bot. The floor is back up to
  20 MiB. Beyond that you need a boosted server: 50 MB at tier 2, 100 MB at tier 3.
- **The red block behind the microphone button**, when muted, is gone. The crossed-out icon
  was enough.

### Screen sharing
- **Quality and frame rate can be chosen** in the picker, as you share: 720p, 1080p, 1440p
  or the source's own resolution, at 15, 30 or 60 frames per second. The choice is kept from
  one share to the next. It is a ceiling placed on the capture: Discord re-encodes for voice
  afterwards, and may go below it.

### Other fixes
- **An invite opened from the client** still showed the "Discord App Detected" page, which
  offers to open a desktop application — a dead end, since Nebula *is* the application. The
  detour was only taken for links opened in a new window; it is now taken when the link
  opens in place as well.
- **Every gateway close is now written to the log** with its code and reason, in
  \`%APPDATA%\\Nebula\\logs\\main.log\`. A disconnection "for no reason" will leave something
  to understand it by.
- The last two login error messages still in English are translated.

### New plugin
- **NebulaPlateforme** picks the device you appear to be connecting from: computer, browser,
  Android phone, iPhone, console or VR headset. That is the little badge others see next to
  your name. The change takes effect on the next connection.

## v1.2.7 — Screen sharing, built-in windows and tidying up

### New
- **Screen sharing works.** It never had: no capture handler was installed, and Electron
  refused the request without a word. A picker now opens inside Discord, with Screens and
  Windows tabs, live thumbnails and the choice to include the computer's sound.
- **Signing in happens inside Discord**, in a client window, instead of a separate one. The
  captcha keeps its own: hCaptcha is only accepted on a page served by Discord.
- A **NebulaStatut** plugin keeps your activity off your profile — the game you are playing,
  or everything else if you want.
- Plugins written for Nebula have their **own section at the top** of the plugins page,
  separate from Vencord's.
- The welcome message gains a button to **the project's website**.

### Fixes
- Screen sharing never started, even once capture was in place: Nebula was cutting the
  "streamCreate", "streamWatch", "streamPing" and "streamDelete" gateway operations for
  everyone, when only a bot cannot use them. The stream was therefore never created.
  "callConnect" had the same fault.
- Vencord's two screen-sharing plugins, written for browsers, got in the way: one replaced
  the capture and demanded 4K at 120 frames per second, the other wrote 80 Mbit/s into the
  negotiation. They no longer apply here.
- An invite opened from the client showed the "Discord App Detected" page. It now opens
  directly inside Discord.
- In the login window, typed text was unreadable on a dark theme and the buttons were
  misplaced.
- Discord's account picker filled the screen with no way to scroll.
- The bot token login screen had stayed in English, as had the screen-share settings window.

### Tidying up
- The "Boost your profile" card, the quests panel and the activity line under your name no
  longer show: none of the three leads anywhere here.
- The "Send a gift" window shows the usual explanation instead of the Nitro offer.

## v1.2.6 — Joining a server, and updates

### Fixes
- A user account can finally join a server. Nebula refused every invite with "cannot join
  guilds": that refusal came from the original plugin, written for bots, and did not look at
  the account type. Server templates had the same fault.

### New
- The Nebula tab says whether the application is up to date, with a green or red dot, and a
  button starts the check.
- Downloading an update shows its progress, then a button to restart and install it.

## v1.2.5 — Server link

### Fixes
- The welcome message's button led to an expired invite.
- It now copies the link instead of opening it: the browser does not know your account and
  so could not get you into the server. A window confirms the copy, and the link is to be
  pasted into Discord.

## v1.2.4 — First published version

### New
- Nebula warns you when a new version is published. The check now targets this project's
  repository, no longer the original one, whose releases would have replaced Nebula with a
  different application.

### Changes
- The project installs through a real Windows installer, and the code is published on
  GitHub.

## v1.2.3 — Buttons in the welcome message

### Changes
- The plain-text server link gives way to two buttons: join the Discord server, and open the
  project on GitHub, each with its logo.

## v1.2.2 — Tidying up and the login window

### Fixes
- The login window no longer cut off the top of the list when there were many accounts,
  leaving the form off screen. The list now scrolls on its own.

### Changes
- Discohook's build, its copy in the resources and the Android sources were removed from the
  project: about 200 MB that served no purpose any more.
- Code written for Vencord now lives in nebula/, under version control, and is copied onto
  the clone at every build. A Vencord update no longer erases it.

## v1.2.1 — Quests as well

### Changes
- Quests are blocked on both clients: their progress is checked by Discord's official
  client, so they would never advance here, account or bot.

## v1.1.9 — Blocking case by case

### Changes
- Only Nitro is blocked on both clients, since neither a bot nor Nebula can handle a
  subscription. The Shop, Quests and Discovery are only blocked for a bot: a Discord account
  belongs there.
- The panel finds the sidebar's edge better, which changes from page to page.

## v1.1.8 — The message replaces the page

### Changes
- Nitro, the Shop, Quests and Discovery show the message in place of the page, full size,
  instead of sending you back to the home screen. The sidebar stays usable.

## v1.1.7 — French and blocked pages

### New
- Vencord's plugins are described in French, and the page listing them too.
- NebulaApparence allows the display name and the username to be changed separately.

### Fixes
- The shop, Nitro and quests are finally blocked, as is discovery for a bot. The filter
  placed on Discord's router could not see the sidebar's links; it now watches the address
  itself.
- The author card for Nebula's plugins showed the profile of a Vencord contributor, whose id
  had been picked up by mistake. It now shows Nebula.

## v1.1.6 — Documentation, appearance and blocked pages

### New
- A "NebulaApparence" plugin allows the display name to be changed and badges to be picked.
  Everything is local: nothing is sent to Discord and nobody else sees it.
- Plugins written for Nebula carry its logo in the plugin list.
- The shop, Nitro and quests explain why they do not work here instead of opening empty, and
  server discovery does the same for a bot.

### Changes
- Version numbers move up one notch at a time. Older versions were renumbered: the count
  stops at 1.0.9, then picks up at 1.1.1, 1.1.2, and so on.
- The welcome message points to the Discord server rather than to an account.
- The Documentation page is now the project's README, copied at every build, and knows how
  to show callouts, separators and links.

## v1.1.5 — Grouped accounts everywhere

### Fixes
- The quick switch panel separates user accounts from bots too, like the "Manage accounts"
  window. Both lists read the same store, which now returns accounts already grouped.

## v1.1.4 — Games and accounts

### New
- Games you are playing finally show on your profile. A list of detected processes was not
  enough: Nebula now publishes a real activity, the same path rich-presence clients take.
- The account picker separates user accounts from bots under two headings, instead of
  stacking everything into one list.

### Fixes
- The "Discord App Detected" screen no longer replaces the client. It appeared because the
  client thought it was on the web; Nebula is the desktop application.

## v1.1.3 — Identity and restraint

### Fixes
- The account limit is genuinely lifted. The first fix only touched the truncation that
  follows adding one; the refusal came from the button itself, which showed the error
  instead of opening the login. Both are fixed.
- No trace of the original name left: repository, session id, download page, configuration
  editor and headers all carry Nebula now.

### Lightening
- Five Chromium services Nebula does not use are disabled: Cast discovery on the network,
  downloading optimisation rules, translation, autofill communication and content
  suggestions.
- The disk cache is capped at 64 MB, where Chromium let it grow without limit.
- Storage is written to disk once every five minutes instead of once a minute, with the
  moments that matter still covered.

## v1.1.2 — More than five accounts

### New
- The picker accepts **a hundred accounts** instead of five. Discord was not refusing the
  sixth: its code cut the list at the fifth and signed the rest out. Neither a named constant
  nor a check function, the number was written into the slice itself, found by reading the
  modules the client loads.

## v1.1.1 — Duplicate accounts

### Fixes
- An account signed in several times no longer appears twice in the list or in the menu.
  Each sign-in produces a different token, and entries were being compared by token rather
  than by account id.
- The bot token field left the login window: it duplicated the one on the welcome screen.
- The "user account" state is reset when Discord refuses the token or on sign-out, instead
  of staying active when nobody is signed in any more.

## v1.0.9 — Token, restraint, updates

### New
- Signing into an account **with a token**, with no password and no two-factor code. The
  token is checked with Discord before being saved, so that nothing breaks later without
  explanation.

### Lightening
- No more request logging: every image and every script Discord loaded wrote a line to disk,
  which cost processor time constantly.
- Game detection looks at processes once a minute instead of four times, and stops
  altogether when no window is on screen.

### Fixes
- No more update notifications from the original project. Nebula was querying its
  repository, and accepting one of its releases would have replaced Nebula with a different
  application.

## v1.0.8 — Emoji, files and windows

### New
- The editor has an **emoji catalogue**: a button opens the list, grouped by server, with a
  search box. No more copying an id by hand, neither for text nor for buttons.
- The editor accepts **attachments**: through the button or by drag and drop, ten files of
  10 MB at most. A message can now contain nothing but a file.

### Fixes
- The title bar buttons act on their own window. Minimising or maximising from a second
  window drove the first, because the target window was deduced from a name rather than from
  where the click came.
- The unavailable-page window takes the settings page's presentation.

## v1.0.7 — Bots sign back in

### Fixes
- A bot could not sign in again after its first launch. Remembering it so it would show in
  the account list put its token, on restart, among the user account tokens — and those are
  sent to Discord as they are, without the prefix reserved for bots. Bots are now left out of
  that list.
- The patches placed on Discord are isolated from one another: if one fails it is reported
  and the rest are still installed, instead of giving up on everything after it.

## v1.0.6 — The editor really sends

### Fixes
- The message editor finally sends. The link with the client was properly established, but
  the page rejected the channel because it checked where the message came from: the channel
  is now handed over from the preload's isolated world, where that origin is not the page
  itself.
- New windows no longer have the system's title bar: they take the main window's framing,
  where Discord draws its own.
- The creator keeps his real badges. The decorative badges added to every profile no longer
  apply to his, which therefore shows only what he actually earned, plus Nebula's.
- Bots are remembered as soon as they sign in, and appear in their category of the tray menu
  without having to go through the login window.
- Creating or joining a server is intercepted earlier, when the window opens and no longer
  only on confirmation.

## v1.0.5 — Nebula's message editor

### New
- **A new message editor**, written for Nebula, in place of the one borrowed elsewhere. It
  handles content, up to ten complete embeds (title, description, colour, author, thumbnail,
  large image, footer, date, aligned fields) and buttons that open a link, with custom
  emoji. The preview updates as you type and the "beta" label is gone.
- The editor's button only appears on a bot, since it sends with the bot's credentials.
- Creating or joining a server from a bot shows an explanation: a bot joins a server through
  its OAuth invite link, added by the server's owner.
- Saved accounts are sorted into two categories, **user accounts** and **bots**, in the login
  window as in the tray menu. A bot opened in its own window is remembered for next time.

## v1.0.4 — Every window in its place

### Fixes
- Signing into an account from a second window no longer hijacks the first. The login window
  remembers which one opened it and sends the account back there.
- The unavailable page tells the truth case by case: on an account, that Nebula does not
  support this page and that the official client is needed; on a bot, that a bot has neither
  Nitro nor a subscription.
- The Creator Nebula badge shows on a user account too. Its profile went straight to Discord,
  skipping the step that adds the badge.

## v1.0.3 — Several windows and identity

### New
- The tray menu opens **a new Discord window** directly, and offers each saved account in its
  own window. Several Discords side by side, each with its own session: a bot here, your
  account there.
- A **Creator Nebula** badge for the project's author, with the application's logo.
- The welcome channel says who to contact if something goes wrong.

### Fixes
- Nitro, the shop and account connections are marked unavailable for everyone, not only for
  bots: they need Discord's payment and authentication machinery, which this client does not
  carry. That happens on the official client.
- Detected games are written to the log the moment the client receives them, to tell a
  detection problem from a display problem.

## v1.0.2 — Game detection and connections

### New
- Games you are playing are detected and shown in your activity. This client does not have
  Discord's native module, so Nebula reads the system's process list and compares it with the
  public catalogue of recognised games, every fifteen seconds.
- A bot can open in its own window from the login window: an account in one window, a bot in
  another, at the same time.

### Fixes
- External account connections work again. The authentication callback arrives on a page with
  no token, and the list of routes forbidden to bots applied to that page as though it were
  an API call, which refused it every time. That list now only covers API calls.
- Saved direct messages hold up better against an abrupt restart: storage is written to disk
  regularly, on sleep and on shutdown, instead of waiting for the browser's good will.
- Settings open faster. The pages Nebula adds were rebuilt every time they opened, which
  forced the whole panel to remount.
- A category no longer shows more than one "Unavailable" entry instead of stacking one per
  hidden page.

## v1.0.1 — Fixes and finishing touches

### Fixes
- Settings no longer crash the client. The menu customisation applied to every nested panel
  instead of the root layout alone, which inserted sections where Discord expects none.
- The system channel's profile finally shows with its badges, its bio and its banner. An
  internal route answered 404 before the profile was built, because route files are
  registered in alphabetical order and a catch-all came first.
- The system channel stays at the top of the direct messages. Discord sorts by the last
  message's id, and its own was too low to rise.
- The client starts in French even with a bot, which has no language of its own.

### Interface
- The system channel wears every Discord badge and its banner is animated.
- Its creation date is Discord's own, 13 May 2015.
- The application's logo is now round.
- The tray menu has been slimmed down.
- The plugin card shows Nebula as the publisher.
- The Nebula section is a category in its own right, no longer an entry filed under Vencord.
- The pages unavailable to a bot now cover connected applications and message permissions too.

### Under the hood
- The client's errors are written to the application's log, which makes it possible to
  diagnose a crash without opening the developer tools.
- The pages Nebula adds are protected: an error in one of them shows in its place instead of
  taking the client down with it.

## v1.0.0 — Nebula

### Signing in with a Discord account
- A new login window with email address and password.
- Captcha handling in a window of its own, served from Discord's origin.
- Two-factor authentication: app, SMS and backup codes.
- Accounts are saved and reusable in one click.
- Each account can open in its own window, with its own session.

### User account compatibility
- Direct messages, the member list, friends and the real profile are no longer replaced by
  the fake data meant for bots.
- The email address and phone number shown are the real ones.
- The automatic sign-out that targeted non-bot accounts has been removed.

### Interface
- The application is now called Nebula, with a new icon.
- The whole application interface is in French.
- A new Nebula section in the settings, with the application's information, the documentation
  and this page.
- Pages reserved for user accounts show an explanation when a bot is signed in.
`;
