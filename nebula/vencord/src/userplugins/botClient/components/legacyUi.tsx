/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button as VencordButton, type ButtonSize, type ButtonVariant } from "@components/Button";
import { Heading, type HeadingTag } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import type { ComponentPropsWithRef, PropsWithChildren, ReactNode } from "react";

/*
 * Vencord 1.15.15 a retiré `Forms` et l'ancien `Button` de `@webpack/common` au profit
 * de `Heading`, `Paragraph` et du nouveau `Button`. Les écrans de Nebula s'en servent
 * une cinquantaine de fois : plutôt que de les réécrire tous, l'ancienne forme est
 * rebâtie ici sur les composants actuels, en un seul endroit.
 */

const Colors = {
    BRAND: "primary",
    BRAND_NEW: "primary",
    PRIMARY: "secondary",
    WHITE: "secondary",
    GREEN: "positive",
    RED: "dangerPrimary",
    TRANSPARENT: "none",
    LINK: "link",
} as const;

const Looks = {
    FILLED: "",
    OUTLINED: "",
    LINK: "link",
    BLANK: "none",
} as const;

const Sizes = {
    MIN: "min",
    TINY: "xs",
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "medium",
    ICON: "iconOnly",
} as const;

type LegacyButtonProps = Omit<ComponentPropsWithRef<"button">, "color"> & {
    color?: string;
    look?: string;
    size?: string;
    variant?: ButtonVariant;
};

function LegacyButton ({ color, look, size, variant, ...restProps }: LegacyButtonProps) {
    // `look` l'emporte quand il demande quelque chose que la couleur ne sait pas dire
    const resolved = (look === "link" || look === "none" ? look : undefined) ?? variant ?? color;
    return <VencordButton variant={resolved as ButtonVariant} size={size as ButtonSize} {...restProps} />;
}

export const Button = Object.assign(LegacyButton, { Colors, Looks, Sizes });

type TextProps = PropsWithChildren<{ className?: string; }>;

export const Forms = {
    FormTitle: ({ tag = "h5", className, children }: TextProps & { tag?: HeadingTag; }) => (
        <Heading tag={tag} className={className}>{children}</Heading>
    ),
    FormText: ({ className, children }: TextProps) => (
        <Paragraph className={className}>{children}</Paragraph>
    ),
    FormSection: ({ title, className, children }: TextProps & { title?: ReactNode; }) => (
        <section className={className}>
            {title ? <Heading tag="h5">{title}</Heading> : null}
            {children}
        </section>
    ),
};
