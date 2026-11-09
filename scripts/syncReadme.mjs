/* Copyright Elysia © 2025. All rights reserved */

/*
 * La documentation existe une fois par langue, et trois endroits la montrent : la page
 * « Documentation » du client, le site, et la page d'accueil du dépôt. Plutôt que de
 * recopier le même texte à la main et de le laisser dériver, les originaux sont
 * `readme.fr.md` et `readme.en.md`, et ce script les porte partout.
 *
 * - `readme.fr.md` → la constante README de docs.ts, lue par le client en français ;
 * - `readme.en.md` → README_EN de docs.en.ts, lue par le client en anglais ;
 * - les deux → `readme.md`, la page que GitHub affiche, anglais d'abord puis français.
 *
 * `readme.md` est donc un fichier produit : le modifier à la main ne sert à rien, il est
 * réécrit à la compilation suivante.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/*
 * La documentation est écrite dans les sources versionnées, pas dans le clone : le
 * calque Voidcord est recopié sur le clone juste après, et y remettrait le texte d'avant.
 */
const composants = "voidcord/vencord/src/userplugins/botClient/components";

const FRANCAIS = path.join(root, "readme.fr.md");
const ANGLAIS = path.join(root, "readme.en.md");

// Le texte atterrit dans un littéral gabarit : les trois caractères qui le casseraient s'échappent
function echapper (texte) {
    return texte
        .split("\\").join("\\\\")
        .split("`").join("\\`")
        .split("${").join("\\${");
}

function ecrireSiChange (chemin, contenu) {
    if (fs.existsSync(chemin) && fs.readFileSync(chemin, "utf8") === contenu) return false;
    fs.writeFileSync(chemin, contenu);
    return true;
}

/**
 * Recopie un fichier Markdown dans une constante exportée, sans toucher au reste.
 * `suivante` est la constante qui vient après, et marque la fin du texte.
 */
function porter (source, cible, nom, suivante) {
    const texte = fs.readFileSync(source, "utf8");
    const fichier = fs.readFileSync(cible, "utf8");

    const debut = fichier.indexOf(`export const ${nom} = \``);
    const fin = fichier.indexOf(`export const ${suivante} = \``);
    if (debut < 0 || fin < 0) {
        throw new Error(`${path.basename(cible)} n'expose plus ${nom} et ${suivante} comme attendu`);
    }

    const prochain = `${fichier.slice(0, debut)}export const ${nom} = \`${echapper(texte)}\`;\n\n${fichier.slice(fin)}`;
    return ecrireSiChange(cible, prochain);
}

/*
 * La page d'accueil du dépôt est lue par des gens qui ne parlent pas forcément français,
 * et GitHub n'affiche qu'un README : l'anglais passe donc devant, le français suit sous
 * un trait. Un sommaire en tête évite d'avoir à faire défiler pour trouver sa langue.
 */
function readmeDuDepot () {
    const anglais = fs.readFileSync(ANGLAIS, "utf8").trimEnd();
    const francais = fs.readFileSync(FRANCAIS, "utf8").trimEnd();

    return [
        "<!--",
        "  Fichier produit : readme.en.md et readme.fr.md sont les originaux,",
        "  scripts/syncReadme.mjs les réunit ici à chaque compilation.",
        "  Toute modification faite directement dans ce fichier sera perdue.",
        "-->",
        "",
        "**English below · [Version française](#francais)**",
        "",
        anglais,
        "",
        "---",
        "",
        '<a name="francais"></a>',
        "",
        francais,
        "",
    ].join("\n");
}

const change = [
    porter(FRANCAIS, path.join(root, composants, "docs.ts"), "README", "CHANGELOG"),
    porter(ANGLAIS, path.join(root, composants, "docs.en.ts"), "README_EN", "CHANGELOG_EN"),
    ecrireSiChange(path.join(root, "readme.md"), readmeDuDepot()),
].some(Boolean);

console.log(change
    ? "Documentation synchronisée depuis readme.fr.md et readme.en.md"
    : "Documentation déjà à jour");
