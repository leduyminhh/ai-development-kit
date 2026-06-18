import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
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
function probeMcpServer(entrypoint, name) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [entrypoint], {
            cwd: path.dirname(entrypoint),
            stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error(`MCP server ${name} timed out during doctor probe`));
        }, 5000);
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
            stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });
        child.on("error", (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        child.on("close", (exitCode) => {
            clearTimeout(timeout);
            if (exitCode !== 0) {
                reject(new Error(`MCP server ${name} exited ${exitCode}: ${stderr.trim()}`));
                return;
            }
            try {
                const responses = stdout
                    .trim()
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .map((line) => JSON.parse(line));
                const initialize = responses.find((item) => item.id === 1);
                const ping = responses.find((item) => item.id === 2);
                const tools = responses.find((item) => item.id === 3);
                if (!initialize?.result?.serverInfo || !ping?.result || !tools?.result?.tools) {
                    throw new Error("incomplete MCP probe response");
                }
                resolve({
                    name,
                    status: "pass",
                    toolCount: tools.result.tools.length,
                });
            }
            catch (error) {
                reject(new Error(`MCP server ${name} probe failed: ${error.message}`));
            }
        });
        for (const request of [
            {
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2025-03-26",
                    capabilities: {},
                    clientInfo: { name: "ai-engineering-doctor", version: "1.0.0" },
                },
            },
            { jsonrpc: "2.0", id: 2, method: "ping", params: {} },
            { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} },
        ]) {
            child.stdin.write(`${JSON.stringify(request)}\n`);
        }
        child.stdin.end();
    });
}
export async function doctorProject({ target, context }) {
    const errors = [];
    for (const required of [
        ".ai-engineering/manifest.yaml",
        ".ai-engineering/lockfile.yaml",
        ".ai-engineering/installed-plugins.yaml",
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
        errors.push("no plugins are installed");
    const installedPluginsPath = (await exists(path.join(target, ".ai-engineering", "installed-plugins.yaml")))
        ? path.join(target, ".ai-engineering", "installed-plugins.yaml")
        : path.join(target, ".ai-engineering", "installed-packs.yaml");
    if (await exists(installedPluginsPath)) {
        const installedPlugins = await readJson(installedPluginsPath);
        const expected = (lock.plugins ?? []).map((item) => item.id);
        const actual = (installedPlugins.plugins ?? installedPlugins.packs ?? []).map((item) => item.id);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            errors.push(`${path.basename(installedPluginsPath)} does not match platform.lock`);
        }
    }
    const adapterChecks = {
        codex: scope === "project"
            ? [".codex/agents/openai.yaml", ".codex/config.toml"]
            : [".codex/AGENTS.md", ".codex/config.toml"],
        claude: scope === "project"
            ? ["CLAUDE.md", ".claude-plugin/plugin.json", ".mcp.json"]
            : [".claude/CLAUDE.md", ".claude.json"],
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
    const parsedConfigs = {};
    for (const provider of lock.providers ?? []) {
        const check = configChecks[provider];
        if (!check || !(await exists(path.join(target, check.path))))
            continue;
        try {
            parsedConfigs[provider] = check.parse(await readFile(path.join(target, check.path), "utf8"));
        }
        catch {
            errors.push(`${check.path} is invalid`);
        }
    }
    const providerNames = {
        codex: "Codex",
        claude: "Claude",
        cursor: "Cursor",
    };
    for (const provider of lock.providers ?? []) {
        const config = parsedConfigs[provider];
        if (!config)
            continue;
        const registrations = provider === "codex" ? config.mcp_servers : config.mcpServers;
        for (const plugin of lock.plugins ?? []) {
            const expectedEntrypoint = path.join(target, ".ai-engineering", "mcp-servers", `${plugin.id}-mcp`, "src", "index.js");
            const registration = registrations?.[plugin.id];
            if (registration?.command !== "node" ||
                registration?.args?.[0] !== expectedEntrypoint) {
                errors.push(`${providerNames[provider]} registration does not match installed runtime: ${plugin.id}`);
            }
        }
    }
    for (const deprecated of [".codex-plugin", ".cursor-plugin"]) {
        if (await exists(path.join(target, deprecated))) {
            errors.push(`deprecated target plugin folder remains active: ${deprecated}`);
        }
    }
    if (errors.length > 0)
        throw new Error(errors.sort().join("\n"));
    const mcpServers = [];
    for (const plugin of lock.plugins ?? []) {
        const entrypoint = path.join(target, ".ai-engineering", "mcp-servers", `${plugin.id}-mcp`, "src", "index.js");
        if (!(await exists(entrypoint))) {
            throw new Error(`MCP entrypoint is missing: ${plugin.id}`);
        }
        mcpServers.push(await probeMcpServer(entrypoint, plugin.id));
    }
    return {
        status: "pass",
        scope,
        plugins: (lock.plugins ?? []).map((item) => item.id),
        providers: lock.providers ?? [],
        mcpServers,
        nativeChecks: (lock.providers ?? []).map((provider) => ({
            provider,
            status: "skipped",
            reason: "native IDE binary check is optional",
        })),
    };
}
