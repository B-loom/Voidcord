/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Discord supprime `window.localStorage` au démarrage pour que personne ne lise le
 * jeton depuis la console. Tout ce que Nebula y écrivait partait donc dans le vide, et
 * se relisait comme absent : la qualité du partage, par exemple, retombait à chaque
 * fois sur sa valeur par défaut — 1080p à 30 images/s, quel que soit le choix fait.
 *
 * Un cadre vide de la même origine, lui, garde son stockage intact : c'est par là que
 * passent les quelques réglages que Nebula veut retrouver au lancement suivant.
 */

function avecStockage<T> (action: (stockage: Storage) => T): T | undefined {
    if (!document.body) return undefined;
    const cadre = document.createElement("iframe");
    cadre.style.display = "none";
    try {
        document.body.append(cadre);
        const stockage = cadre.contentWindow?.localStorage;
        return stockage ? action(stockage) : undefined;
    } catch {
        return undefined;
    } finally {
        cadre.remove();
    }
}

export function lireStockage (cle: string): string | undefined {
    return avecStockage(stockage => stockage.getItem(cle)) ?? undefined;
}

export function ecrireStockage (cle: string, valeur: string) {
    avecStockage(stockage => stockage.setItem(cle, valeur));
}

export function effacerStockage (cle: string) {
    avecStockage(stockage => stockage.removeItem(cle));
}
