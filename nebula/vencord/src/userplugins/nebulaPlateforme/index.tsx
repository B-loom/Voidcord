/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const logger = new Logger("NebulaPlateforme", "#f5bde6");

/*
 * La pastille « sur téléphone », « sur ordinateur » ou « sur console » que les autres
 * voient à côté de ton nom ne vient pas d'une option de compte : Discord la déduit de ce
 * que le client annonce en se connectant, dans les propriétés de l'IDENTIFY. Changer ces
 * deux champs suffit donc à changer la pastille.
 *
 * Rien n'est envoyé d'autre que ce que le client envoyait déjà : seule la valeur change.
 */
const PLATEFORMES: Record<string, { browser: string; os: string; } | null> = {
    auto: null,
    ordinateur: { browser: "Discord Client", os: "Windows" },
    navigateur: { browser: "Chrome", os: "Windows" },
    android: { browser: "Discord Android", os: "Android" },
    iphone: { browser: "Discord iOS", os: "iOS" },
    console: { browser: "Discord Embedded", os: "Windows" },
};

const settings = definePluginSettings({
    plateforme: {
        type: OptionType.SELECT,
        description: "Ce que les autres voient à côté de ton nom",
        restartNeeded: true,
        options: [
            { label: "Ne rien changer", value: "auto", default: true },
            { label: "Ordinateur", value: "ordinateur" },
            { label: "Navigateur web", value: "navigateur" },
            { label: "Téléphone Android", value: "android" },
            { label: "iPhone", value: "iphone" },
            { label: "Console ou casque VR", value: "console" },
        ],
    },
});

export default definePlugin({
    name: "NebulaPlateforme",
    description:
        "Choisis l'appareil depuis lequel tu as l'air de te connecter : ordinateur, navigateur, téléphone, console ou casque VR. Change seulement la pastille vue par les autres.",
    authors: [
        {
            name: "Nebula",
        },
    ],
    settings,

    patches: [
        {
            find: "window.GLOBAL_ENV.GATEWAY_ENDPOINT;",
            replacement: [
                {
                    // {token:l,capabilities:...,properties:o,presence:c,compress:...}
                    match: /(,properties:)(\i)(,presence:)/,
                    replace: "$1$self.plateformeProperties($2)$3",
                },
            ],
        },
    ],

    /** Appelé au moment de l'IDENTIFY, avec les propriétés que le client allait envoyer */
    plateformeProperties(properties: Record<string, unknown> | undefined) {
        const choix = settings.store.plateforme ?? "auto";
        const remplacement = PLATEFORMES[choix];
        if (!remplacement) return properties;

        const suivant = { ...(properties ?? {}), ...remplacement };
        logger.info(`Connexion annoncée comme « ${choix} » (browser: ${remplacement.browser})`);
        return suivant;
    },
});
