/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ScreenSharePicker.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React } from "@webpack/common";

import { Button, Forms } from "./legacyUi";

const cl = classNameFactory("vc-nebula-share-");
const logger = new Logger("NebulaPartage", "#f5bde6");

type Source = {
    id: string;
    name: string;
    kind: "screen" | "window";
    thumbnail: string;
};

function native() {
    return (window as any).BotClientNative;
}

const RESOLUTIONS = [
    { label: "720p", hauteur: 720 },
    { label: "1080p", hauteur: 1080 },
    { label: "1440p", hauteur: 1440 },
    { label: "Source", hauteur: 0 },
] as const;

const IMAGES_PAR_SECONDE = [15, 30, 60] as const;

export type Qualite = { hauteur: number; fps: number; };

const CLE = "nebula-partage-qualite";

/** Le dernier choix, relu au prochain partage plutôt que redemandé à zéro */
export function qualiteRetenue (): Qualite {
    try {
        const brut = JSON.parse(localStorage.getItem(CLE) || "");
        if (typeof brut?.hauteur === "number" && typeof brut?.fps === "number") return brut;
    } catch {
        // Un stockage vide ou abîmé n'est pas une raison de ne pas partager
    }
    return { hauteur: 1080, fps: 30 };
}

function retenirQualite (qualite: Qualite) {
    try {
        localStorage.setItem(CLE, JSON.stringify(qualite));
    } catch {
        // Tant pis : le partage en cours garde quand même le choix
    }
}

/*
 * Electron rend un flux à la définition et à la cadence de l'écran capturé. Les
 * contraintes sont donc posées sur la piste une fois qu'elle existe. Discord réencode
 * ensuite pour la voix : ce choix est un plafond, pas une garantie.
 */
export async function appliquerQualite (flux: MediaStream, qualite: Qualite) {
    const piste = flux.getVideoTracks()[0];
    if (!piste) return;
    const contraintes: MediaTrackConstraints = { frameRate: { ideal: qualite.fps, max: qualite.fps } };
    if (qualite.hauteur > 0) contraintes.height = { ideal: qualite.hauteur, max: qualite.hauteur };
    try {
        await piste.applyConstraints(contraintes);
        logger.info(`Partage limité à ${qualite.hauteur || "la source"}${qualite.hauteur ? "p" : ""} à ${qualite.fps} images/s`);
    } catch (error) {
        logger.warn("La qualité demandée n'a pas pu être appliquée", error);
    }
}

function Picker({ sources, onChoose, close }: {
    sources: Source[];
    onChoose: (id: string | null, audio: boolean) => void;
    close: () => void;
}) {
    const [kind, setKind] = React.useState<"screen" | "window">("screen");
    const [chosen, setChosen] = React.useState<string | null>(null);
    const [audio, setAudio] = React.useState(true);
    const [qualite, setQualite] = React.useState<Qualite>(qualiteRetenue);

    const shown = sources.filter(source => source.kind === kind);

    const share = (id: string | null) => {
        if (id) retenirQualite(qualite);
        onChoose(id, audio);
        close();
    };

    return (
        <>
            <ModalHeader separator={false}>
                <div className={cl("header")}>
                    <Forms.FormTitle tag="h2" className={cl("title")}>Partager un écran</Forms.FormTitle>
                    <Forms.FormText className={cl("subtitle")}>
                        Choisis ce que les autres verront.
                    </Forms.FormText>
                </div>
            </ModalHeader>

            <ModalContent className={cl("content")}>
                <div className={cl("tabs")}>
                    {(["screen", "window"] as const).map(entry => (
                        <button
                            key={entry}
                            className={cl(entry === kind ? "tab-current" : "tab")}
                            onClick={() => setKind(entry)}
                        >
                            {entry === "screen" ? "Écrans" : "Fenêtres"}
                        </button>
                    ))}
                </div>

                {shown.length === 0 ? (
                    <Forms.FormText className={cl("empty")}>
                        {kind === "screen"
                            ? "Aucun écran détecté."
                            : "Aucune fenêtre ouverte à partager."}
                    </Forms.FormText>
                ) : (
                    <div className={cl("grid")}>
                        {shown.map(source => (
                            <button
                                key={source.id}
                                title={source.name}
                                className={cl(source.id === chosen ? "source-selected" : "source")}
                                onClick={() => setChosen(source.id)}
                                onDoubleClick={() => share(source.id)}
                            >
                                <img src={source.thumbnail} alt="" className={cl("thumb")} />
                                <span className={cl("name")}>{source.name}</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className={cl("quality")}>
                    <div className={cl("quality-row")}>
                        <span className={cl("quality-label")}>Qualité</span>
                        {RESOLUTIONS.map(entry => (
                            <button
                                key={entry.label}
                                className={cl(entry.hauteur === qualite.hauteur ? "chip-current" : "chip")}
                                onClick={() => setQualite({ ...qualite, hauteur: entry.hauteur })}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </div>
                    <div className={cl("quality-row")}>
                        <span className={cl("quality-label")}>Images/s</span>
                        {IMAGES_PAR_SECONDE.map(fps => (
                            <button
                                key={fps}
                                className={cl(fps === qualite.fps ? "chip-current" : "chip")}
                                onClick={() => setQualite({ ...qualite, fps })}
                            >
                                {fps}
                            </button>
                        ))}
                    </div>
                </div>
            </ModalContent>

            <ModalFooter>
                <label className={cl("audio")}>
                    <input type="checkbox" checked={audio} onChange={event => setAudio(event.currentTarget.checked)} />
                    Partager aussi le son de l'ordinateur
                </label>
                <Button color={Button.Colors.BRAND} disabled={!chosen} onClick={() => share(chosen)}>
                    Partager
                </Button>
                <Button color={Button.Colors.PRIMARY} look={Button.Looks.LINK} onClick={() => share(null)}>
                    Annuler
                </Button>
            </ModalFooter>
        </>
    );
}

/**
 * The main process asks what to share whenever Discord requests a screen. The answer has
 * to come back exactly once: Electron is holding the request open until it does, so
 * closing the window without choosing counts as a refusal.
 */
/*
 * La qualité ne peut se poser qu'une fois la piste créée : Electron rend l'écran tel
 * quel, à sa définition et à sa cadence. L'appel de Discord est donc enveloppé, pour
 * appliquer le choix du sélecteur juste après — le sélecteur, lui, a déjà écrit ce
 * choix au moment où l'on a cliqué sur « Partager ».
 */
function installerQualite() {
    const media = navigator.mediaDevices as any;
    if (!media?.getDisplayMedia || media.__nebulaQualite) return;
    const original = media.getDisplayMedia.bind(media);
    media.getDisplayMedia = async (contraintes: any) => {
        const flux = await original(contraintes);
        await appliquerQualite(flux, qualiteRetenue());
        return flux;
    };
    media.__nebulaQualite = true;
}

export function listenForScreenShare() {
    try {
        installerQualite();
        native()?.onScreenShareSources?.((sources: Source[]) => {
            let answered = false;
            const answer = (id: string | null, audio: boolean) => {
                if (answered) return;
                answered = true;
                native()?.chooseScreenShare?.(id, audio);
            };

            const key = openModal(props => (
                <ErrorBoundary noop onError={() => answer(null, false)}>
                    <ModalRoot {...props} size={ModalSize.LARGE}>
                        <Picker
                            sources={sources}
                            onChoose={answer}
                            close={() => closeModal(key)}
                        />
                    </ModalRoot>
                </ErrorBoundary>
            ), {
                // Dismissing the window is a refusal, not a silence
                onCloseCallback: () => answer(null, false),
            });
        });
    } catch (error) {
        logger.error("Impossible d'écouter les demandes de partage", error);
    }
}
