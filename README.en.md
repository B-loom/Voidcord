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
