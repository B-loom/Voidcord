/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./AccountModal.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, TextInput } from "@webpack/common";

import { Button, Forms } from "./legacyUi";
import { t } from "../langue";

const cl = classNameFactory("vc-nebula-account-");
const logger = new Logger("NebulaComptes", "#f5bde6");

function native() {
    return (window as any).BotClientNative;
}

/** What the main process answers, as UserAuth defines it */
type AuthResult =
    | { status: "success"; token: string; account: { username?: string; }; }
    | { status: "mfa"; ticket: string; methods: { type: string; }[]; }
    | { status: "captcha"; sitekey: string; rqdata: string | null; rqtoken: string | null; }
    | { status: "error"; message: string; };

type Step =
    | { name: "login"; }
    | { name: "mfa"; ticket: string; methods: string[]; }
    | { name: "done"; username: string; token: string; };

const MFA_LABELS: Record<string, () => string> = {
    totp: () => t("Application d'authentification", "Authenticator app"),
    sms: () => t("Code par SMS", "SMS code"),
    backup: () => t("Code de secours", "Backup code"),
    webauthn: () => t("Clé de sécurité", "Security key"),
    password: () => t("Mot de passe", "Password"),
};

function AccountModal({ close }: { close: () => void; }) {
    const [step, setStep] = React.useState<Step>({ name: "login" });
    const [login, setLogin] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [token, setToken] = React.useState("");
    const [code, setCode] = React.useState("");
    const [method, setMethod] = React.useState("totp");
    const [error, setError] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);

    /*
     * Every sign-in ends one of four ways, whatever started it: a captcha to solve, a
     * second factor to ask for, an error to show, or a token to keep.
     */
    const handle = async (result: AuthResult | undefined): Promise<void> => {
        if (!result) return setError(t("Aucune réponse de Discord.", "No answer from Discord."));

        switch (result.status) {
            case "success":
                setError(null);
                setStep({
                    name: "done",
                    username: result.account?.username ?? t("ton compte", "your account"),
                    token: result.token,
                });
                return;

            case "mfa": {
                setError(null);
                // The methods arrive as objects, each naming one way of proving it is you
                const methods = (result.methods ?? []).map(entry => entry.type).filter(Boolean);
                setMethod(methods[0] ?? "totp");
                setStep({ name: "mfa", ticket: result.ticket, methods: methods.length ? methods : ["totp"] });
                return;
            }

            case "captcha": {
                setError(null);
                // hCaptcha only runs on a page Discord itself serves, hence its own window
                const key = await native()?.accountSolveCaptcha?.(result.sitekey, result.rqdata ?? null);
                if (!key) return setError(t("Captcha abandonné.", "Captcha abandoned."));
                return handle(
                    await native()?.accountLogin?.(login, password, { key, rqtoken: result.rqtoken ?? null }),
                );
            }

            default:
                setError(result.message ?? t("Connexion impossible.", "Sign-in failed."));
        }
    };

    /*
     * Electron habille ce que le processus principal a lancé : « Error invoking remote
     * method 'app:account:login': Error: ... ». Seule la fin intéresse la personne qui
     * lit, et le reste est en anglais.
     */
    const readableError = (e: unknown) => {
        const raw = String((e as Error)?.message ?? e);
        const stripped = raw.replace(/^Error invoking remote method '[^']*':\s*/, "").replace(/^Error:\s*/, "");
        return stripped || t("La connexion a échoué.", "The sign-in failed.");
    };

    const run = async (work: () => Promise<AuthResult>) => {
        setBusy(true);
        try {
            await handle(await work());
        } catch (e) {
            logger.error("Échec de la connexion", e);
            setError(readableError(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <ModalHeader separator={false}>
                <div className={cl("header")}>
                    <Forms.FormTitle tag="h2" className={cl("title")}>
                        {step.name === "mfa" ? t("Vérification en deux étapes", "Two-step verification") : t("Ajouter un compte", "Add an account")}
                    </Forms.FormTitle>
                    <Forms.FormText className={cl("subtitle")}>
                        {step.name === "mfa"
                            ? t("Saisis le code demandé par Discord.", "Enter the code Discord is asking for.")
                            : t("Un compte Discord, ou un bot avec son token.", "A Discord account, or a bot with its token.")}
                    </Forms.FormText>
                </div>
            </ModalHeader>

            <ModalContent className={cl("content")}>
                {error && <div className={cl("error")}>{error}</div>}

                {step.name === "login" && (
                    <>
                        <div className={cl("label")}>{t("Adresse e-mail ou numéro de téléphone", "Email address or phone number")}</div>
                        <TextInput value={login} onChange={setLogin} placeholder="exemple@mail.com" />

                        <div className={cl("label")}>{t("Mot de passe", "Password")}</div>
                        <TextInput type="password" value={password} onChange={setPassword} />

                        <Button
                            className={cl("wide")}
                            color={Button.Colors.BRAND}
                            disabled={busy || !login || !password}
                            onClick={() => run(() => native()?.accountLogin?.(login, password))}
                        >
                            {busy ? t("Connexion…", "Signing in…") : t("Se connecter", "Sign in")}
                        </Button>

                        <div className={cl("separator")}>{t("ou", "or")}</div>

                        <div className={cl("label")}>{t("Token de compte ou de bot", "Account or bot token")}</div>
                        <TextInput
                            type="password"
                            value={token}
                            onChange={setToken}
                            placeholder={t("Se connecter sans mot de passe", "Sign in without a password")}
                        />
                        <Button
                            className={cl("wide")}
                            color={Button.Colors.PRIMARY}
                            disabled={busy || !token}
                            onClick={() => run(() => native()?.accountTokenLogin?.(token))}
                        >
                            {t("Se connecter avec ce token", "Sign in with this token")}
                        </Button>
                    </>
                )}

                {step.name === "mfa" && (
                    <>
                        {step.methods.length > 1 && (
                            <div className={cl("methods")}>
                                {step.methods.map(entry => (
                                    <button
                                        key={entry}
                                        className={cl(entry === method ? "method-current" : "method")}
                                        onClick={() => setMethod(entry)}
                                    >
                                        {MFA_LABELS[entry]?.() ?? entry}
                                    </button>
                                ))}
                            </div>
                        )}

                        {method === "sms" && (
                            <Button
                                className={cl("wide")}
                                color={Button.Colors.PRIMARY}
                                onClick={() => native()?.accountSendSms?.(step.ticket)}
                            >
                                {t("Recevoir le code par SMS", "Get the code by SMS")}
                            </Button>
                        )}

                        <div className={cl("label")}>
                            {method === "backup" ? t("Code de secours", "Backup code") : t("Code à six chiffres", "Six-digit code")}
                        </div>
                        <TextInput value={code} onChange={setCode} placeholder="123456" />

                        <Button
                            className={cl("wide")}
                            color={Button.Colors.BRAND}
                            disabled={busy || !code}
                            onClick={() => run(() => native()?.accountMfa?.(step.ticket, code, method))}
                        >
                            {busy ? t("Vérification…", "Checking…") : t("Vérifier", "Check")}
                        </Button>
                    </>
                )}

                {step.name === "done" && (
                    <div className={cl("done")}>
                        <div className={cl("label")}>
                            {t(`${step.username} est enregistré sur cet ordinateur.`, `${step.username} is saved on this computer.`)}
                        </div>
                        <Button
                            className={cl("wide")}
                            color={Button.Colors.BRAND}
                            onClick={() => native()?.accountUse?.(step.token)}
                        >
                            {t("Ouvrir Discord avec ce compte", "Open Discord with this account")}
                        </Button>
                        <Button
                            className={cl("wide")}
                            color={Button.Colors.PRIMARY}
                            onClick={() => native()?.accountOpenWindow?.(step.token)}
                        >
                            {t("Ouvrir dans une nouvelle fenêtre", "Open in a new window")}
                        </Button>
                    </div>
                )}
            </ModalContent>

            <ModalFooter className={cl("footer")}>
                {step.name !== "login" && (
                    <Button
                        color={Button.Colors.PRIMARY}
                        look={Button.Looks.LINK}
                        onClick={() => {
                            setError(null);
                            setCode("");
                            setStep({ name: "login" });
                        }}
                    >
                        {t("Retour", "Back")}
                    </Button>
                )}
                <Button color={Button.Colors.PRIMARY} onClick={close}>{t("Fermer", "Close")}</Button>
            </ModalFooter>
        </>
    );
}

/** Opens the sign-in inside Discord, in place of the window it used to be */
export function openAccountModal() {
    const key = openModal(props => (
        <ErrorBoundary noop>
            <ModalRoot {...props} size={ModalSize.SMALL}>
                <AccountModal close={() => closeModal(key)} />
            </ModalRoot>
        </ErrorBoundary>
    ));
}
