/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * La langue de Voidcord, choisie au premier lancement et gardée dans les réglages.
 *
 * Elle ne concerne que les textes de Voidcord : Discord garde la sienne, réglée dans ses
 * propres paramètres. Le processus principal répond de façon synchrone, parce que des
 * écrans s'affichent avant que quoi que ce soit d'asynchrone ait pu aboutir.
 *
 * Plutôt qu'un dictionnaire de clés, les deux versions d'un texte sont écrites côte à
 * côte : `t("Partager", "Share")`. Une traduction oubliée se voit à la lecture, et rien
 * ne peut renvoyer une clé brute à l'écran.
 */

export type Langue = "fr" | "en";

let retenue: Langue | undefined;

export function langue (): Langue {
    if (retenue) return retenue;
    try {
        const valeur = (window as any).BotClientNative?.langue?.();
        retenue = valeur === "en" ? "en" : "fr";
    } catch {
        retenue = "fr";
    }
    return retenue;
}

export function enAnglais () {
    return langue() === "en";
}

/** Le texte dans la langue choisie : français d'abord, anglais ensuite. */
export function t (fr: string, en: string): string {
    return enAnglais() ? en : fr;
}
