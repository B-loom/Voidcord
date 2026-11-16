/* Copyright Elysia © 2025. All rights reserved */

/*
 * Le journal, version Android.
 *
 * Sur l'ordinateur, `%APPDATA%\Voidcord\logs\main.log` est l'outil de diagnostic le plus
 * utile du projet. Ici le même journal est écrit dans le dossier privé de l'application,
 * et chaque ligne part aussi sur la sortie standard : nodejs-mobile la recopie dans
 * logcat, visible par `adb logcat -s NODEJS-MOBILE`.
 */

import fs from "fs";
import path from "path";

const dossier = path.join(process.env.VOIDCORD_USER_DATA ?? process.cwd(), "logs");
fs.mkdirSync(dossier, { recursive: true });
const fichier = path.join(dossier, "main.log");

/** Au-delà de deux mégaoctets le journal repart de zéro : la place est comptée. */
function rotation () {
    try {
        if (fs.statSync(fichier).size > 2 * 1024 * 1024) fs.rmSync(fichier);
    } catch {
        /* Pas encore de fichier. */
    }
}
rotation();

function ecrire (niveau: string, etiquette: string, args: unknown[]) {
    const texte = args
        .map(a => {
            if (typeof a === "string") return a;
            if (a instanceof Error) return `${a.message}\n${a.stack ?? ""}`;
            try {
                return JSON.stringify(a);
            } catch {
                return String(a);
            }
        })
        .join(" ");
    const ligne = `[${new Date().toISOString()}] [${niveau}] [${etiquette}] ${texte}`;
    if (niveau === "error") process.stderr.write(`${ligne}\n`);
    else process.stdout.write(`${ligne}\n`);
    try {
        fs.appendFileSync(fichier, `${ligne}\n`);
    } catch {
        /* Un journal qui ne s'écrit pas ne doit pas arrêter le serveur. */
    }
}

export type Journal = {
    log: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    verbose: (...args: unknown[]) => void;
    silly: (...args: unknown[]) => void;
};

export function scope (etiquette: string): Journal {
    return {
        log: (...a) => ecrire("info", etiquette, a),
        info: (...a) => ecrire("info", etiquette, a),
        warn: (...a) => ecrire("warn", etiquette, a),
        error: (...a) => ecrire("error", etiquette, a),
        debug: (...a) => ecrire("debug", etiquette, a),
        verbose: (...a) => ecrire("debug", etiquette, a),
        silly: (...a) => ecrire("debug", etiquette, a),
    };
}

const racine = scope("Voidcord");

export const errorHandler = {
    startCatching (options?: { onError?: (info: { error: Error }) => boolean }) {
        process.on("uncaughtException", error => {
            racine.error("uncaughtException", error);
            options?.onError?.({ error });
        });
        process.on("unhandledRejection", raison => racine.error("unhandledRejection", raison));
    },
    stopCatching () {},
};

export const eventLogger = { startLogging () {}, stopLogging () {} };
export const hooks: unknown[] = [];
export const transports = {
    file: { level: "info", resolvePathFn: () => fichier, maxSize: 2 * 1024 * 1024 },
    console: { level: "info" },
    ipc: { level: false },
};
export const functions = {};
export const variables = {};
export const levels = ["error", "warn", "info", "verbose", "debug", "silly"];

export default Object.assign(racine, {
    scope,
    errorHandler,
    eventLogger,
    hooks,
    transports,
    functions,
    variables,
    levels,
    initialize: () => {},
    create: (options: { logId?: string }) => scope(options.logId ?? "Voidcord"),
});
