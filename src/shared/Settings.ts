/* Copyright Elysia © 2025. All rights reserved */

interface SettingBase {
    key: string;
    displayName: string;
    description: string;
    hidden?: boolean;
    disabled?: boolean;
}

export type SettingDefinition = SettingBase &
    (
        | { type: "boolean"; defaultValue: boolean }
        | { type: "number"; defaultValue: number; min?: number; max?: number; integer?: boolean }
        | { type: "string"; defaultValue: string }
        | { type: "select"; defaultValue: string; options: readonly { label: string; value: string }[] }
    );

export const settingsDefinitions = [
    {
        key: "settings_theme",
        displayName: "Thème",
        description: "N'agit que sur cette fenêtre.",
        type: "select",
        defaultValue: "system",
        options: [
            { label: "Celui du système", value: "system" },
            { label: "Sombre", value: "dark" },
            { label: "Clair", value: "light" },
        ],
    },
    {
        key: "startup_animation",
        displayName: "Animation de démarrage",
        description: "S'applique au prochain lancement de Nebula.",
        type: "select",
        defaultValue: "modern",
        options: [
            { label: "Moderne (par défaut)", value: "modern" },
            { label: "À la manière de Discord", value: "classic" },
        ],
    },
    {
        key: "doh_provider",
        displayName: "DNS chiffré (DNS over HTTPS)",
        description: "Préfère un DNS chiffré, en retombant sur celui du système. S'applique au prochain lancement de Nebula.",
        type: "select",
        defaultValue: "cloudflare",
        options: [
            { label: "Désactivé (DNS du système)", value: "off" },
            { label: "Automatique", value: "automatic" },
            { label: "Cloudflare", value: "cloudflare" },
            { label: "Google", value: "google" },
            { label: "Quad9", value: "quad9" },
        ],
    },
    {
        key: "use_system_proxy",
        displayName: "Utiliser le proxy du système",
        description: "Suit les réglages de proxy du système. Le proxy doit laisser passer discord.com, sinon Nebula n'atteint plus sa propre page locale. S'applique au prochain lancement.",
        type: "boolean",
        defaultValue: false,
    },
    {
        key: "guilds_per_shard",
        displayName: "Serveurs par shard",
        description: "Nombre de serveurs visé par shard. Sert à calculer le nombre de shards à la prochaine connexion.",
        type: "number",
        defaultValue: 100,
        min: 1,
        max: Number.MAX_SAFE_INTEGER,
        integer: true,
    },
    {
        key: "suppress_intent_warning",
        displayName: "Ignorer la vérification de l’intent MessageContent",
        description: "Autorise la connexion même si l’intent MessageContent n’est pas activé.",
        type: "boolean",
        defaultValue: false,
    },
    {
        key: "generate_fake_profile",
        displayName: "Compléter les profils en local",
        description: "Ajoute des détails de profil simulés dans Nebula. Les vrais profils ne changent pas.",
        type: "boolean",
        defaultValue: true,
    },
    {
        key: "auto_check_updates",
        displayName: "Chercher les mises à jour automatiquement",
        description: "Cherche une nouvelle version de Nebula au démarrage. La recherche manuelle reste possible.",
        type: "boolean",
        defaultValue: true,
    },
    {
        key: "cache_assets",
        displayName: "Mettre les ressources en cache",
        description: "Conservé par compatibilité ; sans effet pour l’instant.",
        type: "boolean",
        defaultValue: false,
        hidden: true,
    },
] as const satisfies readonly SettingDefinition[];

type SettingValue<T extends SettingDefinition> = T extends { type: "boolean" }
    ? boolean
    : T extends { type: "number" }
      ? number
      : T extends { type: "select"; options: readonly { value: infer V }[] }
        ? V
        : string;

export type Settings = { [T in (typeof settingsDefinitions)[number] as T["key"]]: SettingValue<T> };

export const defaultSettings: Readonly<Settings> = Object.freeze(
    Object.fromEntries(settingsDefinitions.map(definition => [definition.key, definition.defaultValue])) as Settings,
);

export interface SettingsSnapshot {
    settings: Settings;
    warning?: string;
    readOnly: boolean;
}

export interface SettingsAPI {
    get(): Promise<SettingsSnapshot>;
    save(value: Settings): Promise<SettingsSnapshot>;
}

/** Shared by the form and IPC validation; never coerces input. */
export function validateSetting (definition: SettingDefinition, value: unknown): string | undefined {
    switch (definition.type) {
        case "boolean":
            return typeof value === "boolean" ? undefined : "Doit être vrai ou faux.";
        case "string":
            return typeof value === "string" ? undefined : "Doit être du texte.";
        case "select":
            return typeof value === "string" && definition.options.some(option => option.value === value)
                ? undefined
                : "Choisis l’une des options proposées.";
        case "number":
            if (typeof value !== "number" || !Number.isFinite(value)) return "Doit être un nombre fini.";
            if (definition.integer && !Number.isSafeInteger(value)) return "Doit être un nombre entier.";
            if (definition.min !== undefined && value < definition.min) return `Doit valoir au moins ${definition.min}.`;
            if (definition.max !== undefined && value > definition.max) return `Doit valoir au plus ${definition.max}.`;
            return undefined;
    }
}

function isPlainObject (value: unknown): value is Record<string, unknown> {
    return (
        !!value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
    );
}

/** Validate the full IPC payload without coercion or accepting extra properties. */
export function validateSettings (value: unknown): Settings {
    if (!isPlainObject(value)) throw new Error("Les réglages doivent être un objet simple.");
    const keys = Reflect.ownKeys(value);
    if (
        keys.length !== settingsDefinitions.length ||
        keys.some(key => typeof key !== "string" || !Object.hasOwn(defaultSettings, key))
    ) {
        throw new Error("Les réglages ne doivent contenir que les clés connues.");
    }
    return Object.fromEntries(
        settingsDefinitions.map(definition => {
            const fieldValue = value[definition.key];
            const error = validateSetting(definition, fieldValue);
            if (error) throw new Error(`${definition.key}: ${error}`);
            return [definition.key, fieldValue];
        }),
    ) as Settings;
}
