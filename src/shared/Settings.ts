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
        key: "langue",
        displayName: "Langue / Language",
        description: "La langue des textes de Voidcord. Discord garde la sienne, réglée dans ses propres paramètres.",
        type: "select",
        defaultValue: "fr",
        options: [
            { label: "Français", value: "fr" },
            { label: "English", value: "en" },
        ],
    },
    {
        key: "langue_choisie",
        displayName: "Langue déjà choisie",
        description: "Retient que l’écran de bienvenue a posé la question. Le remettre à faux le rouvre au prochain lancement.",
        type: "boolean",
        defaultValue: false,
        hidden: true,
    },
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
        description: "S'applique au prochain lancement de Voidcord.",
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
        description: "Préfère un DNS chiffré, en retombant sur celui du système. S'applique au prochain lancement de Voidcord.",
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
        description: "Suit les réglages de proxy du système. Le proxy doit laisser passer discord.com, sinon Voidcord n'atteint plus sa propre page locale. S'applique au prochain lancement.",
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
        description: "Ajoute des détails de profil simulés dans Voidcord. Les vrais profils ne changent pas.",
        type: "boolean",
        defaultValue: true,
    },
    {
        key: "auto_check_updates",
        displayName: "Chercher les mises à jour automatiquement",
        description: "Cherche une nouvelle version de Voidcord au démarrage. La recherche manuelle reste possible.",
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


/*
 * Les réglages sont écrits en français — la langue du projet — et traduits ici pour la
 * fenêtre de réglages quand l'anglais est choisi. Un réglage sans entrée garde son
 * texte français : mieux vaut un libellé dans l'autre langue qu'une clé brute.
 */
type Traduction = { displayName: string; description: string; options?: Record<string, string> };

const ENGLISH: Record<string, Traduction> = {
    langue: {
        displayName: "Langue / Language",
        description: "The language of Voidcord's own text. Discord keeps its own, set in its own settings.",
    },
    langue_choisie: {
        displayName: "Language already chosen",
        description: "Remembers that the welcome screen asked. Set it back to false to see it again at the next launch.",
    },
    settings_theme: {
        displayName: "Theme",
        description: "Affects this window only.",
        options: { system: "The system one", dark: "Dark", light: "Light" },
    },
    startup_animation: {
        displayName: "Startup animation",
        description: "Applies the next time Voidcord starts.",
        options: { modern: "Modern (default)", classic: "Discord's way" },
    },
    doh_provider: {
        displayName: "Encrypted DNS (DNS over HTTPS)",
        description: "Prefers an encrypted DNS, falling back to the system one. Applies the next time Voidcord starts.",
        options: {
            off: "Off (system DNS)",
            automatic: "Automatic",
            cloudflare: "Cloudflare",
            google: "Google",
            quad9: "Quad9",
        },
    },
    use_system_proxy: {
        displayName: "Use the system proxy",
        description: "Follows the system proxy settings. The proxy has to let discord.com through, otherwise Voidcord can no longer reach its own local page. Applies at the next launch.",
    },
    guilds_per_shard: {
        displayName: "Servers per shard",
        description: "How many servers to aim for per shard. Used to work out the number of shards at the next connection.",
    },
    suppress_intent_warning: {
        displayName: "Skip the MessageContent intent check",
        description: "Allows connecting even when the MessageContent intent is not enabled.",
    },
    generate_fake_profile: {
        displayName: "Fill in profiles locally",
        description: "Adds made-up profile details inside Voidcord. Real profiles do not change.",
    },
    auto_check_updates: {
        displayName: "Check for updates automatically",
        description: "Looks for a new version of Voidcord at startup. Checking by hand stays possible.",
    },
    cache_assets: {
        displayName: "Cache the assets",
        description: "Kept for compatibility; no effect for now.",
    },
};

/** Le réglage dans la langue demandée : libellé, explication et choix d'une liste. */
export function localizedSetting (definition: SettingDefinition, langue: string) {
    const english = langue === "en" ? ENGLISH[definition.key] : undefined;
    return {
        displayName: english?.displayName ?? definition.displayName,
        description: english?.description ?? definition.description,
        optionLabel: (value: string, fallback: string) => english?.options?.[value] ?? fallback,
    };
}

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
