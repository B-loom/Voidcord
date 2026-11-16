/* Copyright Elysia © 2025. All rights reserved */

/*
 * Récupère le Node.js d'Android.
 *
 * Il n'existe pas de Node officiel pour Android : celui-ci vient de nodejs-mobile, qui
 * publie `libnode.so` compilée pour chaque architecture, avec ses en-têtes. L'archive
 * fait cinquante-sept mégaoctets et ne change qu'avec la version de Node : elle est donc
 * téléchargée une fois, dans `android/nodejs-mobile/`, et exclue de git.
 *
 *     node scripts/fetchNodeMobile.mjs
 *
 * `android/app/build.gradle.kts` lit ce dossier. S'il manque, la compilation s'arrête
 * avec le rappel de cette commande.
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";

const VERSION = "v18.20.4";
const ARCHIVE = `nodejs-mobile-${VERSION}-android.zip`;
const URL_ARCHIVE = `https://github.com/nodejs-mobile/nodejs-mobile/releases/download/${VERSION}/${ARCHIVE}`;

const racine = fileURLToPath(new URL("..", import.meta.url));
const destination = path.join(racine, "android", "nodejs-mobile");
const temoin = path.join(destination, "VERSION");

if (existsSync(temoin) && readFileSync(temoin, "utf8").trim() === VERSION) {
    console.log(`[node-mobile] déjà présent en ${VERSION}`);
    process.exit(0);
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });

const archive = path.join(destination, ARCHIVE);
console.log(`[node-mobile] téléchargement de ${ARCHIVE} (57 Mo)…`);
const reponse = await fetch(URL_ARCHIVE, { redirect: "follow" });
if (!reponse.ok || !reponse.body) throw new Error(`Téléchargement impossible : HTTP ${reponse.status}`);
await pipeline(Readable.fromWeb(reponse.body), createWriteStream(archive));

console.log("[node-mobile] décompression…");
/*
 * Pas de dépendance npm pour une archive qu'on ouvre une fois : le système sait le faire.
 * Sur Windows, c'est `tar` de System32 — bsdtar, qui lit les zip ; celui de Git Bash est
 * un GNU tar, qui ne les lit pas, d'où le chemin complet. Partout ailleurs, `unzip`.
 */
function decompresser () {
    if (process.platform === "win32") {
        const bsdtar = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
        execFileSync(bsdtar, ["-xf", archive, "-C", destination], { stdio: "inherit" });
        return;
    }
    execFileSync("unzip", ["-q", archive, "-d", destination], { stdio: "inherit" });
}
decompresser();
rmSync(archive);

for (const attendu of ["bin/arm64-v8a/libnode.so", "include/node/node.h"]) {
    if (!existsSync(path.join(destination, attendu))) {
        throw new Error(`L'archive ne contient pas ${attendu} : la version a changé de forme.`);
    }
}

writeFileSync(temoin, `${VERSION}\n`, "utf8");
console.log(`[node-mobile] prêt dans android/nodejs-mobile (${VERSION})`);
