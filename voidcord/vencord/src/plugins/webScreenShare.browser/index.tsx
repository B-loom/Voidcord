/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Heading } from "@components/Heading";
import {
    Divider,
    Paragraph,
    Span,
} from "@components/index";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Checkbox, closeModal, Modal, openModal, } from "@webpack/common";

import managedStyle from "./styles.css?managed";

const cl = classNameFactory("vc-screen-picker-");

class NotAllowedError extends Error {
    name = "NotAllowedError";
}

const logger = new Logger("VencordScreenShare");

const getDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);

/*
 * Voidcord answers the capture request itself, with its own picker and the quality Discord
 * allows. Everything below is written for browsers that can do neither, and doing it
 * twice stacks a second window on the first while asking for a quality the account is not
 * entitled to — which Discord refuses outright, leaving the stream dead with no reason
 * given. Under Voidcord the plugin therefore stands aside, whatever its switch says.
 */
const runningUnderVoidcord = () => Boolean((window as any).BotClientNative);

function openScreenSharePicker(options: DisplayMediaStreamOptions) {
    return new Promise<MediaStream>((resolve, reject) => {
        const key = openModal(
            props => (
                <ModalComponent
                    modalProps={props}
                    submit={resolve}
                    options={options}
                    close={() => {
                        props.onClose();
                        reject(new NotAllowedError("Autorisation refusée"));
                    }}
                />
            ),
            {
                onCloseRequest() {
                    closeModal(key);
                    reject(new NotAllowedError("Autorisation refusée"));
                },
                onCloseCallback() {
                    reject(new NotAllowedError("Autorisation refusée"));
                }
            }
        );
    });
}

function OptionRadio<Settings extends object, Key extends keyof Settings, Options extends ReadonlyArray<string>>(props: {
    options: Options;
    labels?: Array<string>;
    settings: Settings;
    settingsKey: Key;
    onChange: (option: Options[number]) => void;
}) {
    const { options, settings, settingsKey, labels, onChange } = props;

    return (
        <div className={cl("padding")}>
            <div className={cl("option-radios")}>
                {options.map((option, idx) => (
                    <label className={cl("option-radio")} data-checked={settings[settingsKey] === option} key={option}>
                        <Span weight="bold">{labels?.[idx] ?? option}</Span>
                        <input
                            type="radio"
                            name={settingsKey.toString()}
                            value={option}
                            checked={settings[settingsKey] === option}
                            onChange={() => onChange(option)}
                        />
                    </label>
                ))}
            </div>
        </div>
    );
}

function ModalComponent({ modalProps, submit, close, options }: {
    modalProps: any;
    submit: (data: Promise<MediaStream>) => void;
    close: () => void;
    options: DisplayMediaStreamOptions;
}) {
    const liveSettings = settings.use();
    const disableStreamPreviewsValue = disableStreamPreviews.useSetting();

    async function stream() {
        try {
            const frameRate = Number(liveSettings.frameRate);
            const height = Number(liveSettings.resolution);

            // const conn = [...MediaEngineStore.getMediaEngine().connections].find(
            //     connection => connection.userId === UserStore.getCurrentUser().id
            // );

            const videoOptions = typeof options?.video !== "boolean" && !!options.video ? options.video : {};
            const audioOptions = typeof options?.audio !== "boolean" && !!options.audio ? options.audio : {};
            // allow browser to constrain itself
            delete videoOptions.width;

            submit(
                getDisplayMedia({
                    video: {
                        ...videoOptions,
                        frameRate,
                        height,
                    },
                    audio: {
                        ...audioOptions,
                        restrictOwnAudio: true,
                    },
                    surfaceSwitching: "include",
                    systemAudio: liveSettings.systemAudio ? "exclude" : "include"
                }).then(t => {
                    // w3c says this can fail, they don't say why, so just to be safe
                    try {
                        const video = t.getVideoTracks()?.[0];
                        if (video) video.contentHint = liveSettings.contentHint;
                    } catch { }
                    return t;
                })
            );
        } catch (error) {
            logger.error("Error while submitting stream.", error);
        } finally {
            close();
        }
    }

    return (
        <div className={cl("modal")}>
            <Modal
                {...modalProps}

                size="lg"
                actionBarInput={
                    <div className={cl("summary")}>
                        <Paragraph size="md" weight="semibold" style={{ color: "var(--text-strong, var(--text-default))" }} className={cl("source-or-preset-name")}>{liveSettings.contentHint === "motion" ? "Gaming" : liveSettings.contentHint === "detail" ? "Screenshare" : "Custom"}</Paragraph>
                        <Paragraph size="xs" weight="medium" style={{ color: "var(--text-muted, var(--text-default))" }} className={cl("summary-detail")}>
                            <span>{liveSettings.contentHint === "motion" ? "Vidéo fluide" : liveSettings.contentHint === "detail" ? "Texte net" : "Réglage personnalisé"}</span>
                            <span className={cl("ellipsis")}>•</span>
                            <span>{liveSettings.resolution}p</span>
                            <span className={cl("ellipsis")}>•</span>
                            <span>{liveSettings.frameRate}fps</span>
                            {liveSettings.systemAudio ? <span className={cl("ellipsis")}>•</span> : ""}
                            {liveSettings.systemAudio ? <span>Son coupé</span> : ""}
                        </Paragraph>
                    </div>
                }
                actions={[
                    {
                        variant: "primary",
                        text: "Partager",
                        onClick: stream
                    }
                ]}
            >

                <div>
                    <div className={cl("flex", "padding")}>
                        <section className={cl("quality-section")}>
                            <Heading tag="h4">Résolution</Heading>
                            <OptionRadio
                                options={StreamResolution}
                                settings={liveSettings}
                                settingsKey="resolution"
                                onChange={value => (liveSettings.resolution = value)}
                            />
                        </section>

                        <section className={cl("quality-section")}>
                            <Heading tag="h4">Images par seconde</Heading>
                            <OptionRadio
                                options={StreamFps}
                                settings={liveSettings}
                                settingsKey="frameRate"
                                onChange={value => (liveSettings.frameRate = value)}
                            />
                        </section>
                    </div>
                    <div>
                        <Heading tag="h4">Mode de partage</Heading>
                        <div>
                            <OptionRadio
                                options={StreamContentHint}
                                labels={["Vidéo fluide", "Texte net", "Personnalisé"]}
                                settings={liveSettings}
                                settingsKey="contentHint"
                                onChange={option => (liveSettings.contentHint = option)}
                            />
                        </div>
                    </div>
                    <Divider />
                    <div className={cl("padding", "pointer")}>
                        <Checkbox
                            value={!!liveSettings.systemAudio}
                            onChange={(_e, value) => (liveSettings.systemAudio = value)}
                            shape="box"
                            reverse={true}>
                            <div className={cl("control-content")}>
                                <Heading tag="h4">Couper le son du partage</Heading>
                                <Paragraph style={{ color: "var(--text-subtle, var(--text-default))" }}>Le son de ton ordinateur ne sera pas transmis.</Paragraph>
                            </div>
                        </Checkbox>
                    </div>
                    <div className={cl("padding", "pointer")}>
                        <Checkbox
                            value={!disableStreamPreviewsValue}
                            onChange={(_e, value) => disableStreamPreviews.updateSetting(() => !value)}
                            shape="box"
                            reverse={true}>
                            <div className={cl("control-content")}>
                                <Heading tag="h4">Afficher un aperçu</Heading>
                                <Paragraph style={{ color: "var(--text-subtle, var(--text-default))" }}>Les autres voient un aperçu de ton partage avant de le rejoindre.</Paragraph>
                            </div>
                        </Checkbox>
                    </div>
                    <Divider />
                </div>
            </Modal>
        </div>
    );
}

// this is kinda shit and it really should be done via videoQualityManager
const StreamResolution = ["480", "720", "1080", "1440", "2160"] as const;
const StreamFps = ["15", "30", "60", "120"] as const;
const StreamContentHint = ["motion", "detail", ""] as const;

const settings = definePluginSettings({
    resolution: {
        type: OptionType.SELECT,
        description: "Résolution",
        hidden: true,
        // Discord refuses the stream outright above what the account is entitled to,
        // and 1080p60 needs Nitro: the safe values are the ones everyone can use
        options: StreamResolution.map(res => ({ label: res, value: res, default: res === "720" }))
    },
    frameRate: {
        type: OptionType.SELECT,
        description: "Images par seconde",
        hidden: true,
        options: StreamFps.map(fps => ({ label: fps, value: fps, default: fps === "30" }))
    },
    contentHint: {
        type: OptionType.SELECT,
        description: "Type de contenu",
        hidden: true,
        options: StreamContentHint.map(hint => ({ label: hint, value: hint, default: hint === "motion" }))
    },
    systemAudio: {
        type: OptionType.BOOLEAN,
        description: "Couper le son de l'ordinateur",
        hidden: true
    }
});

const disableStreamPreviews = getUserSettingLazy<boolean>("voiceAndVideo", "disableStreamPreviews")!;

export default definePlugin({
    name: "WebScreenShare",
    authors: [Devs.ThaUnknown],
    description: "Adds a screenshare options menu. Allows for changing resolution, framerate, encoding hints, and system audio settings.",
    tags: ["Voice", "Utility"],
    /*
     * Written for browsers, which have no way of choosing a screen on their own. Voidcord
     * does: it answers the capture request with its own picker. Leaving this on stacks a
     * second window on top of it, and its quality override asks Discord for more than the
     * account is entitled to, which Discord refuses outright — the stream then fails to
     * start with no explanation.
     */
    enabledByDefault: false,
    settings,
    managedStyle,

    start() {
        if (runningUnderVoidcord()) return;
        navigator.mediaDevices.getDisplayMedia = openScreenSharePicker;
    },
    stop() {
        if (runningUnderVoidcord()) return;
        navigator.mediaDevices.getDisplayMedia = getDisplayMedia;
    },

    patches: [
        {
            find: "this.getDefaultGoliveQuality()",
            predicate: () => !runningUnderVoidcord(),
            replacement: {
                match: /this\.getDefaultGoliveQuality\(\)/,
                replace: "$self.getGoliveMaxQuality($&)"
            }
        }
    ],
    // this is a maximum, not a true default, this is later constrained properly in GDM anyways
    // and this way we don't pre-emptively neuter the max stream quality
    getGoliveMaxQuality(opts: any) {
        const framerate = 120;
        const height = 2160;
        const width = 3840;

        Object.assign(opts, {
            bitrateMin: 500000,
            bitrateMax: 8000000,
            bitrateTarget: 600000
        });
        if (opts?.encode) {
            Object.assign(opts.encode, {
                framerate,
                width,
                height,
                pixelCount: height * width
            });
        }
        Object.assign(opts.capture, {
            framerate,
            width,
            height,
            pixelCount: height * width
        });
        return opts;
    }
});
