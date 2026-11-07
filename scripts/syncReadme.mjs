/* Copyright Elysia © 2025. All rights reserved */

/*
 * The Documentation page inside the client shows the README. Rather than keep the same
 * text in two places and let them drift, README.md is the original and this copies it
 * into the bundle before every build.
 *
 * It does so twice: the French text into docs.ts, and its English translation into
 * docs.en.ts. Nebula's language picks between the two when the page is drawn, so an
 * English reader must not be left with a page that stopped following README.en.md.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/*
 * The documentation is written into the versioned source, not into the clone: the
 * Nebula overlay is copied over the clone right after this runs, and would otherwise
 * put the previous text back.
 */
const components = "nebula/vencord/src/userplugins/botClient/components";

// The text lands inside a template literal, so the three things that would break it escape
function escape (text) {
    return text
        .split("\\").join("\\\\")
        .split("`").join("\\`")
        .split("${").join("\\${");
}

/**
 * Copy one Markdown file into one exported constant, leaving the rest of the file alone.
 * `nextName` is the constant that follows it, and marks where the text ends.
 */
function sync (sourcePath, targetPath, name, nextName) {
    const text = fs.readFileSync(sourcePath, "utf8");
    const file = fs.readFileSync(targetPath, "utf8");

    const start = file.indexOf(`export const ${name} = \``);
    const end = file.indexOf(`export const ${nextName} = \``);
    if (start < 0 || end < 0) {
        throw new Error(`${path.basename(targetPath)} no longer exposes ${name} and ${nextName} the expected way`);
    }

    const next = `${file.slice(0, start)}export const ${name} = \`${escape(text)}\`;\n\n${file.slice(end)}`;
    if (next === file) return false;

    fs.writeFileSync(targetPath, next);
    return true;
}

const changed = [
    sync(
        path.join(root, "README.md"),
        path.join(root, components, "docs.ts"),
        "README",
        "CHANGELOG",
    ),
    sync(
        path.join(root, "README.en.md"),
        path.join(root, components, "docs.en.ts"),
        "README_EN",
        "CHANGELOG_EN",
    ),
].some(Boolean);

console.log(changed
    ? "Documentation synchronisée depuis README.md et README.en.md"
    : "Documentation déjà à jour");
