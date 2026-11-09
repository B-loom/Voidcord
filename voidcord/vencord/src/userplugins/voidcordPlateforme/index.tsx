/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { t } from "../botClient/langue";

const logger = new Logger("VoidcordPlateforme", "#f5bde6");

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
        description: t("Ce que les autres voient à côté de ton nom", "What the others see next to your name"),
        restartNeeded: true,
        options: [
            { label: t("Ne rien changer", "Leave as is"), value: "auto", default: true },
            { label: t("Ordinateur", "Desktop"), value: "ordinateur" },
            { label: t("Navigateur web", "Web browser"), value: "navigateur" },
            { label: t("Téléphone Android", "Android phone"), value: "android" },
            { label: "iPhone", value: "iphone" },
            { label: t("Console ou casque VR", "Console or VR headset"), value: "console" },
        ],
    },
});

export default definePlugin({
    name: "VoidcordPlateforme",
    description: t(
        "Choisis l'appareil depuis lequel tu as l'air de te connecter : ordinateur, navigateur, téléphone, console ou casque VR. Change seulement la pastille vue par les autres.",
        "Choose the device you appear to be connecting from: desktop, browser, phone, console or VR headset. Only changes the dot the others see.",
    ),
    authors: [
        {
            name: "Voidcord",
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
