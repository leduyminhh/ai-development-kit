import { access, readFile } from "node:fs/promises";
import path from "node:path";
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
export async function doctorProject({ target }) {
    const errors = [];
    const agentsPath = path.join(target, "AGENTS.md");
    const agents = (await exists(agentsPath)) ? await readFile(agentsPath, "utf8") : "";
    if (!agents)
        errors.push("AGENTS.md is missing");
    if (!agents.includes(BEGIN) || !agents.includes(END)) {
        errors.push("AGENTS.md managed block is invalid");
    }
    for (const required of [
        ".ai-engineering/manifest.yaml",
        ".ai-engineering/lockfile.yaml",
        ".ai-engineering/installed-packs.yaml",
        ".ai-engineering/platform.lock",
        ".mcp.json",
    ]) {
        if (!(await exists(path.join(target, required))))
            errors.push(`${required} is missing`);
    }
    let lock = { plugins: [], providers: [] };
    if (await exists(path.join(target, ".ai-engineering", "platform.lock"))) {
        lock = await readJson(path.join(target, ".ai-engineering", "platform.lock"));
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
        codex: ".codex/agents/openai.yaml",
        claude: ".claude-plugin/plugin.json",
        cursor: ".cursor/rules/provider.json",
    };
    for (const provider of lock.providers ?? []) {
        if (!(await exists(path.join(target, adapterChecks[provider])))) {
            errors.push(`adapter files are missing for ${provider}`);
        }
    }
    if (await exists(path.join(target, ".mcp.json"))) {
        try {
            await readJson(path.join(target, ".mcp.json"));
        }
        catch {
            errors.push(".mcp.json is invalid");
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
        packs: (lock.plugins ?? []).map((item) => item.id),
        providers: lock.providers ?? [],
    };
}
