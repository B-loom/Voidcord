/* Copyright Elysia © 2025. All rights reserved */

/*
 * Compile l'APK et dépose les fichiers dans `dist/`.
 *
 *     npm run apk          — version de publication (non signée)
 *     npm run apk:debug    — version de test, installable tout de suite
 *
 * Un APK par architecture : `libnode.so` fait soixante mégaoctets, et les trois réunies
 * donneraient un fichier de deux cents. Celui qu'un téléphone veut, dans tous les cas
 * depuis 2019, est `arm64-v8a`.
 */

import { execFileSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const racine = fileURLToPath(new URL("..", import.meta.url));
const android = path.join(racine, "android");
const dist = path.join(racine, "dist");

const test = process.argv.includes("--debug");
const tache = test ? "assembleDebug" : "assembleRelease";
const gradlew = process.platform === "win32" ? ".\\gradlew.bat" : "./gradlew";

if (!existsSync(path.join(android, "nodejs-mobile", "include", "node", "node.h"))) {
    console.error("Node.js pour Android est absent. Lance d'abord : npm run mobile:deps");
    process.exit(1);
}

/*
 * Une seule architecture par défaut : chaque `libnode.so` pèse soixante mégaoctets, et
 * `arm64-v8a` est ce que tout téléphone Android vendu depuis 2019 attend. Les trois à la
 * fois : `VOIDCORD_ABI=arm64-v8a,armeabi-v7a,x86_64 npm run apk`.
 */
const architectures = process.env.VOIDCORD_ABI ?? "arm64-v8a";

console.log(`[apk] ${tache} (${architectures})…`);
/*
 * Le chemin du dépôt contient des espaces. Un `.bat` a besoin d'un interpréteur de
 * commandes, et lui passer un chemin absolu non protégé le coupe au premier espace :
 * `gradlew.bat` est donc lancé par son nom, depuis `android/`.
 */
const [commande, premiers] = process.platform === "win32"
    ? ["cmd.exe", ["/c", gradlew]]
    : [gradlew, []];
execFileSync(commande, [...premiers, tache, "--no-daemon", `-Pvoidcord.abi=${architectures}`], {
    cwd: android,
    stdio: "inherit",
});

const sortie = path.join(android, "app", "build", "outputs", "apk", test ? "debug" : "release");
mkdirSync(dist, { recursive: true });

const produits = readdirSync(sortie).filter(nom => nom.endsWith(".apk"));
if (produits.length === 0) {
    console.error(`[apk] aucun APK dans ${sortie}`);
    process.exit(1);
}

for (const nom of produits) {
    /*
     * `app-arm64-v8a-release-unsigned.apk` devient `Voidcord-android-arm64-v8a.apk`. Sans
     * découpage par architecture — une seule demandée — le nom n'en porte pas : il vient
     * alors de ce qui a été demandé, pour qu'aucun fichier ne cache à quel téléphone il
     * est destiné.
     */
    const architecture = nom.match(/app-([a-z0-9_]+(?:-v[78]a)?)-(debug|release)/)?.[1] ?? architectures.split(",")[0].trim();
    const suffixe = [architecture, test ? "debug" : null].filter(Boolean).join("-");
    const cible = path.join(dist, `Voidcord-android${suffixe ? `-${suffixe}` : ""}.apk`);
    copyFileSync(path.join(sortie, nom), cible);
    console.log(`[apk] ${path.relative(racine, cible)}`);
}

if (!test) {
    console.log(
        "\n[apk] Les APK de publication ne sont pas signés : Android refuse de les installer tels quels.\n" +
            "      Pour les signer, avec les outils du SDK :\n" +
            "        apksigner sign --ks ma-cle.jks dist/Voidcord-android-arm64-v8a.apk\n" +
            "      Pour essayer tout de suite sans clé : npm run apk:debug",
    );
}
