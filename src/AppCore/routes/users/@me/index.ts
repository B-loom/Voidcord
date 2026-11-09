/* Copyright Elysia © 2025. All rights reserved */

import { APIUser } from "discord-api-types/v10";
import { net } from "electron";
import { Router } from "express";
import Constants from "src/AppCore/Constants";

/**
 * Les drapeaux d'affichage que Voidcord prête au compte connecté : Nitro, badges, etc.
 *
 * Le bit 16 — « bot vérifié », la coche à côté de l'étiquette APP — en est retiré : il
 * faisait passer pour certifié n'importe quel bot connecté ici. Celui que Discord
 * renvoie vraiment est conservé, pour qu'un bot réellement vérifié garde sa coche.
 */
const VERIFIED_BOT = 1 << 16;
const VOIDCORD_FLAGS = 476111 & ~VERIFIED_BOT;

function voidcordFlags (user: APIUser) {
    const reel = ((user.flags ?? user.public_flags ?? 0) as number) & VERIFIED_BOT;
    return VOIDCORD_FLAGS | reel;
}

const app = Router({ mergeParams: true });

app.get("/", async (req, res) => {
    try {
        const r = await net.fetch("https://canary.discord.com/api/v9/users/@me", {
            headers: {
                authorization: req.headers.authorization || "",
                "user-agent": Constants.UserAgentDiscordBot,
            },
        });

        const data = await r.json();

        if (r.ok) {
            const user = data as APIUser;
            /*
             * Un bot n'a ni Nitro, ni téléphone, ni adresse : on les lui invente, sans quoi
             * Discord lui ferme la moitié du client.
             *
             * Un compte utilisateur, lui, a les siens, et les écraser lui faisait du mal :
             * « premium_type: 1 » est Nitro Classic, donc un compte avec le vrai Nitro se
             * retrouvait rétrogradé et ne pouvait plus envoyer d'autocollants. Ses
             * achats, eux, étaient annoncés comme possédés alors qu'ils ne l'étaient pas.
             * Seuls les badges de Voidcord lui sont ajoutés.
             */
            const estBot = Boolean(user.bot);
            res.status(200).send({
                ...user,
                flags: voidcordFlags(user),
                public_flags: voidcordFlags(user),
                ...(estBot
                    ? {
                        premium: true,
                        // 2 = Nitro complet, comme ce que le client annonce déjà côté plugin
                        premium_type: 2,
                        mfa_enabled: 1,
                        phone: "33550336",
                        verified: true,
                        nsfw_allowed: true,
                        email: `${user.id}@cyrene.moe`,
                        purchased_flags: 3,
                    }
                    : {}),
            });
        } else {
            res.status(r.status).send(data);
        }
    } catch (err) {
        console.error("Error fetching /users/@me:", err);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

export default app;
