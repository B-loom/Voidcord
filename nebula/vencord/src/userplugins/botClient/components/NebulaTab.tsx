/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./NebulaTab.css";
import { openAccountModal } from "./AccountModal";

import { classNameFactory } from "@utils/css";
import { React } from "@webpack/common";

import { Button, Forms } from "./legacyUi";

import { isUserAccountSession } from "../utils/patches";
import { CHANGELOG, README } from "./docs";
import { CHANGELOG_EN, README_EN } from "./docs.en";
import { enAnglais, t } from "../langue";

const cl = classNameFactory("vc-nebula-");

const BrandEmoji = "https://cdn.discordapp.com/emojis/1399479404706660373.gif";

function native() {
    return (window as any).BotClientNative;
}

/** Sidebar icon for the Nebula settings entry */
export function NebulaIcon(props: any) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={props?.width ?? 20}
            height={props?.height ?? 20}
            fill="currentColor"
            aria-hidden="true"
            {...props}
        >
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2a8 8 0 0 1 7.6 5.5 15.3 15.3 0 0 1-5 3.9 15.3 15.3 0 0 1-6.2 1.6A8 8 0 0 1 12 4Zm-7.9 7.3a10.2 10.2 0 0 0 4 .9 17.3 17.3 0 0 0 7-1.8 17.3 17.3 0 0 0 4.6-3.3 8 8 0 1 1-15.6 4.2Z" />
            <circle cx="9" cy="9" r="1.4" />
            <circle cx="15.5" cy="15" r="1.1" />
        </svg>
    );
}

function Row({ label, value }: { label: string; value: string; }) {
    return (
        <div className={cl("row")}>
            <span className={cl("rowLabel")}>{label}</span>
            <span className={cl("rowValue")}>{value}</span>
        </div>
    );
}

/** Shown instead of the pages that cannot work here */
export function BotBillingTab() {
    const isUserSession = isUserAccountSession();
    return (
        <div className={cl("empty")}>
            <img src={BrandEmoji} alt="" className={cl("emptyArt")} />
            <Forms.FormTitle tag="h3">Rien à voir par ici</Forms.FormTitle>
            {isUserSession ? (
                <Forms.FormText className={cl("emptyText")}>
                    {t(
                        "Nebula ne prend pas en charge cette page. Elle a besoin des rouages de paiement et d’authentification de Discord, qui n’existent que dans le client officiel : passe par celui-ci pour y accéder.",
                        "Nebula does not support this page. It needs the payment and authentication machinery of Discord, which only exists in the official client: use that one to reach it.",
                    )}
                </Forms.FormText>
            ) : (
                <>
                    <Forms.FormText className={cl("emptyText")}>
                        {t(
                            "Tu es connecté avec un bot. Cette page concerne les réglages d’un compte Discord : Nitro, abonnements, moyens de paiement, confidentialité, notifications… Un bot n’a rien de tout ça.",
                            "You are signed in with a bot. This page is about the settings of a Discord account: Nitro, subscriptions, payment methods, privacy, notifications… A bot has none of that.",
                        )}
                    </Forms.FormText>
                    <Forms.FormText className={cl("emptyText")}>
                        {t("Connecte-toi avec un compte Discord pour y accéder.", "Sign in with a Discord account to reach it.")}
                    </Forms.FormText>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.BRAND}
                        onClick={() => openAccountModal()}
                    >
                        {t("Se connecter avec un compte", "Sign in with an account")}
                    </Button>
                </>
            )}
        </div>
    );
}

/**
 * Very small markdown renderer: enough for the two bundled documents.
 * Lines that continue a bullet (indented) are folded back into it so long
 * items wrap under their own text instead of under the bullet.
 */
function Markdown({ source }: { source: string; }) {
    const nodes: React.ReactNode[] = [];
    let list: string[] = [];

    const flushList = () => {
        if (!list.length) return;
        const items = [...list];
        nodes.push(
            <ul key={`list-${nodes.length}`} className={cl("docList")}>
                {items.map((item, index) => (
                    <li key={index} className={cl("docItem")}>{inline(item)}</li>
                ))}
            </ul>
        );
        list = [];
    };

    let quote: string[] = [];
    const flushQuote = () => {
        if (!quote.length) return;
        const lines = [...quote];
        nodes.push(
            <div key={`quote-${nodes.length}`} className={cl("docQuote")}>
                {lines.map((item, index) => (
                    <Forms.FormText key={index} className={cl("docText")}>{inline(item)}</Forms.FormText>
                ))}
            </div>
        );
        quote = [];
    };

    for (const line of source.trim().split("\n")) {
        // Consecutive quoted lines make one block, and a bare ">" separates two of them
        if (line.startsWith(">")) {
            flushList();
            const text = line.replace(/^>\s?/, "");
            if (text.trim()) {
                quote.push(text);
            } else {
                flushQuote();
            }
            continue;
        }
        flushQuote();

        if (line.startsWith("- ")) {
            list.push(line.slice(2));
            continue;
        }
        // An indented line continues the bullet above it
        if (list.length && line.startsWith("  ") && line.trim()) {
            list[list.length - 1] += ` ${line.trim()}`;
            continue;
        }
        flushList();
        const key = `line-${nodes.length}`;
        if (/^-{3,}$/.test(line.trim())) {
            nodes.push(<div key={key} className={cl("docRule")} />);
        } else if (line.startsWith("### ")) {
            nodes.push(<Forms.FormTitle key={key} tag="h5">{line.slice(4)}</Forms.FormTitle>);
        } else if (line.startsWith("## ")) {
            nodes.push(<Forms.FormTitle key={key} tag="h3">{line.slice(3)}</Forms.FormTitle>);
        } else if (line.startsWith("# ")) {
            nodes.push(<Forms.FormTitle key={key} tag="h1">{line.slice(2)}</Forms.FormTitle>);
        } else if (!line.trim()) {
            nodes.push(<div key={key} className={cl("docSpace")} />);
        } else {
            nodes.push(<Forms.FormText key={key} className={cl("docText")}>{inline(line)}</Forms.FormText>);
        }
    }
    flushList();
    flushQuote();

    return <div className={cl("doc")}>{nodes}</div>;
}

/** Renders **bold**, `code` runs and [links](url) */
function inline(text: string) {
    return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={index} className={cl("docCode")}>{part.slice(1, -1)}</code>;
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
            return (
                <a key={index} href={link[2]} target="_blank" rel="noreferrer" className={cl("docLink")}>
                    {link[1]}
                </a>
            );
        }
        return part;
    });
}

/*
 * La documentation et les nouveautés suivent la langue de Nebula. Les textes français
 * sont les originaux — c'est la langue du projet — et docs.en.ts en porte la traduction.
 */
export function ReadmeTab() {
    return <Markdown source={enAnglais() ? README_EN : README} />;
}

type Definition = {
    key: string;
    displayName: string;
    description: string;
    hidden?: boolean;
    type: "boolean" | "number" | "string" | "select";
    defaultValue: unknown;
    min?: number;
    max?: number;
    options?: { label: string; value: string; }[];
};

/*
 * Les textes de Nebula sont lus une seule fois, au chargement de la page : les écrans
 * déjà affichés gardent la langue d'avant. Recharger la fenêtre suffit — c'est ce que
 * propose le bouton.
 */
const A_RECHARGER = new Set(["langue"]);

/*
 * Ceux-là touchent la session réseau d'Electron, posée une fois pour toutes au démarrage :
 * recharger la page n'y change rien, il faut relancer Nebula.
 */
const A_RELANCER = new Set(["doh_provider", "use_system_proxy", "cache_assets"]);

/**
 * La page « Réglages » de la catégorie Nebula.
 *
 * Les réglages vivent dans le processus principal, pas dans Discord : la fenêtre à part
 * existe toujours, mais passer par elle pour changer la langue était absurde. Ils se
 * règlent donc ici, dans la page où on vient les chercher. Chaque changement est écrit
 * tout de suite ; il n'y a pas de bouton « Enregistrer » à oublier.
 */
export function SettingsTab() {
    const [definitions, setDefinitions] = React.useState<Definition[]>([]);
    const [valeurs, setValeurs] = React.useState<Record<string, unknown> | null>(null);
    const [lectureSeule, setLectureSeule] = React.useState(false);
    const [note, setNote] = React.useState<string | null>(null);
    const [erreur, setErreur] = React.useState<string | null>(null);
    const [aRecharger, setARecharger] = React.useState<"page" | "app" | null>(null);

    React.useEffect(() => {
        let vivant = true;
        native()?.getSettings?.()
            .then((reponse: any) => {
                if (!vivant) return;
                setDefinitions(reponse?.definitions ?? []);
                setValeurs(reponse?.settings ?? {});
                setLectureSeule(Boolean(reponse?.readOnly));
                if (reponse?.warning) setErreur(reponse.warning);
            })
            .catch((e: Error) => vivant && setErreur(e?.message ?? String(e)));
        return () => { vivant = false; };
    }, []);

    const changer = (cle: string, valeur: unknown) => {
        if (!valeurs) return;
        const suivant = { ...valeurs, [cle]: valeur };
        setValeurs(suivant);
        setErreur(null);
        native()?.saveSettings?.(suivant)
            .then((reponse: any) => {
                setValeurs(reponse?.settings ?? suivant);
                /*
                 * Les textes de Nebula sont lus une fois, au chargement de la page : les
                 * écrans déjà affichés gardent la langue d'avant. Changer la langue ne
                 * semblait donc rien faire. Le choix est bien enregistré — il manquait de
                 * le dire, et d'offrir le rechargement qui l'applique.
                 */
                if (A_RECHARGER.has(cle) || A_RELANCER.has(cle)) {
                    setARecharger(A_RECHARGER.has(cle) ? "page" : "app");
                    setNote(null);
                } else {
                    setNote(t("Enregistré", "Saved"));
                    setTimeout(() => setNote(null), 1500);
                }
            })
            .catch((e: Error) => setErreur(e?.message ?? String(e)));
    };

    if (erreur && !valeurs) {
        return (
            <div className={cl("tab")}>
                <Forms.FormText className={cl("updateError")}>{erreur}</Forms.FormText>
            </div>
        );
    }
    if (!valeurs) {
        return (
            <div className={cl("tab")}>
                <Forms.FormText className={cl("sectionText")}>{t("Chargement…", "Loading…")}</Forms.FormText>
            </div>
        );
    }

    return (
        <div className={cl("tab")}>
            <Forms.FormSection title={t("Réglages de Nebula", "Nebula settings")}>
                {erreur && <Forms.FormText className={cl("updateError")}>{erreur}</Forms.FormText>}
                {aRecharger && (
                    <div className={cl("settingReload")}>
                        <Forms.FormText className={cl("sectionText")}>
                            {aRecharger === "page"
                                ? t(
                                    "Enregistré. Les textes déjà affichés gardent l'ancienne langue : recharge pour l'appliquer.",
                                    "Saved. Text already on screen keeps the old language: reload to apply it.",
                                )
                                : t(
                                    "Enregistré. Ce réglage ne prendra effet qu'au prochain lancement de Nebula.",
                                    "Saved. This setting only takes effect the next time Nebula starts.",
                                )}
                        </Forms.FormText>
                        {aRecharger === "page" && (
                            <Button size={Button.Sizes.SMALL} onClick={() => location.reload()}>
                                {t("Recharger maintenant", "Reload now")}
                            </Button>
                        )}
                    </div>
                )}
                {definitions.filter(d => !d.hidden).map(definition => (
                    <div key={definition.key} className={cl("settingRow")}>
                        <div className={cl("settingText")}>
                            <Forms.FormTitle tag="h5">{definition.displayName}</Forms.FormTitle>
                            <Forms.FormText className={cl("sectionText")}>{definition.description}</Forms.FormText>
                        </div>
                        <div className={cl("settingControl")}>
                            {definition.type === "boolean" && (
                                <input
                                    type="checkbox"
                                    disabled={lectureSeule}
                                    checked={Boolean(valeurs[definition.key])}
                                    onChange={event => changer(definition.key, event.currentTarget.checked)}
                                />
                            )}
                            {definition.type === "select" && (
                                <select
                                    className={cl("settingSelect")}
                                    disabled={lectureSeule}
                                    value={String(valeurs[definition.key] ?? "")}
                                    onChange={event => changer(definition.key, event.currentTarget.value)}
                                >
                                    {(definition.options ?? []).map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            )}
                            {definition.type === "number" && (
                                <input
                                    className={cl("settingInput")}
                                    type="number"
                                    disabled={lectureSeule}
                                    value={Number(valeurs[definition.key] ?? 0)}
                                    min={definition.min}
                                    onChange={event => {
                                        const n = Number(event.currentTarget.value);
                                        if (Number.isFinite(n)) changer(definition.key, n);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                ))}
                <Forms.FormText className={cl("sectionText")}>
                    {note ?? t(
                        "Certains réglages ne prennent effet qu'au lancement suivant.",
                        "Some settings only take effect on the next launch.",
                    )}
                </Forms.FormText>
            </Forms.FormSection>
        </div>
    );
}

export function ChangelogTab() {
    return <Markdown source={enAnglais() ? CHANGELOG_EN : CHANGELOG} />;
}

type UpdateState = {
    state: "idle" | "checking" | "up-to-date" | "available" | "downloading" | "ready" | "error";
    version?: string;
    percent?: number;
    message?: string;
};

/** What each state means to someone reading the page, and the colour of its dot */
const UPDATE_LABELS: Record<UpdateState["state"], { text: () => string; tone: "good" | "bad" | "wait"; }> = {
    idle: { text: () => t("Non vérifié", "Not checked"), tone: "wait" },
    checking: { text: () => t("Vérification…", "Checking…"), tone: "wait" },
    "up-to-date": { text: () => t("À jour", "Up to date"), tone: "good" },
    available: { text: () => t("Mise à jour disponible", "Update available"), tone: "bad" },
    downloading: { text: () => t("Téléchargement…", "Downloading…"), tone: "wait" },
    ready: { text: () => t("Prête à installer", "Ready to install"), tone: "bad" },
    error: { text: () => t("Vérification impossible", "Could not check"), tone: "bad" },
};

/** Follows the update as the main process reports it */
function useUpdateState(): UpdateState {
    const [state, setState] = React.useState<UpdateState>(
        () => native()?.getUpdateState?.() ?? { state: "idle" },
    );

    React.useEffect(() => {
        native()?.onUpdateState?.((next: UpdateState) => setState(next));
    }, []);

    return state;
}

export default function NebulaTab() {
    const [copied, setCopied] = React.useState(false);
    const update = useUpdateState();
    const updateLabel = UPDATE_LABELS[update.state] ?? UPDATE_LABELS.idle;

    const version = native()?.getBotClientVersion?.() ?? "inconnue";
    const name = native()?.getBotClientName?.() ?? "Nebula";
    const chrome = navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? "inconnue";
    const electron = navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] ?? "inconnue";

    const isUserSession = isUserAccountSession();

    const details = [
        `${name} v${version}`,
        `Chromium ${chrome}`,
        `Electron ${electron}`,
        `Plateforme ${navigator.platform}`,
        `Langue ${navigator.language}`,
        `Session ${isUserSession ? "compte utilisateur" : "bot"}`,
    ].join("\n");

    return (
        <>
            <div className={cl("hero")}>
                <div className={cl("heroText")}>
                    <Forms.FormTitle tag="h3" className={cl("heroTitle")}>
                        <img src={BrandEmoji} alt="" className={cl("heroEmoji")} />
                        Nebula
                    </Forms.FormTitle>
                    <Forms.FormText className={cl("heroBody")}>
                        {t("Connecte-toi à tes comptes Discord et à tes bots depuis un seul client.", "Sign in to your Discord accounts and your bots from a single client.")}
                    </Forms.FormText>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.WHITE}
                        look={Button.Looks.FILLED}
                        disabled={update.state === "checking" || update.state === "downloading"}
                        onClick={() => native()?.checkForUpdates?.()}
                    >
                        {update.state === "checking" ? t("Vérification…", "Checking…") : t("Vérifier les mises à jour", "Check for updates")}
                    </Button>
                </div>
                <img src={BrandEmoji} alt="" className={cl("heroArt")} />
            </div>

            <Forms.FormSection title={t("Informations", "Information")}>
                <div className={cl("card")}>
                    <Row label={t("Application", "Application")} value={name} />
                    <Row label="Version" value={`v${version}`} />
                    <div className={cl("row")}>
                        <span className={cl("rowLabel")}>{t("Mise à jour", "Update")}</span>
                        <span className={cl("rowValue")}>
                            <span className={cl(`dot-${updateLabel.tone}`)} />
                            {updateLabel.text()}
                            {update.version && update.state === "available" ? ` (v${update.version})` : ""}
                        </span>
                    </div>
                    <Row label="Chromium" value={chrome} />
                    <Row label="Electron" value={electron} />
                    <Row label={t("Plateforme", "Platform")} value={navigator.platform} />
                    <Row label={t("Langue", "Language")} value={navigator.language} />
                    <Row label={t("Build Discord", "Discord build")} value={String((window as any).GLOBAL_ENV?.BUILD_NUMBER ?? t("inconnu", "unknown"))} />
                    <Row label={t("Canal", "Channel")} value={String((window as any).GLOBAL_ENV?.RELEASE_CHANNEL ?? t("inconnu", "unknown"))} />
                    <Row label={t("Session", "Session")} value={isUserSession ? t("Compte utilisateur", "User account") : "Bot"} />
                    <Row label={t("Cœurs CPU", "CPU cores")} value={String(navigator.hardwareConcurrency ?? t("inconnu", "unknown"))} />
                </div>
                {update.state === "downloading" && (
                    <div className={cl("progress")}>
                        <div className={cl("progressBar")} style={{ width: `${update.percent ?? 0}%` }} />
                        <span className={cl("progressText")}>
                            {t("Téléchargement de la mise à jour", "Downloading the update")} : {update.percent ?? 0} %
                        </span>
                    </div>
                )}
                {update.state === "error" && update.message && (
                    <Forms.FormText className={cl("updateError")}>{update.message}</Forms.FormText>
                )}
                <div className={cl("actions")}>
                    {update.state === "ready" && (
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.GREEN}
                            onClick={() => native()?.installUpdate?.()}
                        >
                            {t("Redémarrer et installer", "Restart and install")}
                        </Button>
                    )}
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.PRIMARY}
                        onClick={() => {
                            navigator.clipboard.writeText(details);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                    >
                        {copied ? t("Copié !", "Copied!") : t("Copier les informations", "Copy the information")}
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.PRIMARY}
                        onClick={() => location.reload()}
                    >
                        {t("Recharger le client", "Reload the client")}
                    </Button>
                    {/*
                      * Les réglages de Nebula — langue, écran de démarrage, mises à jour
                      * automatiques, DNS — vivent dans une fenêtre à part, jusqu'ici
                      * atteignable seulement par l'icône de la zone de notification.
                      */}
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.BRAND}
                        onClick={() => native()?.openSettings?.()}
                    >
                        {t("Réglages de Nebula", "Nebula settings")}
                    </Button>
                </div>
            </Forms.FormSection>

            <Forms.FormSection title={t("Comptes", "Accounts")}>
                <Forms.FormText className={cl("sectionText")}>
                    {t(
                        "Les comptes connectés avec une adresse e-mail et un mot de passe sont enregistrés sur cet ordinateur. Tu peux les gérer depuis la fenêtre de connexion.",
                        "Accounts signed in with an email address and a password are saved on this computer. You can manage them from the sign-in window.",
                    )}
                </Forms.FormText>
                <div className={cl("actions")}>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.BRAND}
                        onClick={() => openAccountModal()}
                    >
                        {t("Ouvrir la fenêtre de connexion", "Open the sign-in window")}
                    </Button>
                </div>
            </Forms.FormSection>
        </>
    );
}
