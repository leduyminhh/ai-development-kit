import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadPlatform } from "./contracts.mjs";
import { writeJsonAtomic } from "./io.mjs";
const BEGIN = "<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->";
const END = "<!-- AI-ENGINEERING:END AGENTS_BASELINE -->";
async function readIfExists(pathname) {
    try {
        return await readFile(pathname, "utf8");
    }
    catch (error) {
        if (error.code === "ENOENT")
            return null;
        throw error;
    }
}
export function mergeManagedBlock(existing, baseline, relativePath) {
    const start = existing.indexOf(BEGIN);
    const end = existing.indexOf(END);
    if (start === -1 && end === -1) {
        return `${existing.trimEnd()}\n\n${baseline.trim()}\n`;
    }
    if (start === -1 || end === -1 || end < start) {
        throw new Error(`${relativePath} contains an invalid AI Engineering managed block`);
    }
    return `${existing.slice(0, start)}${baseline.trim()}${existing.slice(end + END.length)}`;
}
export async function prepareInstructionFileContent({ root, target, relativePath, }) {
    const template = await readFile(path.join(root, "core", "agents", "AGENTS.template.md"), "utf8");
    const baseline = await readFile(path.join(root, "core", "agents", "AGENTS.baseline.md"), "utf8");
    const existing = await readIfExists(path.join(target, relativePath));
    return existing === null
        ? template
        : mergeManagedBlock(existing, baseline, relativePath);
}
export async function initializeInstructionFile({ root, target, relativePath, }) {
    const instructionPath = path.join(target, relativePath);
    const stateRoot = path.join(target, ".ai-engineering");
    const backupPath = path.join(stateRoot, "backups", relativePath);
    const template = await readFile(path.join(root, "core", "agents", "AGENTS.template.md"), "utf8");
    const baseline = await readFile(path.join(root, "core", "agents", "AGENTS.baseline.md"), "utf8");
    const existing = await readIfExists(instructionPath);
    await mkdir(path.dirname(instructionPath), { recursive: true });
    if (existing === null) {
        await writeFile(instructionPath, template, "utf8");
    }
    else {
        await mkdir(path.dirname(backupPath), { recursive: true });
        await copyFile(instructionPath, backupPath);
        await writeFile(instructionPath, mergeManagedBlock(existing, baseline, relativePath), "utf8");
    }
}
export async function initializeProject({ root, target }) {
    const platform = await loadPlatform(root);
    const stateRoot = path.join(target, ".ai-engineering");
    await initializeInstructionFile({
        root,
        target,
        relativePath: "AGENTS.md",
    });
    await writeJsonAtomic(path.join(stateRoot, "manifest.yaml"), {
        schemaVersion: 1,
        platform: platform.product.name,
        version: platform.product.version,
        initializedAt: new Date().toISOString(),
    });
    if ((await readIfExists(path.join(stateRoot, "lockfile.yaml"))) === null) {
        await writeJsonAtomic(path.join(stateRoot, "lockfile.yaml"), {
            schemaVersion: 1,
            platformVersion: platform.product.version,
            plugins: [],
        });
    }
    if ((await readIfExists(path.join(stateRoot, "installed-plugins.yaml"))) === null) {
        await writeJsonAtomic(path.join(stateRoot, "installed-plugins.yaml"), {
            schemaVersion: 1,
            plugins: [],
        });
    }
    return { status: "pass", target };
}
