/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { findByPropsLazy } from "@webpack";

import { reconnaitreLeCompteAuDemarrage } from "../utils/patches";
import { watchUpdateProgress } from "./UpdateProgress";

const logger = new Logger("VoidcordDebut", "#f5bde6");

/** La connexion par jeton de Discord, celle qu'utilise déjà le formulaire de token */
const TokenLogin = findByPropsLazy("loginToken");

/*
 * Ce qui ne peut pas attendre le démarrage du plugin.
 *
 * Le plugin ne démarre qu'une fois connecté. Or l'écran de choix des comptes vient
 * avant, et c'est justement là que Discord propose une clé d'accès et qu'une mise à
 * jour peut se télécharger. Ces deux-là s'installent donc au chargement.
 */

/**
 * Discord propose les clés d'accès en appelant `navigator.credentials.get`, ce qui ouvre
 * la fenêtre « Sécurité Windows » par-dessus le client. Ici elle ne mène nulle part : le
 * serveur local refuse déjà la route WebAuthn, et il ne reste qu'à l'annuler à la main.
 * Autant ne jamais l'ouvrir.
 */
function blockPasskeyPrompt() {
    const creds = navigator.credentials as any;
    if (!creds?.get || creds.__voidcordBloque) return;

    const original = creds.get.bind(creds);
    creds.get = (options: any) => {
        if (options?.publicKey) {
            logger.info("Demande de clé d'accès refusée : WebAuthn n'est pas servi ici");
            return Promise.reject(new DOMException("WebAuthn indisponible dans Voidcord", "NotAllowedError"));
        }
        return original(options);
    };
    creds.__voidcordBloque = true;
}

/*
 * Le sélecteur de comptes de l'écran de connexion est rendu par un bundle que Discord
 * charge avant Vencord : les correctifs webpack ne l'atteignent pas. On intercepte donc
 * le clic lui-même.
 *
 * Quand Discord n'a pas le jeton d'un compte — et il n'a jamais ceux de Voidcord, qui les
 * garde ailleurs — son bouton renvoie au formulaire de connexion. Pour un compte que
 * Voidcord connaît, on prend la main : le jeton enregistré est injecté et la fenêtre
 * rechargée. Un rechargement complet est le seul moyen que la session reparte propre,
 * sans traîner le statut ni les messages du compte précédent.
 */
function native() {
    return (window as any).BotClientNative;
}

/** Remonte la fibre React jusqu'à la ligne de compte, qui porte l'utilisateur */
function compteDeLaLigne(depart: HTMLElement): { id: string; } | null {
    const cle = Object.keys(depart).find(k => k.startsWith("__reactFiber$"));
    let fibre: any = cle ? (depart as any)[cle] : null;

    for (let i = 0; i < 14 && fibre; i++) {
        const props = fibre.memoizedProps;
        // La ligne du sélecteur : un utilisateur, et le libellé de son bouton
        if (props?.user?.id && (props.actionText != null || props.onAction != null)) return props.user;
        fibre = fibre.return;
    }
    return null;
}

/*
 * Discord garde ses réglages en cache dans le stockage de la page, pas par compte. En
 * changeant de compte, le suivant héritait donc du statut personnalisé du précédent —
 * un bot affichant le statut de son propriétaire. Le cache part avec l'ancien compte.
 */
function viderCacheDesReglages() {
    const cadre = document.createElement("iframe");
    try {
        document.body.append(cadre);
        const stockage = cadre.contentWindow?.localStorage;
        for (const cle of ["UserSettingsProtoStore-Cache", "NotifSettingsProtoStore-Cache"]) {
            stockage?.removeItem(cle);
        }
    } catch (error) {
        logger.warn("Impossible de vider le cache des réglages", error);
    } finally {
        cadre.remove();
    }
}

function interceptAccountSwitch() {
    document.addEventListener("click", event => {
        const bouton = (event.target as HTMLElement)?.closest?.("button");
        if (!bouton || !bouton.textContent?.trim()) return;

        const utilisateur = compteDeLaLigne(bouton);
        if (!utilisateur?.id) return;

        let jeton: string | undefined;
        try {
            const comptes = native()?.accountTokens?.();
            jeton = Array.isArray(comptes)
                ? comptes.find((c: any) => String(c?.id) === String(utilisateur.id))?.token
                : undefined;
        } catch {
            return;
        }
        if (!jeton) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        logger.info(`Reconnexion au compte ${utilisateur.id} avec le jeton enregistré`);

        /*
         * On passe par la connexion par jeton de Discord, la même que le formulaire où
         * l'on colle un token à la main. Écrire le jeton dans le stockage et recharger ne
         * suffit pas : la page de connexion le jette au démarrage suivant.
         */
        try {
            // Le formulaire fait de même avant de se connecter : un bot repart au shard 0
            try { sessionStorage.setItem("currentShard", "0"); } catch { /* sans importance */ }
            viderCacheDesReglages();
            TokenLogin.loginToken(jeton);
            return;
        } catch (error) {
            logger.warn("La connexion par jeton a échoué, passage par le processus principal", error);
        }

        try {
            native()?.accountUse?.(jeton);
        } catch (error) {
            logger.error("Reconnexion impossible", error);
        }
    }, true);
}

/*
 * « Application Discord détectée ». Discord l'affiche quand il se croit dans un
 * navigateur et qu'un lien vient de l'ouvrir : il propose alors de passer à
 * l'application de bureau, et remplace tout le client par cet écran.
 *
 * Un correctif webpack existe déjà pour l'enveloppe qui le rend, mais l'écran revient
 * malgré lui — le bundle de la page de connexion est chargé avant Vencord. Ici on agit
 * sur ce qui est affiché : le lien « Continuer dans le navigateur » est celui qui reste
 * dans Voidcord, et c'est le seul choix qui ait un sens puisque l'application de bureau,
 * c'est déjà celle-ci.
 */
function ecranApplicationDetectee (): HTMLElement | null {
    /*
     * On part du titre, pas de l'enveloppe : la classe « deeplink » habille aussi le
     * client entier quand tout va bien, et s'y fier ferait cliquer n'importe où. Le
     * titre, lui, n'existe que lorsque l'écran est affiché.
     */
    for (const titre of document.querySelectorAll<HTMLElement>("h1, h2, h3")) {
        if (!/discord\s+(app\s+detected|d[ée]tect[ée]e)/i.test(titre.textContent || "")) continue;
        return titre.closest<HTMLElement>('[class*="deeplink" i]') ?? titre.parentElement;
    }
    return null;
}

function continuerDansVoidcord (ecran: HTMLElement) {
    const controles = [...ecran.querySelectorAll<HTMLElement>("button, a")].filter(
        controle => !(controle as HTMLAnchorElement).href?.startsWith("discord:"),
    );
    const continuer = controles.at(-1);
    if (!continuer) {
        logger.warn("Écran « Application Discord détectée » : aucun bouton pour continuer");
        return false;
    }
    logger.info(`Écran « Application Discord détectée » écarté par « ${continuer.textContent?.trim()} »`);
    continuer.click();
    return true;
}

function ecarterApplicationDetectee () {
    const essayer = () => {
        const ecran = ecranApplicationDetectee();
        if (ecran) continuerDansVoidcord(ecran);
    };

    const demarrer = () => {
        essayer();
        new MutationObserver(essayer).observe(document.body, { childList: true, subtree: true });
    };

    if (document.body) demarrer();
    else document.addEventListener("DOMContentLoaded", demarrer, { once: true });
}

let installe = false;

export function installEarlyFixes() {
    if (installe) return;
    installe = true;

    try {
        blockPasskeyPrompt();
    } catch (error) {
        logger.warn("Impossible de bloquer la demande de clé d'accès", error);
    }

    try {
        ecarterApplicationDetectee();
    } catch (error) {
        logger.warn("Impossible de surveiller l'écran « Application Discord détectée »", error);
    }

    try {
        interceptAccountSwitch();
    } catch (error) {
        logger.warn("Impossible de surveiller le sélecteur de comptes", error);
    }

    /*
     * La barre de mise à jour se pose dans le corps du document, et la lecture du jeton
     * passe par une iframe : l'une comme l'autre ont besoin que le corps existe.
     */
    const demarrer = () => {
        try {
            reconnaitreLeCompteAuDemarrage();
        } catch (error) {
            logger.warn("Impossible de reconnaître le compte au démarrage", error);
        }
        try {
            watchUpdateProgress();
        } catch (error) {
            logger.warn("Impossible de suivre la mise à jour", error);
        }
    };

    if (document.body) demarrer();
    else document.addEventListener("DOMContentLoaded", demarrer, { once: true });
}
