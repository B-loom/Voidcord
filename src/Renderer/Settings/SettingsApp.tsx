/* Copyright Elysia © 2026. All rights reserved */

import {
    Button,
    FluentProvider,
    Input,
    MessageBar,
    MessageBarBody,
    Spinner,
    webDarkTheme,
    webLightTheme,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";

import { localizedSetting, type SettingDefinition, type Settings, settingsDefinitions } from "../../shared/Settings";
import { SettingsField } from "./SettingsField";
import { useSettings } from "./useSettings";

const definitions: readonly (SettingDefinition & { key: keyof Settings })[] = settingsDefinitions;

export function SettingsApp () {
    const state = useSettings();
    const [query, setQuery] = useState("");
    const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
    useEffect(() => {
        const media = matchMedia("(prefers-color-scheme: dark)");
        const change = () => setSystemDark(media.matches);
        media.addEventListener("change", change);
        change();
        return () => media.removeEventListener("change", change);
    }, []);
    const dark = state.draft.settings_theme === "dark" || (state.draft.settings_theme === "system" && systemDark);
    const disabled = state.loading || state.saving || !!state.snapshot?.readOnly;
    const langue = state.draft.langue;
    /** Les textes de la fenêtre elle-même, dans la langue choisie */
    const t = (fr: string, en: string) => (langue === "en" ? en : fr);
    const search = query.trim().toLowerCase();
    const visible = definitions.filter(item => {
        if (item.hidden) return false;
        const { displayName, description } = localizedSetting(item, langue);
        return `${displayName} ${description} ${item.key}`.toLowerCase().includes(search);
    });
    const status = state.saving
        ? t("Enregistrement…", "Saving…")
        : !state.valid
            ? t("Vérifie les réglages signalés.", "Check the settings flagged below.")
            : state.dirty
                ? t("Modifications non enregistrées", "Unsaved changes")
                : state.notice;

    return (
        <FluentProvider
            theme={dark ? webDarkTheme : webLightTheme}
            className="settings-provider"
            data-theme={dark ? "dark" : "light"}
        >
            <div className="settings-shell">
                <header className="settings-header">
                    <h1>{t("Réglages", "Settings")}</h1>
                    <Input
                        aria-label={t("Rechercher dans tous les réglages", "Search all settings")}
                        placeholder={t("Rechercher un réglage", "Search a setting")}
                        value={query}
                        onChange={(_, data) => setQuery(data.value)}
                        type="search"
                    />
                </header>
                <main className="settings-content" aria-busy={state.loading}>
                    {state.loading && <Spinner label={t("Chargement des réglages…", "Loading the settings…")} />}
                    {state.error && (
                        <MessageBar intent="error">
                            <MessageBarBody>
                                {state.error}{" "}
                                {!state.snapshot && (
                                    <Button onClick={() => void state.load()} disabled={state.loading}>
                                        {t("Réessayer", "Try again")}
                                    </Button>
                                )}
                            </MessageBarBody>
                        </MessageBar>
                    )}
                    {state.snapshot?.warning && (
                        <MessageBar intent="warning">
                            <MessageBarBody>{state.snapshot.warning} {t("Les réglages sont en lecture seule.", "The settings are read-only.")}</MessageBarBody>
                        </MessageBar>
                    )}
                    {!state.valid && search && (
                        <MessageBar intent="error">
                            <MessageBarBody>
                                {t("Certains réglages demandent ton attention.", "Some settings need your attention.")}{" "}
                                <Button onClick={() => setQuery("")}>{t("Afficher tous les réglages", "Show every setting")}</Button>
                            </MessageBarBody>
                        </MessageBar>
                    )}
                    {!state.loading && state.snapshot && (
                        <>
                            <ul className="setting-list">
                                {visible.map(definition => (
                                    <SettingsField
                                        key={definition.key}
                                        definition={definition}
                                        langue={langue}
                                        value={state.draft[definition.key]}
                                        error={state.errors[definition.key]}
                                        disabled={disabled || !!definition.disabled}
                                        onChange={value => state.edit(definition.key, value)}
                                    />
                                ))}
                            </ul>
                            {visible.length === 0 && (
                                <div className="empty-state">
                                    <p>{t("Aucun réglage ne correspond.", "No setting matches.")}</p>
                                    <Button onClick={() => setQuery("")}>{t("Effacer la recherche", "Clear the search")}</Button>
                                </div>
                            )}
                        </>
                    )}
                </main>
                <footer className="save-bar">
                    <Button appearance="subtle" disabled={disabled || !state.snapshot} onClick={state.reset}>
                        {t("Rétablir les valeurs par défaut", "Restore the defaults")}
                    </Button>
                    <span className="save-status" role="status" aria-live="polite">
                        {status}
                    </span>
                    <Button disabled={!state.dirty || disabled} onClick={state.discard}>
                        Annuler les modifications
                    </Button>
                    <Button
                        appearance="primary"
                        disabled={!state.dirty || !state.valid || disabled}
                        onClick={() => void state.save()}
                    >
                        {state.saving ? "Enregistrement…" : "Enregistrer"}
                    </Button>
                </footer>
            </div>
        </FluentProvider>
    );
}
