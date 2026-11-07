/* Copyright Elysia © 2025. All rights reserved */

import { contextBridge, ipcRenderer } from "electron";

// Préchargement en bac à sable : rien d'autre qu'Electron n'est disponible ici.
contextBridge.exposeInMainWorld("langueAPI", {
    choisir: (langue: "fr" | "en") => ipcRenderer.send("langue:choisir", langue),
});
