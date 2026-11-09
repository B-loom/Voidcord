/* Copyright Elysia © 2025 */

import { execFileSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

import versions from "./build-dependencies.json";

const root = process.cwd();
const vencordDir = path.join(root, "Vencord");
const pluginDir = path.join(vencordDir, "src", "userplugins", "botClient");

function run (command: string, args: string[], cwd = root) {
    execFileSync(command, args, { cwd, stdio: "inherit" });
}

function prepareCheckout (directory: string, repository: string, revision: string) {
    if (!existsSync(directory)) {
        run("git", ["clone", "--filter=blob:none", repository, directory]);
    } else if (!existsSync(path.join(directory, ".git"))) {
        throw new Error(directory + " exists but is not a Git checkout.");
    }

    const current = execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
    if (current === revision) return;

    /*
     * Le clone est jetable : le calque Voidcord est recopié par-dessus juste après, donc on
     * peut le ramener de force sur la révision épinglée au lieu de s’arrêter. Le calque
     * du tour précédent est encore là, sous forme de fichiers modifiés : sans ce
     * `reset` d’abord, `checkout` refuse de les écraser.
     */
    run("git", ["reset", "--hard", "HEAD"], directory);
    run("git", ["fetch", "--filter=blob:none", "origin"], directory);
    run("git", ["checkout", "--detach", revision], directory);
    run("git", ["reset", "--hard", revision], directory);
}

prepareCheckout(vencordDir, "https://github.com/Vendicated/Vencord.git", versions.vencord);
prepareCheckout(pluginDir, "https://github.com/aiko-chan-ai/VencordDBCPlugin.git", versions.botClientPlugin);
run(process.execPath, [path.join(root, "node_modules", "pnpm", "bin", "pnpm.cjs"), "install", "--frozen-lockfile"], vencordDir);
