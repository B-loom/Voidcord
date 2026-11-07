/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { t } from "../langue";

const logger = new Logger("NebulaBloque", "#f5bde6");

/**
 * Windows Discord opens on its own, which lead nowhere here. They are not routes, so the
 * address cannot be watched for them; they are recognised by the title they draw and
 * their contents replaced, the way the blocked pages are.
 */
const BLOCKED = [
    {
        title: "Envoyer un cadeau",
        paragraphs: () => [
            t(
                "Cette fenêtre offre un abonnement Nitro. Elle a besoin des rouages de paiement de Discord, qui n'existent que dans le client officiel.",
                "This window gifts a Nitro subscription. It needs the payment machinery of Discord, which only exists in the official client.",
            ),
            t("Passe par Discord pour offrir un abonnement.", "Use Discord itself to gift a subscription."),
        ],
    },
    /*
     * La boutique s'ouvre, mais dès qu'on veut payer la fenêtre reste à tourner : le
     * formulaire de carte est servi par les rouages de paiement de Discord, absents ici.
     * Autant le dire tout de suite plutôt que de laisser trois points clignoter.
     */
    {
        title: "Ajouter un mode de paiement",
        paragraphs: () => moyenDePaiement(),
    },
    {
        title: "Ajouter un moyen de paiement",
        paragraphs: () => moyenDePaiement(),
    },
    {
        title: "Valider l'achat",
        paragraphs: () => [
            t(
                "Cet achat passe par les rouages de paiement de Discord, qui n'existent que dans le client officiel.",
                "This purchase goes through the payment machinery of Discord, which only exists in the official client.",
            ),
            t("Passe par Discord pour acheter cet article.", "Use Discord itself to buy this item."),
        ],
    },
];

function moyenDePaiement () {
    return [
        t(
            "Cette fenêtre enregistre une carte ou un compte PayPal. Elle a besoin des rouages de paiement de Discord, qui n'existent que dans le client officiel.",
            "This window saves a card or a PayPal account. It needs the payment machinery of Discord, which only exists in the official client.",
        ),
        t(
            "Passe par Discord pour acheter ou gérer un moyen de paiement.",
            "Use Discord itself to buy or manage a payment method.",
        ),
    ];
}

const ART = "https://cdn.discordapp.com/emojis/1399479404706660373.gif";

function replace(modal: HTMLElement, paragraphs: string[]) {
    modal.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "nebula-blocked-modal";

    const art = document.createElement("img");
    art.src = ART;
    art.alt = "";
    art.className = "nebula-blocked-art";

    const title = document.createElement("h2");
    title.className = "nebula-blocked-title";
    title.textContent = t("Rien à voir par ici", "Nothing to see here");

    const body = document.createElement("div");
    body.className = "nebula-blocked-body";
    for (const text of paragraphs) {
        const line = document.createElement("p");
        line.textContent = text;
        body.append(line);
    }

    panel.append(art, title, body);
    modal.append(panel);
}

/*
 * Masquer l'encart de quête laissait sa boîte derrière lui, et la boîte garde sa hauteur :
 * une bande vide au-dessus de la barre de compte. Chercher un nom de classe précis
 * (« contentWrapper ») ne tient pas, Discord les renomme à chaque build. On remonte donc
 * jusqu'à l'élément posé directement dans la section des panneaux, et c'est celui-là
 * qu'on masque : la bande part avec son contenu.
 */
const QUEST_PARTS = '[class*="questProgress"], [class*="questAccepted"], [class*="questsPanel"], [class*="questPanel"], [class*="questBar"]';

/** Vrai pour la section qui contient la barre de compte en bas de la liste */
function isPanelsSection(element: HTMLElement | null) {
    return Boolean(element && /(^|\s)panels_/.test(String(element.className ?? "")));
}

function hideQuestPanel() {
    for (const node of document.querySelectorAll<HTMLElement>(QUEST_PARTS)) {
        let holder: HTMLElement = node;
        // Remonter tant que le parent n'est pas la section des panneaux
        while (holder.parentElement && !isPanelsSection(holder.parentElement)) {
            holder = holder.parentElement;
            if (holder === document.body) break;
        }
        // Sans section des panneaux au-dessus, on s'en tient à l'encart lui-même
        if (!isPanelsSection(holder.parentElement)) holder = node.parentElement ?? node;
        if (holder === document.body || holder.dataset.nebulaHidden) continue;
        holder.dataset.nebulaHidden = "1";
        holder.style.display = "none";
    }
}

/** Watches for one of those windows appearing and takes its place */
export function blockUnavailableModals() {
    const check = () => {
        hideQuestPanel();

        for (const entry of BLOCKED) {
            for (const heading of document.querySelectorAll<HTMLElement>("h1,h2")) {
                if (heading.textContent?.trim() !== entry.title) continue;

                // The window itself, rather than the heading inside it
                const modal = heading.closest<HTMLElement>('[class*="modal_"], [role="dialog"]');
                if (!modal || modal.dataset.nebulaBlocked) continue;

                modal.dataset.nebulaBlocked = "1";
                replace(modal, entry.paragraphs());
            }
        }
    };

    try {
        // Driven by the page rather than by a timer, so nothing runs while nothing opens
        new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
        check();
    } catch (error) {
        logger.warn("Impossible de surveiller les fenêtres bloquées", error);
    }
}
