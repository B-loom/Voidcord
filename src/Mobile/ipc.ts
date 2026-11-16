/* Copyright Elysia © 2025. All rights reserved */

/*
 * L'IPC de Voidcord, sans Electron.
 *
 * `IPCManager.setupIPCEvents` enregistre ses gestionnaires sur un `DiscordBotClient` —
 * un objet qui n'existe que pour piloter des fenêtres Electron. Plutôt que de faire
 * semblant d'en avoir un, les mêmes canaux sont réenregistrés ici, avec la même logique
 * et les mêmes modules : `GlobalConfig`, `UserAuth`, les expériences, les définitions de
 * réglages. Seuls changent les gestes qui supposaient une fenêtre.
 *
 * Le contrôle d'origine d'Electron (`isTrustedAppFrame`) n'a pas d'équivalent : ici le
 * serveur n'écoute que sur 127.0.0.1, à l'intérieur du bac à sable de l'application, et
 * seule la WebView de Voidcord peut l'atteindre.
 */

import { APIApplication, ApplicationFlags, GatewayIntentBits } from "discord-api-types/v10";
import { autoUpdater } from "electron-updater";

import { GlobalConfig } from "../AppCore/Config";
import Constants from "../AppCore/Constants";
import { IPCEvent } from "../AppCore/IPCEvents";
import UserAuth from "../AppCore/UserAuth";
import { ApplicationFlagsBitField, IntentsBitField } from "../AppUtils/DiscordBitField";
import { ApexExperiment, GuildExperiment, UserExperiment } from "../AppUtils/Experiments";
import { cacheValidatedBotToken } from "../AppUtils/ValidateBotToken";
import { localizedSetting, settingsDefinitions } from "../shared/Settings";
import { annoncer } from "./bus";

export type EtatDemarrage = { phase: "starting" | "loading" | "ready" | "error"; message?: string };

type Gestionnaire = (...args: never[]) => unknown;

export class HoteIPC {
    readonly config = new GlobalConfig();
    private etatDemarrage: EtatDemarrage = { phase: "starting" };
    private etatMiseAJour: unknown = { state: "idle" };
    private canaux = new Map<string, Gestionnaire>();
    /** Les captchas en attente : la page de captcha répond par son identifiant. */
    private captchas = new Map<string, (jeton: string | null) => void>();

    constructor () {
        this.enregistrer();
        this.suivreMiseAJour();
    }

    etat (etat: EtatDemarrage) {
        this.etatDemarrage = etat;
        annoncer("startup:state", etat);
    }

    /** Appelé par la page de captcha (`assets/account/captcha.html`, adaptée). */
    resoudreCaptcha (id: string, jeton: string | null) {
        const attente = this.captchas.get(id);
        if (!attente) return false;
        this.captchas.delete(id);
        attente(jeton);
        return true;
    }

    async appeler (canal: string, args: unknown[]): Promise<{ ok: true; valeur: unknown } | { ok: false; erreur: string }> {
        const gestionnaire = this.canaux.get(canal);
        if (!gestionnaire) return { ok: false, erreur: `Canal IPC inconnu : ${canal}` };
        try {
            const valeur = await (gestionnaire as (...a: unknown[]) => unknown)(...args);
            // Les définitions de réglages sont gelées : un aller-retour JSON les détache.
            return { ok: true, valeur: valeur === undefined ? null : JSON.parse(JSON.stringify(valeur ?? null)) };
        } catch (error) {
            return { ok: false, erreur: error instanceof Error ? error.message : String(error) };
        }
    }

    private sur (canal: string, gestionnaire: Gestionnaire) {
        this.canaux.set(canal, gestionnaire);
    }

    private suivreMiseAJour () {
        autoUpdater.on("checking-for-update", () => this.publierMiseAJour({ state: "checking" }));
        autoUpdater.on("update-available", (info: { version: string }) =>
            this.publierMiseAJour({ state: "available", version: info.version }),
        );
        autoUpdater.on("update-not-available", () => this.publierMiseAJour({ state: "up-to-date" }));
        autoUpdater.on("error", (error: Error) =>
            this.publierMiseAJour({ state: "error", message: error?.message ?? "Erreur inconnue." }),
        );
    }

    private publierMiseAJour (etat: unknown) {
        this.etatMiseAJour = etat;
        annoncer(IPCEvent.UpdateState, etat);
    }

    private enregistrer () {
        // ── Fenêtres : il n'y en a qu'une sur un téléphone ───────────────────────────
        for (const canal of [IPCEvent.Minimize, IPCEvent.Maximize, IPCEvent.Focus, IPCEvent.FlashFrame]) {
            this.sur(canal, () => undefined);
        }
        this.sur(IPCEvent.Close, () => annoncer("ecran:fermer", null));
        this.sur(IPCEvent.RequestCloseWindow, () => annoncer("ecran:fermer", null));

        // ── Écran de démarrage ──────────────────────────────────────────────────────
        this.sur("startup:get-state", () => this.etatDemarrage);
        this.sur("startup:retry", () => annoncer("ecran:relancer", null));
        this.sur("startup:quit", () => annoncer("ecran:quitter", null));
        this.sur("startup:animation-finished", () => annoncer("ecran:animation-finie", null));
        this.sur("startup:reveal", () => annoncer("ecran:client", null));

        // ── Renseignements synchrones ───────────────────────────────────────────────
        this.sur(IPCEvent.GetVersion, () => process.env.VOIDCORD_VERSION ?? "0.0.0");
        this.sur(IPCEvent.GetName, () => Constants.AppName);
        this.sur(IPCEvent.GetDefaultUserPatch, () => Constants.UserDefaultPatch);
        this.sur(IPCEvent.GetSupportInvite, () => Constants.SupportInvite);
        this.sur(IPCEvent.GetLangue, () => this.config.config.langue);
        this.sur(IPCEvent.GetIsUserToken, (jeton: string) => UserAuth.isUserToken(jeton ?? ""));
        this.sur(IPCEvent.GetAccountTokens, () =>
            UserAuth.accounts.filter(a => a.id).map(a => ({ id: a.id as string, token: a.token })),
        );
        this.sur(IPCEvent.GetBotAccountIds, () =>
            UserAuth.accounts.filter(a => a.bot && a.id).map(a => a.id as string),
        );
        /* La détection de jeux lit les processus de Windows : un téléphone n'en a pas. */
        this.sur(IPCEvent.GetRunningGames, () => []);
        this.sur(
            IPCEvent.GetExperiment,
            (type: string, botId: string, allData: Record<string, string>[]) => {
                if (type === "user") return UserExperiment(allData, botId);
                if (type === "guild") return GuildExperiment();
                if (type === "apex") return ApexExperiment(botId);
                return null;
            },
        );

        // ── Le bot derrière un jeton ────────────────────────────────────────────────
        this.sur(IPCEvent.GetBotInfo, (jeton: unknown) => this.infosBot(jeton));

        // ── Comptes ────────────────────────────────────────────────────────────────
        this.sur(IPCEvent.OpenAccountLoginWindow, () => {
            annoncer("ecran:comptes", null);
            return true;
        });
        this.sur(IPCEvent.AccountLogin, (demande: { login: string; password: string; captcha?: { key: string; rqtoken: string | null } | null }) =>
            UserAuth.login({
                login: demande.login,
                password: demande.password,
                captchaKey: demande.captcha?.key ?? null,
                captchaRqtoken: demande.captcha?.rqtoken ?? null,
            }),
        );
        this.sur(IPCEvent.AccountTokenLogin, (jeton: string) => UserAuth.loginWithToken(jeton));
        this.sur(IPCEvent.AccountMfa, (demande: { ticket: string; code: string; method: "totp" | "sms" | "backup" }) =>
            UserAuth.mfa(demande),
        );
        this.sur(IPCEvent.AccountSendSms, (ticket: string) => UserAuth.sendSms(ticket));
        this.sur(IPCEvent.AccountSolveCaptcha, (demande: { sitekey: string; rqdata: string | null }) =>
            this.resoudreUnCaptcha(demande.sitekey, demande.rqdata ?? null),
        );
        this.sur(IPCEvent.AccountList, () => UserAuth.accounts);
        this.sur(IPCEvent.AccountRemove, (jeton: string) => {
            UserAuth.remove(jeton);
            return UserAuth.accounts;
        });
        /*
         * Choisir un compte veut dire recharger le client avec son jeton. L'injection
         * dans `localStorage` se fait dans la page elle-même — c'est là qu'est le stockage
         * — et le calque du navigateur s'en charge dès que ce canal répond vrai.
         */
        this.sur(IPCEvent.AccountUse, () => true);
        this.sur(IPCEvent.AccountOpenWindow, () => true);
        this.sur(IPCEvent.RememberBot, async (jeton: string) => {
            if (typeof jeton !== "string" || !jeton) return;
            await UserAuth.storeBot(jeton);
        });

        // ── Réglages ───────────────────────────────────────────────────────────────
        this.sur(IPCEvent.GetSettings, () => this.reglages());
        this.sur("settings:get", () => this.reglages());
        this.sur(IPCEvent.SaveSettings, (valeur: unknown) => this.config.save(valeur));
        this.sur("settings:save", (valeur: unknown) => this.config.save(valeur));
        this.sur(IPCEvent.OpenSettings, () => {
            annoncer("ecran:reglages", null);
            return true;
        });
        this.sur("langue:choisir", (langue: "fr" | "en") => {
            this.config.save({ ...this.config.config, langue });
            annoncer("ecran:client", null);
            return true;
        });

        // ── Mises à jour ───────────────────────────────────────────────────────────
        this.sur(IPCEvent.UpdateCheck, () => autoUpdater.checkForUpdates());
        this.sur(IPCEvent.UpdateGetState, () => this.etatMiseAJour);
        this.sur(IPCEvent.UpdateInstall, () => {
            annoncer("ecran:installer-mise-a-jour", null);
            return true;
        });

        // ── Éditeur de message ─────────────────────────────────────────────────────
        this.sur(IPCEvent.RequestOpenMessageEditorWindow, () => {
            annoncer("ecran:editeur", null);
            return true;
        });
        this.sur(IPCEvent.MessageEditorClose, () => annoncer("ecran:fermer", null));
        this.sur(IPCEvent.MessageEditorReactReady, () => undefined);

        // ── Invitation d'entraide ──────────────────────────────────────────────────
        this.sur(IPCEvent.OpenInvite, (code: string) => annoncer(IPCEvent.OpenInvite, code));
    }

    /**
     * Les réglages tels que la page les attend : l'instantané, plus les définitions
     * traduites. Le double passage par JSON est repris du bureau — les définitions sont
     * gelées, et les recopier telles quelles donnait une page sans aucun bouton.
     */
    private reglages () {
        const langue = this.config.config.langue;
        return JSON.parse(
            JSON.stringify({
                ...this.config.snapshot(),
                definitions: settingsDefinitions.map(definition => {
                    const traduit = localizedSetting(definition, langue);
                    return {
                        ...definition,
                        displayName: traduit.displayName,
                        description: traduit.description,
                        options:
                            "options" in definition
                                ? definition.options.map(option => ({
                                    value: option.value,
                                    label: traduit.optionLabel(option.value, option.label),
                                }))
                                : undefined,
                    };
                }),
            }),
        );
    }

    /** La page de captcha est ouverte par l'application ; sa réponse revient par son id. */
    private resoudreUnCaptcha (sitekey: string, rqdata: string | null) {
        const id = `captcha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return new Promise<string | null>(resolve => {
            this.captchas.set(id, resolve);
            annoncer("ecran:captcha", { id, sitekey, rqdata });
            // Sans réponse au bout de cinq minutes, la connexion repart sans captcha.
            setTimeout(() => {
                if (this.captchas.delete(id)) resolve(null);
            }, 5 * 60 * 1000).unref?.();
        });
    }

    /**
     * Les renseignements d'un bot, repris de `IPCManager` : les intents que l'application
     * n'a pas le droit de demander sont retirés, et le nombre de shards est calculé.
     */
    private async infosBot (jetonBrut: unknown) {
        if (typeof jetonBrut !== "string" || jetonBrut.length > 512) throw new Error("Jeton de bot invalide.");
        const jeton = jetonBrut.trim().replace(/^Bot\s+/i, "").trim();
        try {
            const reponse = await fetch("https://canary.discord.com/api/v9/applications/@me?with_counts=true", {
                headers: { Authorization: `Bot ${jeton}`, "User-Agent": Constants.UserAgentDiscordBot },
            });
            if (!reponse.ok) throw new Error(reponse.statusText || `HTTP ${reponse.status}`);
            const data = (await reponse.json()) as APIApplication & { bot_approximate_guild_count?: number };
            const drapeaux = new ApplicationFlagsBitField(data.flags);
            const aEcarter = new Set<GatewayIntentBits>([
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
            ]);
            if (drapeaux.has(ApplicationFlags.GatewayPresence) || drapeaux.has(ApplicationFlags.GatewayPresenceLimited)) {
                aEcarter.delete(GatewayIntentBits.GuildPresences);
            }
            if (
                drapeaux.has(ApplicationFlags.GatewayGuildMembers) ||
                drapeaux.has(ApplicationFlags.GatewayGuildMembersLimited)
            ) {
                aEcarter.delete(GatewayIntentBits.GuildMembers);
            }
            if (
                drapeaux.has(ApplicationFlags.GatewayMessageContent) ||
                drapeaux.has(ApplicationFlags.GatewayMessageContentLimited)
            ) {
                aEcarter.delete(GatewayIntentBits.MessageContent);
            }
            /*
             * Sur l'ordinateur, l'intent MessageContent manquant ouvre une boîte de
             * dialogue. Ici le message part vers la page, qui l'affiche à sa façon.
             */
            if (aEcarter.has(GatewayIntentBits.MessageContent) && !this.config.config.suppress_intent_warning) {
                annoncer("ecran:avertissement", {
                    titre: "L’intent MessageContent est requis",
                    corps: "Active l’intent MessageContent dans les réglages de ton application, sur le portail Discord. Pour ne plus voir cet avertissement, change le réglage correspondant dans les paramètres de Voidcord.",
                });
                throw new Error("L’intent MessageContent est requis.");
            }
            cacheValidatedBotToken(data.bot?.id ?? data.id, jeton);
            return {
                success: true,
                data,
                intents: IntentsBitField.getIntents(...Array.from(aEcarter)),
                allShards:
                    Math.ceil(
                        (data.bot_approximate_guild_count ?? data.approximate_guild_count ?? 0) /
                            Number(this.config.config.guilds_per_shard),
                    ) || 1,
            };
        } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : String(error) };
        }
    }
}
