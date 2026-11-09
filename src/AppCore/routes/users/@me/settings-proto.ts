/* Copyright Elysia © 2025. All rights reserved */

import { FrecencyUserSettings, PreloadedUserSettings } from "discord-protos";
import { IpcMainEvent } from "electron";
import { Request, Response, Router } from "express";
import { IPCEvent } from "src/AppCore/IPCEvents";
import { isTrustedClientFrame } from "src/AppCore/IPCManager";
import UserAuth from "src/AppCore/UserAuth";
import Util from "src/AppUtils/Utils";
import { validateBotToken } from "src/AppUtils/ValidateBotToken";

/**
 * Settings and favourites are stored by each client window, in a database of its own:
 * Voidcord opens one window per account, and each one only holds what belongs to it.
 * Asking the main window for another account's settings therefore answers with the wrong
 * ones — a bot inheriting the status of the account signed in elsewhere, or favourites
 * that come back empty. The window that owns the account is asked instead.
 */
function windowFor (accountId: string) {
    // Le serveur tourne aussi sans client — dans les tests, par exemple
    const client = globalThis.botClient;
    const owner = client?.accountWindows?.get(accountId);
    if (owner && !owner.isDestroyed()) return owner.webContents;
    return client?.discordWebContents;
}

const app = Router({ mergeParams: true });

/*
 * Un bot n'a pas de réglages chez Discord : Voidcord les lui garde dans sa propre base,
 * et c'est ce que servent les deux routes ci-dessous.
 *
 * Un compte utilisateur, lui, a les siens chez Discord — ses favoris de GIF,
 * d'autocollants et d'émojis y compris. Leur répondre depuis la base locale revenait à
 * les remplacer par du vide : les favoris n'apparaissaient jamais. Pour ces comptes, la
 * demande repart donc chez Discord.
 */
app.use((req, res, next) => {
    if (!UserAuth.isUserToken(req.headers.authorization ?? "")) return next();
    req.url = `/api/v9/users/@me/settings-proto${req.url === "/" ? "" : req.url}`;
    return Util.proxy(req, res);
});

app.use(validateBotToken);

/**
 * Wait for an IPC event matching a specific uid (correlation ID).
 * This avoids race conditions when multiple requests arrive simultaneously
 * by filtering on the uid so each request only gets its own response.
 */
function waitForSettingsEvent (
    emitter: NodeJS.EventEmitter,
    eventName: string,
    uid: string,
    timeoutMs = 15000,
): Promise<[IpcMainEvent, string, string]> {
    return new Promise((resolve, reject) => {
        const onEvent = (event: IpcMainEvent, botId: string, settings: string) => {
            /*
             * Voidcord ouvre une fenêtre de client par compte : s’en tenir à la fenêtre
             * principale laisserait les autres sans réponse, donc sans favoris ni
             * réglages, et sans la moindre erreur visible.
             */
            if (botId !== uid || !isTrustedClientFrame(event, globalThis.botClient)) return;
            clearTimeout(timer);
            emitter.removeListener(eventName, onEvent);
            resolve([event, botId, settings]);
        };

        const timer = setTimeout(() => {
            emitter.removeListener(eventName, onEvent);
            reject(new Error(`Timeout waiting for "${eventName}" (uid=${uid}) after ${timeoutMs}ms`));
        }, timeoutMs);

        emitter.on(eventName, onEvent);
    });
}

app.all("/1", async (req, res) => {
    const uid = res.locals.authenticatedBotId as string;
    try {
        const promise = waitForSettingsEvent(
            globalThis.botClient.ipcMain,
            IPCEvent.GetPreloadedUserSettingsResponse,
            uid,
        );
        // Request user settings from database
        windowFor(uid).send(IPCEvent.GetPreloadedUserSettings, uid);
        // [event, botId, settings]
        const userSettingEvent = await promise;
        const userSettings = await PreloadedUserSettings.fromBase64(userSettingEvent[2]);
        if (req.method.toUpperCase() === "GET") {
            return res.send({
                settings: userSettingEvent[2],
            });
        }
        const callback = async (
            reqC: Request<
                unknown,
                unknown,
                {
                    required_data_version: number;
                    settings: string;
                }
            >,
            resC: Response,
        ) => {
            /**
             * @type {PreloadedUserSettings}
             */
            const decoded = PreloadedUserSettings.fromBase64(reqC.body?.settings || "");
            for (const key of Object.keys(decoded)) {
                // eslint-disable-next-line
                (userSettings as any)[key] = (decoded as any)[key];
            }
            const base64 = PreloadedUserSettings.toBase64(userSettings);
            windowFor(uid).send(IPCEvent.SetPreloadedUserSettings, uid, base64);
            return resC.send({
                settings: base64,
            });
        };
        return Util.getDataFromRequest(req, res, callback);
    } catch (err) {
        console.error("Error in settings-proto /1:", err);
        if (!res.headersSent) {
            return res.status(500).send({ settings: "" });
        }
    }
});

app.all("/2", async (req, res) => {
    const uid = res.locals.authenticatedBotId as string;
    try {
        const promise = waitForSettingsEvent(
            globalThis.botClient.ipcMain,
            IPCEvent.GetFrecencyUserSettingsResponse,
            uid,
        );
        // Request user settings from database
        windowFor(uid).send(IPCEvent.GetFrecencyUserSettings, uid);
        // [event, botId, settings]
        const userSettingEvent = await promise;
        const userSettings = await FrecencyUserSettings.fromBase64(userSettingEvent[2]);
        if (req.method.toUpperCase() === "GET") {
            return res.send({
                settings: userSettingEvent[2],
            });
        }
        const callback = async (
            reqC: Request<
                unknown,
                unknown,
                {
                    settings: string;
                }
            >,
            resC: Response,
        ) => {
            /**
             * @type {FrecencyUserSettings}
             */
            const decoded = FrecencyUserSettings.fromBase64(reqC.body?.settings || "");
            for (const key of Object.keys(decoded)) {
                // eslint-disable-next-line
                (userSettings as any)[key] = (decoded as any)[key];
            }
            const base64 = FrecencyUserSettings.toBase64(userSettings);
            windowFor(uid).send(IPCEvent.SetFrecencyUserSettings, uid, base64);
            return resC.send({
                settings: base64,
            });
        };
        return Util.getDataFromRequest(req, res, callback);
    } catch (err) {
        console.error("Error in settings-proto /2:", err);
        if (!res.headersSent) {
            return res.status(500).send({ settings: "" });
        }
    }
});

export default app;
