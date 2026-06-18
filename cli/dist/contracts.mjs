import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadPluginCommands, } from "./command-contracts.mjs";
import { PlatformError } from "./errors.mjs";
export { loadCanonicalCommand } from "./command-contracts.mjs";
const PROVIDERS = ["codex", "claude", "cursor"];
const PLUGIN_KEYS = new Set([
    "apiVersion",
    "kind",
    "metadata",
    "compatibility",
    "dependencies",
    "assets",
    "install",
    "runtime",
    "targets",
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
export async function loadPlatform(root) {
    const value = await readJson(path.join(root, "ai-engineering.config.yaml"));
    if (value.apiVersion !== "ai-engineering.dev/v1alpha1") {
        throw new PlatformError("unsupported platform apiVersion", {
            code: "AI_ENGINEERING_INVALID_CONTRACT",
        });
    }
    return value;
}
function normalizeList(value) {
    if (value === undefined || value === null || value === "none")
        return [];
    return value;
}
function normalizePluginManifest(plugin) {
    const assets = plugin.assets ?? {};
    return {
        ...plugin,
        assets: {
            ...assets,
            commands: normalizeList(assets.commands),
            skills: normalizeList(assets.skills),
            agents: normalizeList(assets.agents),
            rules: normalizeList(assets.rules),
            templates: normalizeList(assets.templates),
            workflows: normalizeList(assets.workflows),
            schemas: normalizeList(assets.schemas),
            hooks: normalizeList(assets.hooks),
        },
    };
}
async function resolvePluginSource(root) {
    const pluginsRoot = path.join(root, "plugins");
    if (await exists(pluginsRoot)) {
        return {
            directoryName: "plugins",
            root: pluginsRoot,
            manifestName: "plugin.yaml",
        };
    }
    return {
        directoryName: "packs",
        root: path.join(root, "packs"),
        manifestName: "pack.yaml",
    };
}
export async function loadPlugins(root) {
    const plugins = new Map();
    const pluginSource = await resolvePluginSource(root);
    const entries = await readdir(pluginSource.root, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isDirectory())) {
        const pluginRoot = path.join(pluginSource.root, entry.name);
        const plugin = normalizePluginManifest(await readJson(path.join(pluginRoot, pluginSource.manifestName)));
        const pluginId = plugin.metadata?.id;
        const unknownKeys = Object.keys(plugin).filter((key) => !PLUGIN_KEYS.has(key));
        if (unknownKeys.length > 0) {
            throw new PlatformError(`plugin ${pluginId} has unknown keys: ${unknownKeys.sort().join(", ")}`, { code: "AI_ENGINEERING_INVALID_CONTRACT" });
        }
        plugins.set(pluginId, plugin);
    }
    return new Map([...plugins].sort(([left], [right]) => left.localeCompare(right)));
}
export async function generateCommandRegistry({ root }) {
    const plugins = await loadPlugins(root);
    const commands = [];
    for (const [pluginId, plugin] of plugins) {
        for (const command of await loadPluginCommands({
            root,
            pluginId,
            plugin,
        })) {
            commands.push({
                id: command.id,
                plugin: pluginId,
                slug: command.slug,
                file: path.posix.join("commands", `${command.slug}.md`),
                ...(command.mcpTool ? { mcpTool: command.mcpTool } : {}),
            });
        }
    }
    commands.sort((left, right) => left.id.localeCompare(right.id));
    return { schemaVersion: 2, commands };
}
export async function findSkillPath(root, skillId) {
    const pluginSource = await resolvePluginSource(root);
    for (const pluginId of await readdir(pluginSource.root)) {
        const candidate = path.join(pluginSource.root, pluginId, "skills", skillId);
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
    const pluginSource = await resolvePluginSource(root);
    for (const pluginId of await readdir(pluginSource.root)) {
        const relativePath = commandId.includes("/")
            ? commandId
            : path.join("commands", `${commandId}.md`);
        const candidate = path.join(pluginSource.root, pluginId, relativePath);
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
    const registryPlugins = registry.plugins ?? registry.packs ?? {};
    return {
        ...registry,
        plugins: Object.fromEntries(Object.entries(registryPlugins)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([packId, skillIds]) => [packId, sortedUnique(skillIds)])),
    };
}
async function loadOwnedSkillFolders(root) {
    const result = new Map();
    const pluginSource = await resolvePluginSource(root);
    for (const pluginId of await readdir(pluginSource.root)) {
        const skillRoot = path.join(pluginSource.root, pluginId, "skills");
        try {
            const entries = await readdir(skillRoot, { withFileTypes: true });
            const skills = [];
            for (const entry of entries) {
                if (entry.isDirectory() &&
                    (await exists(path.join(skillRoot, entry.name, "SKILL.md")))) {
                    skills.push(entry.name);
                }
            }
            result.set(pluginId, skills.sort());
        }
        catch {
            result.set(pluginId, []);
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
    const pluginSource = await resolvePluginSource(root);
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
        const pluginId = route.plugin ?? route.pack;
        if (!plugins.has(pluginId)) {
            errors.push(`intent route references unknown plugin ${pluginId}`);
        }
    }
    for (const [packId, registeredSkills] of Object.entries(skillRegistry.plugins ?? {})) {
        if (!plugins.has(packId)) {
            errors.push(`skill registry references unknown plugin ${packId}`);
            continue;
        }
        const ownedSkills = ownedSkillsByPack.get(packId) ?? [];
        const canonicalSkills = (plugins.get(packId)?.skills ?? []).map(skillIdFromPackPath);
        if (!sameValues(registeredSkills, ownedSkills)) {
            errors.push(`skill registry for plugin ${packId} must match skill folders: expected ${ownedSkills.join(", ")}, got ${registeredSkills.join(", ")}`);
        }
        if (!sameValues(registeredSkills, canonicalSkills)) {
            errors.push(`plugin ${packId} canonical skills must match skill registry: expected ${registeredSkills.join(", ")}, got ${canonicalSkills.sort().join(", ")}`);
        }
        for (const skill of registeredSkills) {
            if (!plugins.get(packId)?.assets?.skills?.includes(skill)) {
                errors.push(`skill registry mismatch: ${packId}/${skill}`);
            }
        }
    }
    for (const packId of plugins.keys()) {
        if (!Object.hasOwn(skillRegistry.plugins ?? {}, packId)) {
            errors.push(`skill registry is missing plugin ${packId}`);
        }
    }
    try {
        const expectedCommandRegistry = await generateCommandRegistry({ root });
        if (JSON.stringify(commandRegistry) !== JSON.stringify(expectedCommandRegistry)) {
            errors.push("command registry must match canonical command files");
        }
    }
    catch (error) {
        errors.push(error.message);
    }
    for (const [packId, pack] of plugins) {
        for (const skill of pack.skills ?? []) {
            if (!skill.id || !skill.path) {
                errors.push(`plugin ${packId} has invalid skill metadata`);
            }
            else if (!(await exists(path.join(pluginSource.root, packId, skill.path)))) {
                errors.push(`plugin ${packId} skill ${skill.id} references missing file`);
            }
        }
    }
    return { mcpServerCount: servers.length, mcpTools };
}
export async function validateRepository(root) {
    const platform = await loadPlatform(root);
    const plugins = await loadPlugins(root);
    const pluginSource = await resolvePluginSource(root);
    const ownedSkillsByPack = await loadOwnedSkillFolders(root);
    const skills = new Set([...ownedSkillsByPack.values()].flat());
    const agents = new Set((await readdir(path.join(root, "adapters", "codex", "agents"), {
        withFileTypes: true,
    }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".toml"))
        .map((entry) => path.basename(entry.name, ".toml")));
    const errors = [];
    if (platform.product?.name !== "ai-engineering-platform") {
        errors.push("platform product name must be ai-engineering-platform");
    }
    if (platform.product?.cli !== "ai-engineering") {
        errors.push("platform CLI name must be ai-engineering");
    }
    const enabledPlugins = [...(platform.plugins?.enabled ?? platform.packs?.enabled ?? [])].sort();
    if (JSON.stringify(enabledPlugins) !== JSON.stringify([...plugins.keys()].sort())) {
        errors.push("configured plugin ids must match canonical plugins");
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
        "packs",
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
            pluginSource.manifestName,
            "commands",
            "skills",
            "templates",
            "workflows",
            "schemas",
        ]) {
            if (!(await exists(path.join(pluginSource.root, pluginId, required)))) {
                errors.push(`plugin ${pluginId} is missing ${required}`);
            }
        }
        if (plugin.apiVersion !== "ai-engineering.dev/v1alpha1") {
            errors.push(`unsupported plugin apiVersion: ${pluginId}`);
        }
        if (plugin.id !== pluginId ||
            plugin.name !== plugin.metadata?.name ||
            plugin.version !== plugin.metadata?.version ||
            plugin.category !== "ai-ide-plugin") {
            errors.push(`plugin ${pluginId} canonical metadata is invalid`);
        }
        if ((plugin.triggers?.keywords ?? []).length === 0) {
            errors.push(`plugin ${pluginId} must declare trigger keywords`);
        }
        if ((plugin.skills ?? []).length === 0) {
            errors.push(`plugin ${pluginId} must declare canonical skills`);
        }
        if (plugin.kind !== "AiIdePlugin") {
            errors.push(`invalid plugin kind: ${pluginId}`);
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
    }
    detectCycles(plugins, errors);
    const { mcpServerCount, mcpTools } = await validateRoutingAndMcp(root, plugins, errors, ownedSkillsByPack);
    const commandOwners = new Map();
    function resolvedSkills(pluginId, visited = new Set()) {
        if (visited.has(pluginId))
            return [];
        visited.add(pluginId);
        const plugin = plugins.get(pluginId);
        return [
            ...(plugin?.assets?.skills ?? []),
            ...(plugin?.dependencies?.required ?? []).flatMap((dependency) => resolvedSkills(dependency, visited)),
        ];
    }
    for (const [pluginId, plugin] of plugins) {
        try {
            const commands = await loadPluginCommands({
                root,
                pluginId,
                plugin,
                knownSkills: new Set(resolvedSkills(pluginId)),
                knownMcpTools: mcpTools,
                validateReferences: true,
            });
            for (const command of commands) {
                if (commandOwners.has(command.id)) {
                    errors.push(`duplicate command id ${command.id}: ${commandOwners.get(command.id)}, ${pluginId}`);
                }
                commandOwners.set(command.id, pluginId);
                if (/[.]((claude|cursor|codex)(-plugin)?)[/\\]/i.test(command.markdown)) {
                    errors.push(`command ${command.id} contains provider-specific path`);
                }
            }
        }
        catch (error) {
            errors.push(...error.message.split("\n"));
        }
    }
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
