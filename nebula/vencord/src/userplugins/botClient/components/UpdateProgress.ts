/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { t } from "../langue";

const logger = new Logger("NebulaMaj", "#f5bde6");

/*
 * La mise à jour se téléchargeait en silence : une barre existait, mais seulement dans
 * l'onglet Nebula, donc il fallait y penser et l'ouvrir. Elle s'affiche maintenant par
 * dessus le client, où qu'on soit, et dit quand c'est fini.
 *
 * Volontairement écrite en DOM brut plutôt qu'en React : elle doit pouvoir apparaître
 * même sur l'écran de connexion, avant que le client ne soit monté.
 */

type UpdateState = {
    state: "idle" | "checking" | "up-to-date" | "available" | "downloading" | "ready" | "error";
    version?: string;
    percent?: number;
    message?: string;
};

function native() {
    return (window as any).BotClientNative;
}

let hote: HTMLElement | null = null;
let effacement: ReturnType<typeof setTimeout> | null = null;

function construire() {
    if (hote && document.body.contains(hote)) return hote;

    hote = document.createElement("div");
    hote.className = "nebula-update";
    hote.innerHTML =
        '<div class="nebula-update-title"></div>' +
        '<div class="nebula-update-track"><div class="nebula-update-fill"></div></div>' +
        '<div class="nebula-update-note"></div>' +
        '<button type="button" class="nebula-update-action"></button>';

    document.body.append(hote);
    return hote;
}

function cacher() {
    if (!hote) return;
    hote.remove();
    hote = null;
}

function rendre(state: UpdateState) {
    if (effacement) {
        clearTimeout(effacement);
        effacement = null;
    }

    // Rien à montrer tant qu'il ne se passe rien
    if (state.state === "idle" || state.state === "checking" || state.state === "up-to-date") {
        return cacher();
    }

    const boite = construire();
    const titre = boite.querySelector<HTMLElement>(".nebula-update-title")!;
    const piste = boite.querySelector<HTMLElement>(".nebula-update-track")!;
    const remplissage = boite.querySelector<HTMLElement>(".nebula-update-fill")!;
    const note = boite.querySelector<HTMLElement>(".nebula-update-note")!;
    const action = boite.querySelector<HTMLButtonElement>(".nebula-update-action")!;

    const version = state.version ? ` v${state.version}` : "";
    boite.dataset.etat = state.state;
    piste.hidden = state.state !== "downloading";
    action.hidden = state.state !== "ready";

    switch (state.state) {
        case "available":
            titre.textContent = t(`Mise à jour${version} disponible`, `Update${version} available`);
            note.textContent = t("Téléchargement en cours…", "Downloading…");
            break;
        case "downloading": {
            const pourcent = Math.max(0, Math.min(100, Math.round(state.percent ?? 0)));
            titre.textContent = t(`Téléchargement de la mise à jour${version}`, `Downloading the update${version}`);
            remplissage.style.width = `${pourcent}%`;
            note.textContent = `${pourcent} %`;
            break;
        }
        case "ready":
            titre.textContent = t(`Mise à jour${version} prête`, `Update${version} ready`);
            note.textContent = t("Elle s'installera à la fermeture de Nebula.", "It will install when Nebula closes.");
            action.textContent = t("Redémarrer maintenant", "Restart now");
            action.onclick = () => native()?.installUpdate?.();
            break;
        case "error":
            titre.textContent = t("Mise à jour impossible", "Update failed");
            note.textContent = state.message || t("Réessaie plus tard.", "Try again later.");
            // Une erreur n'a pas à rester en travers de l'écran
            effacement = setTimeout(cacher, 15000);
            break;
    }
}

export function watchUpdateProgress() {
    try {
        const api = native();
        if (!api?.onUpdateState) return;

        api.onUpdateState((state: UpdateState) => rendre(state));

        // L'état d'avant notre arrivée : un téléchargement peut déjà être en route
        const actuel = api.getUpdateState?.();
        if (actuel) rendre(actuel);
    } catch (error) {
        logger.warn("Impossible de suivre la mise à jour", error);
    }
}
