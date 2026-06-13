import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PlatformError } from "./errors.mjs";
const PROVIDERS = ["codex", "claude", "cursor"];
const PLUGIN_KEYS = new Set([
    "apiVersion",
    "kind",
    "metadata",
    "compatibility",
    "dependencies",
    "assets",
    "install",
    "id",
    "name",
    "version",
    "description",
    "category",
    "triggers",
    "commands",
    "skills",
    "depends_on",
]);
async function readJson(pathname) {
    try {
        return JSON.parse(await readFile(pathname, "utf8"));
    }
    catch (error) {
        throw new PlatformError(`Cannot read JSON contract ${pathname}: ${error.message}`, {
            code: "AI_ENGINEERING_INVALID_CONTRACT",
        });
    }
}
function parseSectionList(markdown, heading) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = markdown.match(new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
    if (!match) {
        return [];
    }
    return [...match[1].matchAll(/^- (.+)$/gm)].map((item) => item[1].trim());
}
function parseSectionText(markdown, heading) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = markdown.match(new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
    return match?.[1].trim() ?? "";
}
export async function loadPlatform(root) {
    const value = await readJson(path.join(root, "ai-engineering.config.yaml"));
    if (value.apiVersion !== "ai-engineering.dev/v1alpha1") {
        throw new PlatformError("unsupported platform apiVersion", {
            code: "AI_ENGINEERING_INVALID_CONTRACT",
        });
    }
    return value;
}
export async function loadPlugins(root) {
    const plugins = new Map();
    const packsRoot = path.join(root, "packs");
    const entries = await readdir(packsRoot, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isDirectory())) {
        const packRoot = path.join(packsRoot, entry.name);
        const plugin = await readJson(path.join(packRoot, "pack.yaml"));
        const pluginId = plugin.metadata?.id;
        const unknownKeys = Object.keys(plugin).filter((key) => !PLUGIN_KEYS.has(key));
        if (unknownKeys.length > 0) {
            throw new PlatformError(`pack ${pluginId} has unknown keys: ${unknownKeys.sort().join(", ")}`, { code: "AI_ENGINEERING_INVALID_CONTRACT" });
        }
        plugins.set(pluginId, plugin);
    }
    return new Map([...plugins].sort(([left], [right]) => left.localeCompare(right)));
}
export async function findSkillPath(root, skillId) {
    for (const pack of await readdir(path.join(root, "packs"))) {
        const candidate = path.join(root, "packs", pack, "skills", skillId);
        try {
            await readFile(path.join(candidate, "SKILL.md"), "utf8");
            return candidate;
        }
        catch {
            // Continue until the owning capability pack is found.
        }
    }
    return undefined;
}
export async function findCommandPath(root, commandId) {
    for (const pack of await readdir(path.join(root, "packs"))) {
        const candidate = path.join(root, "packs", pack, "commands", `${commandId}.md`);
        try {
            await readFile(candidate, "utf8");
            return candidate;
        }
        catch {
            // Continue until the owning capability pack is found.
        }
    }
    return undefined;
}
export async function loadCanonicalCommand(pathname) {
    let markdown;
    try {
        markdown = await readFile(pathname, "utf8");
    }
    catch {
        throw new PlatformError(`missing command ${pathname ? path.basename(pathname, ".md") : "unknown"}`, {
            code: "AI_ENGINEERING_INVALID_COMMAND",
        });
    }
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) {
        throw new PlatformError(`command ${pathname} has invalid frontmatter`, {
            code: "AI_ENGINEERING_INVALID_COMMAND",
        });
    }
    const metadata = Object.fromEntries(match[1]
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
        const separator = line.indexOf(":");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }));
    const body = markdown.slice(match[0].length);
    return {
        ...metadata,
        intent: parseSectionText(body, "Intent"),
        inputs: parseSectionList(body, "Inputs"),
        requiredSkills: parseSectionList(body, "Required Skills"),
        steps: [...parseSectionText(body, "Steps").matchAll(/^\d+\. (.+)$/gm)].map((item) => item[1].trim()),
        outputContract: parseSectionList(body, "Output Contract"),
        markdown,
    };
}
function detectCycles(plugins, errors) {
    const visiting = new Set();
    const visited = new Set();
    function visit(pluginId) {
        if (visiting.has(pluginId)) {
            errors.push(`dependency cycle detected at ${pluginId}`);
            return;
        }
        if (visited.has(pluginId) || !plugins.has(pluginId)) {
            return;
        }
        visiting.add(pluginId);
        for (const dependency of plugins.get(pluginId).dependencies?.required ?? []) {
            visit(dependency);
        }
        visiting.delete(pluginId);
        visited.add(pluginId);
    }
    for (const pluginId of plugins.keys()) {
        visit(pluginId);
    }
}
async function exists(pathname) {
    try {
        await access(pathname);
        return true;
    }
    catch {
        return false;
    }
}
function sortedUnique(values) {
    return [...new Set(values ?? [])].sort();
}
function sameValues(left, right) {
    return JSON.stringify(sortedUnique(left)) === JSON.stringify(sortedUnique(right));
}
function skillIdFromPackPath(skill) {
    return path.basename(path.dirname(skill.path));
}
export async function loadSkillRegistry(root) {
    const registry = await readJson(path.join(root, "core", "routing", "skill-registry.yaml"));
    return {
        ...registry,
        packs: Object.fromEntries(Object.entries(registry.packs ?? {})
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([packId, skillIds]) => [packId, sortedUnique(skillIds)])),
    };
}
async function loadOwnedSkillFolders(root) {
    const result = new Map();
    for (const pack of await readdir(path.join(root, "packs"))) {
        const skillRoot = path.join(root, "packs", pack, "skills");
        try {
            const entries = await readdir(skillRoot, { withFileTypes: true });
            const skills = [];
            for (const entry of entries) {
                if (entry.isDirectory() &&
                    (await exists(path.join(skillRoot, entry.name, "SKILL.md")))) {
                    skills.push(entry.name);
                }
            }
            result.set(pack, skills.sort());
        }
        catch {
            result.set(pack, []);
        }
    }
    return result;
}
export function validateStructuredToolContract(tool) {
    if (typeof tool !== "object" || tool === null || Array.isArray(tool)) {
        return ["MCP tool must use a structured definition"];
    }
    const errors = [];
    if (typeof tool.name !== "string" || tool.name === "") {
        errors.push("MCP tool name is required");
    }
    if (typeof tool.description !== "string" || tool.description === "") {
        errors.push(`MCP tool ${tool.name ?? "unknown"} description is required`);
    }
    if (typeof tool.inputSchema !== "object" || tool.inputSchema === null) {
        errors.push(`MCP tool ${tool.name ?? "unknown"} inputSchema is required`);
    }
    if (typeof tool.outputSchema !== "object" || tool.outputSchema === null) {
        errors.push(`MCP tool ${tool.name ?? "unknown"} outputSchema is required`);
    }
    for (const annotation of [
        "readOnlyHint",
        "destructiveHint",
        "idempotentHint",
        "openWorldHint",
    ]) {
        if (typeof tool.annotations?.[annotation] !== "boolean") {
            errors.push(`MCP tool ${tool.name ?? "unknown"} annotation ${annotation} must be boolean`);
        }
    }
    return errors;
}
async function validateRoutingAndMcp(root, plugins, errors, ownedSkillsByPack) {
    const routingRoot = path.join(root, "core", "routing");
    const intentRouter = await readJson(path.join(routingRoot, "intent-router.yaml"));
    const commandRegistry = await readJson(path.join(routingRoot, "command-registry.yaml"));
    const skillRegistry = await loadSkillRegistry(root);
    const mcpTools = new Set();
    const mcpRoot = path.join(root, "mcp-servers");
    const servers = (await readdir(mcpRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
    for (const server of servers) {
        const contract = await readJson(path.join(mcpRoot, server.name, "mcp.json"));
        for (const required of [
            "README.md",
            "package.json",
            "mcp.json",
            "src/index.js",
            "src/server.js",
            "src/tools",
            "src/resources",
            "src/prompts",
        ]) {
            if (!(await exists(path.join(mcpRoot, server.name, required)))) {
                errors.push(`MCP server ${server.name} is missing ${required}`);
            }
        }
        for (const tool of contract.tools ?? []) {
            const contractErrors = validateStructuredToolContract(tool);
            for (const error of contractErrors) {
                errors.push(`MCP server ${server.name}: ${error}`);
            }
            if (contractErrors.length === 0)
                mcpTools.add(tool.name);
        }
    }
    for (const route of intentRouter.routes ?? []) {
        if (!plugins.has(route.pack)) {
            errors.push(`intent route references unknown pack ${route.pack}`);
        }
    }
    for (const [packId, registeredSkills] of Object.entries(skillRegistry.packs ?? {})) {
        if (!plugins.has(packId)) {
            errors.push(`skill registry references unknown pack ${packId}`);
            continue;
        }
        const ownedSkills = ownedSkillsByPack.get(packId) ?? [];
        const canonicalSkills = (plugins.get(packId)?.skills ?? []).map(skillIdFromPackPath);
        if (!sameValues(registeredSkills, ownedSkills)) {
            errors.push(`skill registry for pack ${packId} must match skill folders: expected ${ownedSkills.join(", ")}, got ${registeredSkills.join(", ")}`);
        }
        if (!sameValues(registeredSkills, canonicalSkills)) {
            errors.push(`pack ${packId} canonical skills must match skill registry: expected ${registeredSkills.join(", ")}, got ${canonicalSkills.sort().join(", ")}`);
        }
        for (const skill of registeredSkills) {
            if (!plugins.get(packId)?.assets?.skills?.includes(skill)) {
                errors.push(`skill registry mismatch: ${packId}/${skill}`);
            }
        }
    }
    for (const packId of plugins.keys()) {
        if (!Object.hasOwn(skillRegistry.packs ?? {}, packId)) {
            errors.push(`skill registry is missing pack ${packId}`);
        }
    }
    for (const command of commandRegistry.commands ?? []) {
        if (!plugins.has(command.pack)) {
            errors.push(`command registry references unknown pack ${command.pack}`);
        }
        if (!mcpTools.has(command.id)) {
            errors.push(`command ${command.id} references missing MCP tool`);
        }
        if (!(await exists(path.join(root, "packs", command.pack, command.file)))) {
            errors.push(`command registry references missing file ${command.pack}/${command.file}`);
        }
    }
    for (const [packId, pack] of plugins) {
        for (const command of pack.commands ?? []) {
            if (!command.id || !command.file || !command.mcp_tool) {
                errors.push(`pack ${packId} has invalid command metadata`);
                continue;
            }
            if (!mcpTools.has(command.mcp_tool)) {
                errors.push(`pack ${packId} command ${command.id} references missing MCP tool ${command.mcp_tool}`);
            }
            if (!(await exists(path.join(root, "packs", packId, command.file)))) {
                errors.push(`pack ${packId} command ${command.id} references missing file`);
            }
        }
        for (const skill of pack.skills ?? []) {
            if (!skill.id || !skill.path) {
                errors.push(`pack ${packId} has invalid skill metadata`);
            }
            else if (!(await exists(path.join(root, "packs", packId, skill.path)))) {
                errors.push(`pack ${packId} skill ${skill.id} references missing file`);
            }
        }
    }
    return servers.length;
}
export async function validateRepository(root) {
    const platform = await loadPlatform(root);
    const plugins = await loadPlugins(root);
    const ownedSkillsByPack = await loadOwnedSkillFolders(root);
    const skills = new Set([...ownedSkillsByPack.values()].flat());
    const agents = new Set((await readdir(path.join(root, "adapters", "codex", "agents"), {
        withFileTypes: true,
    }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".toml"))
        .map((entry) => path.basename(entry.name, ".toml")));
    const errors = [];
    const commandOwners = new Map();
    if (platform.product?.name !== "ai-engineering-platform") {
        errors.push("platform product name must be ai-engineering-platform");
    }
    if (platform.product?.cli !== "ai-engineering") {
        errors.push("platform CLI name must be ai-engineering");
    }
    const enabledPacks = [...(platform.packs?.enabled ?? [])].sort();
    if (JSON.stringify(enabledPacks) !== JSON.stringify([...plugins.keys()].sort())) {
        errors.push("configured pack ids must match canonical packs");
    }
    for (const required of [
        "core/agents/AGENTS.template.md",
        "core/agents/AGENTS.baseline.md",
        "docs/migration/legacy-review-matrix.md",
    ]) {
        if (!(await exists(path.join(root, required)))) {
            errors.push(`missing required migration artifact ${required}`);
        }
    }
    for (const deprecated of [
        ".claude-plugin",
        ".codex-plugin",
        ".cursor-plugin",
        "skills",
        "platform",
        "registry",
        "schemas",
        "scripts",
        "reports",
        "references",
    ]) {
        if (await exists(path.join(root, deprecated))) {
            errors.push(`deprecated root flow remains active: ${deprecated}`);
        }
    }
    for (const [pluginId, plugin] of plugins) {
        for (const required of [
            "README.md",
            "pack.yaml",
            "commands",
            "skills",
            "templates",
            "workflows",
            "schemas",
        ]) {
            if (!(await exists(path.join(root, "packs", pluginId, required)))) {
                errors.push(`pack ${pluginId} is missing ${required}`);
            }
        }
        if (plugin.apiVersion !== "ai-engineering.dev/v1alpha1") {
            errors.push(`unsupported plugin apiVersion: ${pluginId}`);
        }
        if (plugin.id !== pluginId ||
            plugin.name !== plugin.metadata?.name ||
            plugin.version !== plugin.metadata?.version ||
            plugin.category !== "capability-pack") {
            errors.push(`pack ${pluginId} canonical metadata is invalid`);
        }
        if ((plugin.triggers?.keywords ?? []).length === 0) {
            errors.push(`pack ${pluginId} must declare trigger keywords`);
        }
        if ((plugin.commands ?? []).length === 0) {
            errors.push(`pack ${pluginId} must declare canonical commands`);
        }
        if ((plugin.skills ?? []).length === 0) {
            errors.push(`pack ${pluginId} must declare canonical skills`);
        }
        if (plugin.kind !== "CapabilityPack") {
            errors.push(`invalid pack kind: ${pluginId}`);
        }
        if (plugin.metadata?.id !== pluginId) {
            errors.push(`plugin id must match directory: ${pluginId}`);
        }
        if (plugin.metadata?.version !== platform.product?.version) {
            errors.push(`plugin version must match platform version: ${pluginId}`);
        }
        for (const dependency of [
            ...(plugin.dependencies?.required ?? []),
            ...(plugin.dependencies?.optional ?? []),
        ]) {
            if (!plugins.has(dependency)) {
                errors.push(`plugin ${pluginId} references unknown dependency ${dependency}`);
            }
        }
        for (const skill of plugin.assets?.skills ?? []) {
            if (!skills.has(skill)) {
                errors.push(`plugin ${pluginId} references unknown skill ${skill}`);
            }
        }
        for (const agent of plugin.assets?.agents ?? []) {
            if (!agents.has(agent)) {
                errors.push(`plugin ${pluginId} references unknown agent ${agent}`);
            }
        }
        if ((plugin.assets?.skills ?? []).length === 0) {
            errors.push(`plugin ${pluginId} must declare at least one skill`);
        }
        if ((plugin.assets?.commands ?? []).length === 0) {
            errors.push(`plugin ${pluginId} must declare at least one command`);
        }
        for (const commandId of plugin.assets?.commands ?? []) {
            let command;
            try {
                const commandPath = await findCommandPath(root, commandId);
                if (!commandPath) {
                    errors.push(`missing command ${commandId}`);
                    continue;
                }
                command = await loadCanonicalCommand(commandPath);
            }
            catch (error) {
                errors.push(error.message);
                continue;
            }
            if (command.id !== commandId) {
                errors.push(`command id mismatch: ${pluginId}/${commandId}`);
            }
            if (commandOwners.has(command.id)) {
                errors.push(`duplicate command id ${command.id}: ${commandOwners.get(command.id)}, ${pluginId}`);
            }
            commandOwners.set(command.id, pluginId);
            for (const skill of command.requiredSkills) {
                if (!(plugin.assets?.skills ?? []).includes(skill)) {
                    errors.push(`command ${commandId} references undeclared skill ${skill}`);
                }
            }
            if (/[.]((claude|cursor|codex)(-plugin)?)[/\\]/i.test(command.markdown)) {
                errors.push(`command ${commandId} contains provider-specific path`);
            }
            for (const heading of [
                "intent",
                "inputs",
                "requiredSkills",
                "steps",
                "outputContract",
            ]) {
                if (command[heading].length === 0) {
                    errors.push(`command ${commandId} has empty ${heading}`);
                }
            }
        }
    }
    detectCycles(plugins, errors);
    const mcpServerCount = await validateRoutingAndMcp(root, plugins, errors, ownedSkillsByPack);
    for (const required of [
        "cli/package.json",
        "cli/tsconfig.json",
        "cli/src/index.ts",
        "cli/src/cli.mjs",
        "cli/test",
        "cli/scripts/bin/install-hooks.ps1",
        "cli/scripts/bin/hook-doctor.ps1",
        "cli/scripts/bin/hook-service.ps1",
    ]) {
        if (!(await exists(path.join(root, required)))) {
            errors.push(`missing CLI module ${required}`);
        }
    }
    if (errors.length > 0) {
        throw new PlatformError(errors.sort().join("\n"), {
            code: "AI_ENGINEERING_INVALID_REPOSITORY",
            details: errors.sort(),
        });
    }
    return {
        status: "pass",
        pluginCount: plugins.size,
        providerCount: PROVIDERS.length,
        mcpServerCount,
    };
}
export async function validateArtifactManifest(value) {
    if (value?.apiVersion !== "ai-engineering.dev/v1alpha1" ||
        value?.kind !== "PluginArtifact" ||
        !value?.metadata?.id ||
        !value?.metadata?.version) {
        throw new PlatformError("invalid plugin artifact manifest", {
            code: "AI_ENGINEERING_INVALID_ARTIFACT",
        });
    }
    return value;
}
