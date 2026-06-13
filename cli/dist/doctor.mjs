import { access, readFile } from "node:fs/promises";
import path from "node:path";
import * as TOML from "@iarna/toml";
const BEGIN = "<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->";
const END = "<!-- AI-ENGINEERING:END AGENTS_BASELINE -->";
async function exists(pathname) {
    try {
        await access(pathname);
        return true;
    }
    catch {
        return false;
    }
}
async function readJson(pathname) {
    return JSON.parse(await readFile(pathname, "utf8"));
}
export async function doctorProject({ target, context }) {
    const errors = [];
    for (const required of [
        ".ai-engineering/manifest.yaml",
        ".ai-engineering/lockfile.yaml",
        ".ai-engineering/installed-packs.yaml",
        ".ai-engineering/platform.lock",
    ]) {
        if (required === ".ai-engineering/manifest.yaml" &&
            context?.scope === "global") {
            continue;
        }
        if (!(await exists(path.join(target, required)))) {
            errors.push(`${required} is missing`);
        }
    }
    let lock = { plugins: [], providers: [] };
    if (await exists(path.join(target, ".ai-engineering", "platform.lock"))) {
        lock = await readJson(path.join(target, ".ai-engineering", "platform.lock"));
    }
    const scope = context?.scope ?? lock.scope ?? "project";
    if (scope === "project") {
        const agentsPath = path.join(target, "AGENTS.md");
        const agents = (await exists(agentsPath))
            ? await readFile(agentsPath, "utf8")
            : "";
        if (!agents)
            errors.push("AGENTS.md is missing");
        if (!agents.includes(BEGIN) || !agents.includes(END)) {
            errors.push("AGENTS.md managed block is invalid");
        }
    }
    if ((lock.plugins ?? []).length === 0)
        errors.push("no capability packs are installed");
    if (await exists(path.join(target, ".ai-engineering", "installed-packs.yaml"))) {
        const installedPacks = await readJson(path.join(target, ".ai-engineering", "installed-packs.yaml"));
        const expected = (lock.plugins ?? []).map((item) => item.id);
        const actual = (installedPacks.packs ?? []).map((item) => item.id);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            errors.push("installed-packs.yaml does not match platform.lock");
        }
    }
    const adapterChecks = {
        codex: scope === "project"
            ? [".codex/agents/openai.yaml", ".codex/config.toml"]
            : [".codex/config.toml"],
        claude: scope === "project"
            ? [".claude-plugin/plugin.json", ".mcp.json"]
            : [".claude.json"],
        cursor: scope === "project"
            ? [".cursor/rules/provider.json", ".cursor/mcp.json"]
            : [".cursor/mcp.json"],
    };
    for (const provider of lock.providers ?? []) {
        for (const relativePath of adapterChecks[provider] ?? []) {
            if (!(await exists(path.join(target, relativePath)))) {
                errors.push(`adapter files are missing for ${provider}: ${relativePath}`);
            }
        }
    }
    const configChecks = {
        codex: {
            path: ".codex/config.toml",
            parse: (text) => TOML.parse(text),
        },
        claude: {
            path: scope === "global" ? ".claude.json" : ".mcp.json",
            parse: JSON.parse,
        },
        cursor: { path: ".cursor/mcp.json", parse: JSON.parse },
    };
    for (const provider of lock.providers ?? []) {
        const check = configChecks[provider];
        if (!check || !(await exists(path.join(target, check.path))))
            continue;
        try {
            check.parse(await readFile(path.join(target, check.path), "utf8"));
        }
        catch {
            errors.push(`${check.path} is invalid`);
        }
    }
    for (const deprecated of [".codex-plugin", ".cursor-plugin"]) {
        if (await exists(path.join(target, deprecated))) {
            errors.push(`deprecated target plugin folder remains active: ${deprecated}`);
        }
    }
    if (errors.length > 0)
        throw new Error(errors.sort().join("\n"));
    return {
        status: "pass",
        scope,
        packs: (lock.plugins ?? []).map((item) => item.id),
        providers: lock.providers ?? [],
    };
}
