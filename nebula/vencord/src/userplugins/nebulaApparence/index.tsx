/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addProfileBadge, BadgePosition, type ProfileBadge, removeProfileBadge } from "@api/Badges";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, UserStore } from "@webpack/common";
import { t } from "../botClient/langue";

const logger = new Logger("NebulaApparence", "#f5bde6");

/** Discord serves every badge picture from the same place */
const badgeIcon = (hash: string) => `https://cdn.discordapp.com/badge-icons/${hash}.png`;

/**
 * The badges that can be switched on. The names are Discord's own, the pictures are
 * the ones Discord serves, and nothing here is sent anywhere: a badge added from this
 * list is drawn on this computer only.
 */
const CATALOGUE = [
    { key: "nebula", label: "Creator Nebula", icon: "nebulacreator00000000000000000000" },
    { key: "staff", label: "Discord Staff", icon: "5e74e9b61934fc1f67c65515d1f7e60d" },
    { key: "partner", label: t("Partenaire", "Partner"), icon: "3f9748e53446a137a052f3454e2de41e" },
    { key: "moderator", label: "Moderator Programs Alumni", icon: "fee1624003e2fee35cb398e125dc479b" },
    { key: "hypesquadEvents", label: "HypeSquad Events", icon: "bf01d1073931f921909045f3a39fd264" },
    { key: "bravery", label: "HypeSquad Bravery", icon: "8a88d63823d8a71cd5e390baa45efa02" },
    { key: "brilliance", label: "HypeSquad Brilliance", icon: "011940fd013da3f7fb926e4a1cd2e618" },
    { key: "balance", label: "HypeSquad Balance", icon: "3aa41de486fa12454c3761e8e223442e" },
    { key: "bugHunter", label: "Bug Hunter", icon: "2717692c7dca7289b35297368a940dd0" },
    { key: "bugHunterGold", label: t("Bug Hunter (or)", "Bug Hunter (gold)"), icon: "848f79194d4be5ff5f81505cbd0ce1e6" },
    { key: "activeDeveloper", label: t("Développeur actif", "Active Developer"), icon: "6bdc42827a38498929a4920da12695d9" },
    { key: "verifiedDeveloper", label: t("Développeur de bot vérifié", "Early Verified Bot Developer"), icon: "6df5892e0f35b051f8b61eace34f4967" },
    { key: "earlySupporter", label: t("Soutien de la première heure", "Early Supporter"), icon: "7060786766c9c840eb3019e725d2b358" },
    { key: "nitro", label: t("Abonné Nitro", "Nitro subscriber"), icon: "2ba85e8026a8614b640c2837bcdfe21b" },
    { key: "booster", label: t("Booster de serveur", "Server Booster"), icon: "ec92202290b48d0879b7413d2dde3bab" },
    { key: "quest", label: t("Quête accomplie", "Quest completed"), icon: "7d9ae358c8c5e118768335dbe68b4fb8" },
] as const;

const settings = definePluginSettings({
    displayName: {
        type: OptionType.STRING,
        description: t("Nom affiché, la ligne du haut. Laisse vide pour garder le vrai.", "Display name, the top line. Leave empty to keep the real one."),
        default: "",
        onChange: () => applyNames(),
    },
    username: {
        type: OptionType.STRING,
        description: t("Pseudo, la ligne du bas. Laisse vide pour garder le vrai.", "Username, the bottom line. Leave empty to keep the real one."),
        default: "",
        onChange: () => applyNames(),
    },
    ...Object.fromEntries(
        CATALOGUE.map(badge => [
            badge.key,
            {
                type: OptionType.BOOLEAN,
                description: badge.label,
                default: false,
                onChange: () => applyBadges(),
            },
        ]),
    ),
});

/** The badges currently drawn, kept so they can be taken back off */
const shown = new Map<string, ProfileBadge>();

/** The names Discord gave us, so the real ones can come back */
let realNames: { globalName: string | null; username: string; } | null = null;

function applyBadges() {
    const currentUserId = () => UserStore.getCurrentUser()?.id;

    for (const badge of CATALOGUE) {
        const wanted = Boolean((settings.store as any)[badge.key]);
        const already = shown.get(badge.key);

        if (wanted && !already) {
            const entry: ProfileBadge = {
                id: `nebula_${badge.key}`,
                description: badge.label,
                iconSrc: badgeIcon(badge.icon),
                position: BadgePosition.START,
                // These are decoration, so they are drawn on this account and nowhere else
                shouldShow: ({ userId }) => userId === currentUserId(),
            } as ProfileBadge;
            addProfileBadge(entry);
            shown.set(badge.key, entry);
        } else if (!wanted && already) {
            removeProfileBadge(already);
            shown.delete(badge.key);
        }
    }
}

function applyNames() {
    const user = UserStore.getCurrentUser() as any;
    if (!user) return;

    realNames ??= { globalName: user.globalName ?? null, username: user.username };

    const wantedDisplay = settings.store.displayName?.trim();
    const wantedUsername = settings.store.username?.trim();
    user.globalName = wantedDisplay ? wantedDisplay : realNames.globalName;
    user.username = wantedUsername ? wantedUsername : realNames.username;

    // Nothing re-reads the user on its own, so the client is told to redraw
    try {
        FluxDispatcher.dispatch({ type: "CURRENT_USER_UPDATE", user });
    } catch (error) {
        logger.warn("Impossible de rafraîchir les noms", error);
    }
}

export default definePlugin({
    name: "NebulaApparence",
    description: t(
        "Change ton nom affiché, ton pseudo et les badges de ton profil. Purement visuel : rien n'est envoyé à Discord et personne d'autre ne le voit.",
        "Change your display name, your username and your profile badges. Purely cosmetic: nothing is sent to Discord and nobody else sees it.",
    ),
    authors: [
        {
            name: "Nebula",
        },
    ],
    settings,

    start() {
        applyBadges();
        applyNames();
        // A sign-in replaces the user object, so the names have to be put back on
        FluxDispatcher.subscribe("CONNECTION_OPEN", this.onConnectionOpen);
    },

    stop() {
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", this.onConnectionOpen);
        for (const badge of shown.values()) removeProfileBadge(badge);
        shown.clear();

        const user = UserStore.getCurrentUser() as any;
        if (user && realNames) {
            user.globalName = realNames.globalName;
            user.username = realNames.username;
        }
        realNames = null;
    },

    onConnectionOpen() {
        // A new account brings new real names to remember before overriding them
        realNames = null;
        applyNames();
    },
});
