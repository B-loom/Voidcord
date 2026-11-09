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
import { FluxDispatcher, React } from "@webpack/common";

import { Button, Forms } from "./legacyUi";
import { ecrireStockage, lireStockage } from "./stockage";
import { t } from "../langue";

const cl = classNameFactory("vc-voidcord-share-");
const logger = new Logger("VoidcordPartage", "#f5bde6");

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

const CLE = "voidcord-partage-qualite";

const PAR_DEFAUT: Qualite = { hauteur: 1080, fps: 30 };

/*
 * Le choix vit d'abord ici : le partage le relit dans la foulée du clic, et Discord
 * supprime le stockage de la page (voir stockage.ts), si bien qu'un aller-retour par
 * le disque rendait toujours la valeur par défaut — d'où un partage bloqué à 1080p et
 * 30 images/s. Le disque ne sert plus qu'à retrouver le choix au lancement suivant.
 */
let choixCourant: Qualite | undefined;

/** Le dernier choix, relu au prochain partage plutôt que redemandé à zéro */
export function qualiteRetenue (): Qualite {
    if (choixCourant) return choixCourant;
    try {
        const brut = JSON.parse(lireStockage(CLE) || "");
        if (typeof brut?.hauteur === "number" && typeof brut?.fps === "number") {
            choixCourant = brut;
            return brut;
        }
    } catch {
        // Un stockage vide ou abîmé n'est pas une raison de ne pas partager
    }
    return PAR_DEFAUT;
}

function retenirQualite (qualite: Qualite) {
    choixCourant = qualite;
    ecrireStockage(CLE, JSON.stringify(qualite));
    prevenirDiscord(qualite);
}

/*
 * Discord garde la qualité du partage dans un magasin à lui, ApplicationStreamingSettings,
 * et c'est lui — pas la piste vidéo — qui décide ce qu'il négocie et ce qu'il affiche sur
 * le badge du flux. Tant que Voidcord se contentait de contraindre la piste et d'habiller
 * setGoLiveSource, ce magasin restait sur ses 720p à 30 images/s d'origine : le choix du
 * sélecteur n'arrivait jamais jusqu'à Discord, d'où un partage obstinément en 720p30.
 *
 * On lui dit donc ce qui a été choisi, par son action à lui. Le préréglage 3 est le mode
 * personnalisé : sans lui Discord reprend sa propre échelle et ignore les deux valeurs.
 */
export function prevenirDiscord (qualite: Qualite) {
    try {
        const hauteur = qualite.hauteur > 0
            ? qualite.hauteur
            : Math.min(Math.round(window.screen?.height || 1080), 2160);
        FluxDispatcher.dispatch({
            type: "STREAM_UPDATE_SETTINGS",
            preset: 3,
            resolution: hauteur,
            frameRate: qualite.fps,
        } as any);
        logger.info(`Qualité annoncée à Discord : ${hauteur}p à ${qualite.fps} images/s`);
    } catch (error) {
        logger.warn("Discord n'a pas accepté la qualité choisie", error);
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

    const depart = piste.getSettings();
    const proportion = depart.width && depart.height ? depart.width / depart.height : 16 / 9;
    const hauteur = qualite.hauteur > 0 ? qualite.hauteur : depart.height ?? 0;
    const largeur = hauteur > 0 ? Math.round(hauteur * proportion) : 0;

    const contraintes: MediaTrackConstraints = { frameRate: { ideal: qualite.fps, max: qualite.fps } };
    if (hauteur > 0) {
        contraintes.height = { ideal: hauteur, max: hauteur };
        /*
         * La largeur compte autant que la hauteur : sans elle, un plafond de largeur posé
         * ailleurs décide seul de la définition, la hauteur suivant la proportion.
         */
        contraintes.width = { ideal: largeur, max: largeur };
    }

    try {
        await piste.applyConstraints(contraintes);
        const obtenu = piste.getSettings();
        logger.info(`Partage réglé sur ${obtenu.width}×${obtenu.height} à ${obtenu.frameRate} images/s`);
    } catch (error) {
        logger.warn("La qualité demandée n'a pas pu être appliquée", error);
    }

    protegerLaPiste(piste, contraintes);
}

/*
 * Pourquoi le partage restait en 720p à 30 images/s, malgré tout le reste.
 *
 * Une fois le flux rendu, Discord repose ses propres contraintes sur la piste, et il y
 * écrit `width: { max: 1280 }`. Mille deux cent quatre-vingts pixels de large sur une
 * image 16/9, c'est exactement 720p : la hauteur suit la proportion, quelle que soit la
 * valeur annoncée à côté. Le choix du sélecteur était donc bien appliqué — puis défait
 * une seconde plus tard, sans un mot.
 *
 * La piste garde donc la définition choisie : les contraintes qui arrivent ensuite sont
 * acceptées, mais la largeur, la hauteur et la cadence restent celles du sélecteur.
 * Discord reste libre de descendre plus bas à l'encodage ; il ne rabaisse simplement plus
 * la capture elle-même.
 */
function protegerLaPiste (piste: MediaStreamTrack, choisies: MediaTrackConstraints) {
    const marquee = piste as MediaStreamTrack & { __voidcordProtegee?: boolean; };
    if (marquee.__voidcordProtegee) return;

    const original = piste.applyConstraints.bind(piste);
    piste.applyConstraints = (contraintes?: MediaTrackConstraints) => original({
        ...contraintes,
        ...choisies,
    });
    marquee.__voidcordProtegee = true;
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
                    <Forms.FormTitle tag="h2" className={cl("title")}>{t("Partager un écran", "Share a screen")}</Forms.FormTitle>
                    <Forms.FormText className={cl("subtitle")}>
                        {t("Choisis ce que les autres verront.", "Choose what the others will see.")}
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
                            {entry === "screen" ? t("Écrans", "Screens") : t("Fenêtres", "Windows")}
                        </button>
                    ))}
                </div>

                {shown.length === 0 ? (
                    <Forms.FormText className={cl("empty")}>
                        {kind === "screen"
                            ? t("Aucun écran détecté.", "No screen found.")
                            : t("Aucune fenêtre ouverte à partager.", "No open window to share.")}
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
                        <span className={cl("quality-label")}>{t("Qualité", "Quality")}</span>
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
                        <span className={cl("quality-label")}>{t("Images/s", "Frames/s")}</span>
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
                    {t("Partager aussi le son de l'ordinateur", "Also share the computer sound")}
                </label>
                <Button color={Button.Colors.BRAND} disabled={!chosen} onClick={() => share(chosen)}>
                    {t("Partager", "Share")}
                </Button>
                <Button color={Button.Colors.PRIMARY} look={Button.Looks.LINK} onClick={() => share(null)}>
                    {t("Annuler", "Cancel")}
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
    if (!media?.getDisplayMedia || media.__voidcordQualite) return;
    const original = media.getDisplayMedia.bind(media);
    media.getDisplayMedia = async (contraintes: any) => {
        const flux = await original(contraintes);
        await appliquerQualite(flux, qualiteRetenue());
        return flux;
    };
    media.__voidcordQualite = true;
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
