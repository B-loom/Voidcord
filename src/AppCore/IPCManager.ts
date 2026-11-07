/* Copyright Elysia © 2025. All rights reserved */

import { APIApplication, ApplicationFlags, GatewayIntentBits } from "discord-api-types/v10";
import { app, BrowserWindow, dialog, IpcMainEvent, IpcMainInvokeEvent, WebContents } from "electron";
import { autoUpdater } from "electron-updater";
import { ApplicationFlagsBitField, IntentsBitField } from "src/AppUtils/DiscordBitField";
import { ApexExperiment, GuildExperiment, UserExperiment } from "src/AppUtils/Experiments";
import GameDetection from "src/AppUtils/GameDetection";
import { cacheValidatedBotToken } from "src/AppUtils/ValidateBotToken";

import type { DiscordBotClient } from ".";
import { localizedSetting, settingsDefinitions } from "../shared/Settings";
import Constants from "./Constants";
import { IPCEvent } from "./IPCEvents";
import UserAuth from "./UserAuth";

export function isTrustedAppFrame (event: IpcMainEvent | IpcMainInvokeEvent, contents: WebContents | undefined): boolean {
    if (!contents || event.sender !== contents || event.senderFrame !== contents.mainFrame) return false;
    try {
        return new URL(event.senderFrame.url).origin === `https://${Constants.CustomDiscordDomain}`;
    } catch {
        return false;
    }
}

/**
 * Nebula ouvre une fenêtre de client par compte : la fenêtre principale n'est donc pas
 * la seule à avoir le droit de parler au processus principal. Le contrôle d'origine est
 * élargi à ces fenêtres, et à elles seules.
 */
export function isTrustedClientFrame (event: IpcMainEvent | IpcMainInvokeEvent, mainApp: DiscordBotClient): boolean {
    if (isTrustedAppFrame(event, mainApp.discordWebContents)) return true;
    for (const win of mainApp.accountWindows.values()) {
        if (!win.isDestroyed() && isTrustedAppFrame(event, win.webContents)) return true;
    }
    return false;
}

/**
 * Les comptes enregistrés se pilotent depuis deux endroits, et deux seulement : la
 * fenêtre de connexion séparée (avec son captcha, qui charge un fichier local) et
 * l'écran d'ajout de compte que Nebula dessine à l'intérieur de Discord. Oublier le
 * second, c'est refuser toute connexion par compte avec « expéditeur IPC non autorisé ».
 */
export function isAccountFrame (event: IpcMainEvent | IpcMainInvokeEvent, mainApp: DiscordBotClient): boolean {
    if (isTrustedClientFrame(event, mainApp)) return true;
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow || senderWindow.isDestroyed()) return false;
    if (event.senderFrame !== event.sender.mainFrame) return false;
    return senderWindow === mainApp.accountWindow || senderWindow.getParentWindow() === mainApp.accountWindow;
}

export function isAllowedPopoutURL (url: string, port: number): boolean {
    if (url === "about:blank") return true;
    try {
        const parsed = new URL(url);
        return parsed.pathname === "/popout" && [
            "https://discord.com",
            "https://ptb.discord.com",
            "https://canary.discord.com",
            `https://localhost:${port}`,
        ].includes(parsed.origin);
    } catch {
        return false;
    }
}

export function setupIPCEvents (mainApp: DiscordBotClient) {
    const getWindow = (event: IpcMainEvent, frameName?: string): BrowserWindow | undefined => {
        if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) return;
        if (isTrustedAppFrame(event, mainApp.discordWebContents)) {
            return frameName ? mainApp.childWindows.get(frameName) : mainApp.appWindow;
        }
        /*
         * Nebula ouvre une fenêtre de client par compte. Les boutons de barre de titre
         * doivent agir sur la fenêtre où l'on a cliqué : sans cela, un deuxième client
         * réduisait ou agrandissait le premier.
         */
        for (const accountWindow of mainApp.accountWindows.values()) {
            if (!accountWindow.isDestroyed() && isTrustedAppFrame(event, accountWindow.webContents)) {
                return frameName ? mainApp.childWindows.get(frameName) : accountWindow;
            }
        }
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (!senderWindow || ![...mainApp.childWindows.values()].includes(senderWindow)) return;
        if (isAllowedPopoutURL(event.senderFrame.url, mainApp.port)) return senderWindow;
    };
    mainApp.ipcMain
        .on(IPCEvent.Minimize, (event, frameName) => {
            getWindow(event, frameName)?.minimize();
        })
        .on(IPCEvent.Maximize, (event, frameName) => {
            const win = getWindow(event, frameName);
            if (!win) return;
            if (win.isMaximized()) {
                win.restore();
            } else {
                win.maximize();
            }
        })
        .on(IPCEvent.Close, (event, frameName) => {
            const win = getWindow(event, frameName);
            if (!win) return;
            if (win === mainApp.appWindow) win.hide();
            else win.close();
        })
        .on(IPCEvent.Focus, (event, frameName) => {
            const win = getWindow(event, frameName);
            if (!win) return;
            if (win === mainApp.appWindow && !frameName) return mainApp.showApp();
            // this.appWindow.focus();
            win.show();
            win.setSkipTaskbar(false);
        })
        .on(IPCEvent.FlashFrame, (event, flag: boolean) => {
            const win = getWindow(event);
            if (!win || win.isDestroyed() || (flag && win.isFocused())) return;
            win.flashFrame(flag);
        })
        .on(IPCEvent.RequestCloseWindow, event => {
            getWindow(event)?.close();
        });
    mainApp.ipcMain.handle(IPCEvent.GetBotInfo, (event, token) => {
        if (!isTrustedClientFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        if (typeof token !== "string" || token.length > 512) throw new Error("Jeton de bot invalide.");
        token = token.trim().replace(/^Bot\s+/i, "").trim();
        return mainApp.discordSession
            .fetch("https://canary.discord.com/api/v9/applications/@me?with_counts=true", {
                headers: {
                    Authorization: `Bot ${token}`,
                    "User-Agent": Constants.UserAgentDiscordBot,
                },
            })
            .then(res => {
                if (!res.ok) throw new Error(res.statusText);
                return res.json() as Promise<APIApplication>;
            })
            .then(data => {
                const applicationFlags = new ApplicationFlagsBitField(data.flags);
                const skipIntents = new Set<GatewayIntentBits>([
                    GatewayIntentBits.GuildPresences,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.MessageContent,
                ]);
                if (
                    applicationFlags.has(ApplicationFlags.GatewayPresence) ||
                    applicationFlags.has(ApplicationFlags.GatewayPresenceLimited)
                ) {
                    skipIntents.delete(GatewayIntentBits.GuildPresences);
                }
                if (
                    applicationFlags.has(ApplicationFlags.GatewayGuildMembers) ||
                    applicationFlags.has(ApplicationFlags.GatewayGuildMembersLimited)
                ) {
                    skipIntents.delete(GatewayIntentBits.GuildMembers);
                }
                if (
                    applicationFlags.has(ApplicationFlags.GatewayMessageContent) ||
                    applicationFlags.has(ApplicationFlags.GatewayMessageContentLimited)
                ) {
                    skipIntents.delete(GatewayIntentBits.MessageContent);
                }
                if (
                    skipIntents.has(GatewayIntentBits.MessageContent) &&
                    !mainApp.config.config.suppress_intent_warning
                ) {
                    dialog.showErrorBox(
                        "L’intent MessageContent est requis",
                        "Active l’intent MessageContent dans les réglages de ton application, sur le portail Discord.\nPour ne plus voir cet avertissement, change le réglage correspondant dans les paramètres de Nebula (clic droit sur l’icône de la zone de notification).",
                    );
                    throw new Error("L’intent MessageContent est requis.");
                }
                cacheValidatedBotToken(data.bot?.id ?? data.id, token);
                return {
                    success: true,
                    data,
                    intents: IntentsBitField.getIntents(...Array.from(skipIntents)),
                    allShards:
                        Math.ceil(
                            ((
                                data as APIApplication & {
                                    // New field, it reflects the number of guilds that have actually added this application as a bot profile
                                    // @undocumented
                                    bot_approximate_guild_count?: number;
                                }
                            ).bot_approximate_guild_count ??
                                // Old field, it reflects the number of guilds that have added this application as an intergration
                                data.approximate_guild_count ??
                                0) / Number(mainApp.config.config.guilds_per_shard),
                        ) || 1,
                };
            })
            .catch(e => {
                return {
                    success: false,
                    message: e.message,
                };
            });
    });
    mainApp.ipcMain.handle(IPCEvent.RequestOpenMessageEditorWindow, event => {
        if (!isTrustedClientFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        return mainApp.openDiscordMessageEditorWindow();
    });
    mainApp.ipcMain
        .on(IPCEvent.GetVersion, event => {
            event.returnValue = isTrustedClientFrame(event, mainApp) ? app.getVersion() : null;
        })
        .on(IPCEvent.GetName, event => {
            event.returnValue = isTrustedClientFrame(event, mainApp) ? app.getName() : null;
        })
        .on(IPCEvent.GetExperiment, (event, type, botId, allData) => {
            if (!isTrustedClientFrame(event, mainApp)) {
                event.returnValue = null;
            } else if (type === "user") {
                event.returnValue = UserExperiment(allData, botId);
            } else if (type === "guild") {
                event.returnValue = GuildExperiment();
            } else if (type === "apex") {
                event.returnValue = ApexExperiment(botId);
            } else {
                event.returnValue = null;
            }
        })
        .on(IPCEvent.GetDefaultUserPatch, event => {
            event.returnValue = isTrustedClientFrame(event, mainApp) ? Constants.UserDefaultPatch : null;
        })
        .on(IPCEvent.GetIsUserToken, (event, token: string) => {
            event.returnValue = isTrustedClientFrame(event, mainApp) ? UserAuth.isUserToken(token ?? "") : null;
        })
        .on(IPCEvent.GetSupportInvite, event => {
            event.returnValue = isTrustedClientFrame(event, mainApp) ? Constants.SupportInvite : null;
        })
        .on(IPCEvent.GetLangue, event => {
            // La langue sert à toutes les fenêtres de Nebula, y compris celle de connexion
            event.returnValue = isAccountFrame(event, mainApp) ? mainApp.config.config.langue : null;
        })
        .on(IPCEvent.GetAccountTokens, event => {
            /*
             * Le sélecteur de comptes de Discord demande un jeton de façon synchrone, au
             * moment du clic : une réponse différée arriverait trop tard. Les jetons ne
             * sortent pas de l'application, et seules ses propres fenêtres les obtiennent.
             */
            event.returnValue = isAccountFrame(event, mainApp)
                ? UserAuth.accounts.filter(a => a.id).map(a => ({ id: a.id as string, token: a.token }))
                : null;
        })
        .on(IPCEvent.GetBotAccountIds, event => {
            event.returnValue = isTrustedClientFrame(event, mainApp)
                ? UserAuth.accounts.filter(a => a.bot && a.id).map(a => a.id as string)
                : null;
        })
        .on(IPCEvent.GetRunningGames, event => {
            event.returnValue = isTrustedClientFrame(event, mainApp) ? GameDetection.snapshot() : null;
        })
        .on(IPCEvent.RememberBot, async (event, token: string) => {
            if (!isTrustedClientFrame(event, mainApp) || !token || typeof token !== "string") return;
            await UserAuth.storeBot(token);
            mainApp.setupTray();
        });
    // User Account Login (email + password)
    mainApp.ipcMain.handle(IPCEvent.OpenAccountLoginWindow, event => {
        if (!isTrustedClientFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        // Remember which client window asked, so the account lands in that one
        mainApp.openAccountLoginWindow(BrowserWindow.fromWebContents(event.sender) ?? undefined);
    });
    mainApp.ipcMain.handle(IPCEvent.AccountLogin, async (event, { login, password, captcha }) => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        const result = await UserAuth.login({
            login,
            password,
            captchaKey: captcha?.key ?? null,
            captchaRqtoken: captcha?.rqtoken ?? null,
        });
        // The tray lists the saved accounts, so it has to know about the new one
        if (result.status === "success") mainApp.setupTray();
        return result;
    });
    mainApp.ipcMain.handle(IPCEvent.AccountTokenLogin, async (event, token: string) => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        const result = await UserAuth.loginWithToken(token);
        if (result.status === "success") mainApp.setupTray();
        return result;
    });
    mainApp.ipcMain.handle(IPCEvent.AccountMfa, (event, { ticket, code, method }) => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        return UserAuth.mfa({ ticket, code, method });
    });
    mainApp.ipcMain.handle(IPCEvent.AccountSendSms, (event, ticket: string) => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        return UserAuth.sendSms(ticket);
    });
    mainApp.ipcMain.handle(IPCEvent.AccountSolveCaptcha, (event, { sitekey, rqdata }) => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        return mainApp.openCaptchaWindow(sitekey, rqdata ?? null);
    });
    mainApp.ipcMain.handle(IPCEvent.AccountList, event => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        // The token is needed by the renderer to pick an account, it never leaves the app
        return UserAuth.accounts;
    });
    mainApp.ipcMain.handle(IPCEvent.AccountRemove, (event, token: string) => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        UserAuth.remove(token);
        return UserAuth.accounts;
    });
    mainApp.ipcMain.handle(IPCEvent.AccountUse, (event, token: string) => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        return mainApp.loginWithUserToken(token);
    });
    mainApp.ipcMain.handle(IPCEvent.AccountOpenWindow, (event, token: string) => {
        if (!isAccountFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        return mainApp.openClientWindow(token);
    });
    /*
     * Les réglages lus et écrits depuis la page Nebula, à l'intérieur de Discord : la
     * fenêtre à part reste, mais on n'est plus obligé d'y passer.
     */
    mainApp.ipcMain.handle(IPCEvent.GetSettings, event => {
        if (!isTrustedClientFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        const langue = mainApp.config.config.langue;
        /*
         * Un aller-retour par JSON : les définitions sont gelées et typées « as const »,
         * et l'IPC refusait de les copier (« An object could not be cloned »). La page
         * recevait alors une liste vide et n'affichait aucun réglage.
         */
        return JSON.parse(JSON.stringify({
            ...mainApp.config.snapshot(),
            /*
             * Les libellés partent déjà traduits, mais le reste de la définition doit
             * suivre : sans le type ni la clé, la page affichait onze lignes sans le
             * moindre bouton pour les changer.
             */
            definitions: settingsDefinitions.map(definition => {
                const traduit = localizedSetting(definition, langue);
                return {
                    ...definition,
                    displayName: traduit.displayName,
                    description: traduit.description,
                    options: "options" in definition
                        ? definition.options.map(option => ({
                            value: option.value,
                            label: traduit.optionLabel(option.value, option.label),
                        }))
                        : undefined,
                };
            }),
        }));
    });
    mainApp.ipcMain.handle(IPCEvent.SaveSettings, (event, valeur) => {
        if (!isTrustedClientFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        return JSON.parse(JSON.stringify(mainApp.config.save(valeur)));
    });
    // Les réglages de Nebula, ouverts depuis l'onglet Nebula du client
    mainApp.ipcMain.handle(IPCEvent.OpenSettings, event => {
        if (!isTrustedClientFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        mainApp.openSettingsWindow();
    });
    // Updates
    mainApp.ipcMain.handle(IPCEvent.UpdateCheck, event => {
        if (!isTrustedClientFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        return mainApp.checkingForUpdates(true);
    });
    mainApp.ipcMain.handle(IPCEvent.UpdateInstall, event => {
        if (!isTrustedClientFrame(event, mainApp)) throw new Error("Expéditeur IPC non autorisé.");
        autoUpdater.quitAndInstall(true, true);
    });
    mainApp.ipcMain.on(IPCEvent.UpdateGetState, event => {
        event.returnValue = isTrustedClientFrame(event, mainApp) ? mainApp.updateState : null;
    });
}
