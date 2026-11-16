/* Copyright Elysia © 2025. All rights reserved */

/*
 * Le chemin du serveur vers l'écran.
 *
 * Sur l'ordinateur, le processus principal pousse des évènements vers la fenêtre par
 * `webContents.send`. Ici il n'y a pas de fenêtre à qui parler : le serveur dépose ses
 * annonces sur ce bus, et `server.ts` les fait descendre vers la page par un flux
 * d'évènements (`EventSource`), que le calque du navigateur transforme en appels de
 * `ipcRenderer.on` comme avant.
 */

import { EventEmitter } from "events";

export type Annonce = { type: string; valeur: unknown };

export const bus = new EventEmitter();

/** Nombre d'écouteurs sans limite : la page se réabonne à chaque rechargement. */
bus.setMaxListeners(0);

export function annoncer (type: string, valeur: unknown) {
    bus.emit("annonce", { type, valeur } satisfies Annonce);
}
