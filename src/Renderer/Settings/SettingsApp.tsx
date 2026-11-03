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

import { type SettingDefinition, type Settings, settingsDefinitions } from "../../shared/Settings";
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
    const search = query.trim().toLowerCase();
    const visible = definitions.filter(
        item => !item.hidden && `${item.displayName} ${item.description} ${item.key}`.toLowerCase().includes(search),
    );
    const status = state.saving
        ? "Enregistrement…"
        : !state.valid
            ? "Vérifie les réglages signalés."
            : state.dirty
                ? "Modifications non enregistrées"
                : state.notice;

    return (
        <FluentProvider
            theme={dark ? webDarkTheme : webLightTheme}
            className="settings-provider"
            data-theme={dark ? "dark" : "light"}
        >
            <div className="settings-shell">
                <header className="settings-header">
                    <h1>Réglages</h1>
                    <Input
                        aria-label="Rechercher dans tous les réglages"
                        placeholder="Rechercher un réglage"
                        value={query}
                        onChange={(_, data) => setQuery(data.value)}
                        type="search"
                    />
                </header>
                <main className="settings-content" aria-busy={state.loading}>
                    {state.loading && <Spinner label="Chargement des réglages…" />}
                    {state.error && (
                        <MessageBar intent="error">
                            <MessageBarBody>
                                {state.error}{" "}
                                {!state.snapshot && (
                                    <Button onClick={() => void state.load()} disabled={state.loading}>
                                        Réessayer
                                    </Button>
                                )}
                            </MessageBarBody>
                        </MessageBar>
                    )}
                    {state.snapshot?.warning && (
                        <MessageBar intent="warning">
                            <MessageBarBody>{state.snapshot.warning} Les réglages sont en lecture seule.</MessageBarBody>
                        </MessageBar>
                    )}
                    {!state.valid && search && (
                        <MessageBar intent="error">
                            <MessageBarBody>
                                Certains réglages demandent ton attention.{" "}
                                <Button onClick={() => setQuery("")}>Afficher tous les réglages</Button>
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
                                        value={state.draft[definition.key]}
                                        error={state.errors[definition.key]}
                                        disabled={disabled || !!definition.disabled}
                                        onChange={value => state.edit(definition.key, value)}
                                    />
                                ))}
                            </ul>
                            {visible.length === 0 && (
                                <div className="empty-state">
                                    <p>Aucun réglage ne correspond.</p>
                                    <Button onClick={() => setQuery("")}>Effacer la recherche</Button>
                                </div>
                            )}
                        </>
                    )}
                </main>
                <footer className="save-bar">
                    <Button appearance="subtle" disabled={disabled || !state.snapshot} onClick={state.reset}>
                        Rétablir les valeurs par défaut
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
