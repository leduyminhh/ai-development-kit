import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { loadPlatform, loadPlugins, } from "./contracts.mjs";
import { listFiles, writeJsonAtomic } from "./io.mjs";
import { projectProvider } from "./providers.mjs";
import { buildProjectionInput } from "./projection-input.mjs";
import { resolvePluginGraph } from "./resolver.mjs";
import { readPlatformState } from "./state.mjs";
import { applyTransaction, planTransaction } from "./transaction.mjs";
import { initializeProject, prepareInstructionFileContent, } from "./init.mjs";
const CORE_RUNTIME_DIRECTORIES = [
    "agents",
    "prompts",
    "routing",
    "schemas",
    "standards",
    "templates",
    "workflows",
];
async function readDirectoryFiles(sourceRoot, destinationPrefix) {
    const files = new Map();
    let relatives = [];
    try {
        relatives = await listFiles(sourceRoot);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return files;
        throw error;
    }
    for (const relative of relatives) {
        files.set(`${destinationPrefix}/${relative}`, await readFile(path.join(sourceRoot, relative), "utf8"));
    }
    return files;
}
async function appendPlatformInstructionFragments({ root, graph, content }) {
    if (!graph.pluginIds.includes("platform"))
        return content;
    const fragment = await readFile(path.join(root, "plugins", "platform", "templates", "agents", "git-workflow-routing.md"), "utf8");
    if (content.includes("platform.git_workflow_design"))
        return content;
    return `${content.trimEnd()}\n\n${fragment.trim()}\n`;
}
function normalizeContext(target, context) {
    return (context ?? {
        scope: "project",
        targetRoot: target,
        stateRoot: path.join(target, ".ai-engineering"),
        projectAssets: true,
    });
}
function addOwnership(files, relativePath, owners, assetId, shared = false, extra = {}) {
    files[relativePath] = {
        owners: [...owners].sort(),
        assetType: extra.assetType ?? "runtime",
        assetId,
        checksum: "",
        shared,
        ...extra,
    };
    delete files[relativePath].source;
}
async function materializeProjectionAsset({ root, asset, desiredFiles, ownershipFiles, }) {
    if (asset.operation === "render") {
        desiredFiles.set(asset.destinationPath, asset.content);
        addOwnership(ownershipFiles, asset.destinationPath, asset.owners, asset.assetId, asset.shared, { assetType: asset.assetType });
        return;
    }
    const source = path.join(root, asset.sourcePath);
    const sourceStat = await stat(source);
    if (sourceStat.isDirectory()) {
        for (const [relativePath, content] of await readDirectoryFiles(source, asset.destinationPath)) {
            desiredFiles.set(relativePath, content);
            addOwnership(ownershipFiles, relativePath, asset.owners, asset.assetId, asset.shared, { assetType: asset.assetType });
        }
        return;
    }
    desiredFiles.set(asset.destinationPath, await readFile(source, "utf8"));
    addOwnership(ownershipFiles, asset.destinationPath, asset.owners, asset.assetId, asset.shared, { assetType: asset.assetType });
}
async function addRuntimeFiles({ root, graph, desiredFiles, ownershipFiles, }) {
    if (graph.pluginIds.length === 0)
        return;
    for (const directory of CORE_RUNTIME_DIRECTORIES) {
        const sourceRoot = path.join(root, "core", directory);
        for (const [relativePath, content] of await readDirectoryFiles(sourceRoot, `.ai-engineering/core/${directory}`)) {
            desiredFiles.set(relativePath, content);
            addOwnership(ownershipFiles, relativePath, graph.pluginIds, "core-runtime", true);
        }
    }
}
async function buildDesiredState({ root, target, context, pluginIds = [], all = false, providers, rootPlugins, optionalPlugins = [], }) {
    const installContext = normalizeContext(target, context);
    const platform = await loadPlatform(root);
    const plugins = await loadPlugins(root);
    const requested = all ? [...plugins.keys()] : pluginIds;
    const graph = resolvePluginGraph({
        requested,
        optional: optionalPlugins,
        plugins,
        platformVersion: platform.product.version,
        providers: providers ?? platform.providers.enabled,
    });
    const desiredFiles = new Map();
    const ownershipFiles = {};
    await addRuntimeFiles({
        root,
        graph,
        desiredFiles,
        ownershipFiles,
    });
    const mcpServers = {};
    const projections = {};
    for (const provider of graph.providers) {
        const projectionInput = await buildProjectionInput({
            root,
            graph,
            plugins,
            scope: installContext.scope,
            provider,
            mcpServers,
        });
        const projection = projectProvider(projectionInput);
        projections[provider] = projection;
        if (graph.pluginIds.length > 0) {
            for (const asset of projection.assets) {
                await materializeProjectionAsset({
                    root,
                    asset,
                    desiredFiles,
                    ownershipFiles,
                });
            }
            for (const instruction of projection.instructions) {
                const content = await appendPlatformInstructionFragments({
                    root,
                    graph,
                    content: await prepareInstructionFileContent({
                        root,
                        target: installContext.targetRoot,
                        relativePath: instruction.destinationPath,
                    }),
                });
                desiredFiles.set(instruction.destinationPath, content);
                addOwnership(ownershipFiles, instruction.destinationPath, graph.pluginIds, `${provider}.instructions`, true, { assetType: "instruction", mergeStrategy: "managed-block" });
            }
        }
    }
    const activeProviders = graph.pluginIds.length === 0 ? [] : graph.providers;
    const lock = {
        schemaVersion: 1,
        platformVersion: platform.product.version,
        scope: installContext.scope,
        providers: activeProviders,
        rootPlugins: rootPlugins ?? requested,
        optionalPlugins: graph.optionalPlugins,
        plugins: graph.pluginIds.map((id) => ({
            id,
            version: plugins.get(id).metadata.version,
        })),
    };
    return {
        desiredFiles,
        lock,
        ownership: { schemaVersion: 2, files: ownershipFiles },
        projections,
        graph,
        mcpServers,
        plugins: graph.pluginIds,
        providers: activeProviders,
    };
}
export async function prepareInstallation({ root, context, rootPlugins = [], optionalPlugins = [], providers, force = false, all = false, }) {
    return buildDesiredState({
        root,
        target: context.targetRoot,
        context,
        pluginIds: rootPlugins,
        rootPlugins,
        optionalPlugins,
        providers,
        force,
        all,
    });
}
async function writeLifecycleState(target, lock) {
    const stateRoot = path.join(target, ".ai-engineering");
    if (lock.plugins.length === 0) {
        await rm(path.join(stateRoot, "installed-plugins.yaml"), { force: true });
        await rm(path.join(stateRoot, "lockfile.yaml"), { force: true });
        return;
    }
    await writeJsonAtomic(path.join(stateRoot, "installed-plugins.yaml"), {
        schemaVersion: 2,
        plugins: lock.plugins,
    });
    await writeJsonAtomic(path.join(stateRoot, "lockfile.yaml"), {
        schemaVersion: 1,
        platformVersion: lock.platformVersion,
        scope: lock.scope,
        providers: lock.providers,
        plugins: lock.plugins,
    });
}
export async function applyPreparedInstallation({ prepared, context, force = false, }) {
    const plan = await planTransaction({
        target: context.targetRoot,
        desiredFiles: prepared.desiredFiles,
        lock: prepared.lock,
        ownership: prepared.ownership,
        force,
    });
    await applyTransaction(plan);
    await writeLifecycleState(context.targetRoot, prepared.lock);
    return {
        status: "pass",
        scope: context.scope,
        plugins: prepared.plugins,
        providers: prepared.providers,
        optionalPlugins: prepared.lock.optionalPlugins ?? [],
    };
}
export async function installPlugins({ root, target, context, pluginIds = [], all = false, providers, optionalPlugins = [], force = false, }) {
    const installContext = normalizeContext(target, context);
    if (installContext.projectAssets) {
        await initializeProject({ root, target: installContext.targetRoot });
    }
    const desired = await buildDesiredState({
        root,
        target: installContext.targetRoot,
        context: installContext,
        pluginIds,
        all,
        providers,
        optionalPlugins,
        force,
    });
    return applyPreparedInstallation({
        prepared: desired,
        context: installContext,
        force,
    });
}
export async function listInstalled({ target }) {
    const state = await readPlatformState(target);
    return {
        status: "pass",
        scope: state.lock?.scope ?? "project",
        plugins: state.lock?.plugins ?? [],
        rootPlugins: state.lock?.rootPlugins ?? [],
        optionalPlugins: state.lock?.optionalPlugins ?? [],
        providers: state.lock?.providers ?? [],
        platformVersion: state.lock?.platformVersion,
        managedMcpServers: {},
    };
}
function sortedValues(values) {
    return [...new Set(values.filter(Boolean))].sort();
}
function groupByOwner(items) {
    const grouped = {};
    for (const item of items) {
        for (const owner of item.owners ?? []) {
            grouped[owner] = [...(grouped[owner] ?? []), item.id].sort();
        }
    }
    return Object.fromEntries(Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right)));
}
function upsertAsset(target, { id, path: assetPath, metadata }) {
    const current = target.get(id) ?? {
        id,
        paths: [],
        owners: [],
        shared: false,
        installed: true,
    };
    if (!current.paths.includes(assetPath))
        current.paths.push(assetPath);
    current.owners = sortedValues([...current.owners, ...(metadata.owners ?? [])]);
    current.shared = current.shared || Boolean(metadata.shared);
    target.set(id, current);
}
function normalizeAssets(map) {
    return [...map.values()]
        .map((item) => ({
        ...item,
        path: item.paths.sort()[0],
        paths: item.paths.sort(),
    }))
        .sort((left, right) => left.id.localeCompare(right.id));
}
function collectInstalledAssets(ownership) {
    const entries = Object.entries(ownership?.files ?? {});
    const skills = new Map();
    const commands = new Map();
    const agents = new Map();
    const workflows = new Map();
    for (const [file, metadata] of entries) {
        if (metadata.assetType === "skill") {
            upsertAsset(skills, {
                id: metadata.assetId,
                path: file.replace(/^(.*?\/[^/]+)\/.*$/, "$1"),
                metadata,
            });
            continue;
        }
        if (metadata.assetType === "command") {
            upsertAsset(commands, {
                id: metadata.assetId,
                path: file,
                metadata,
            });
            continue;
        }
        if (metadata.assetType === "agent") {
            upsertAsset(agents, {
                id: metadata.assetId,
                path: file,
                metadata,
            });
            continue;
        }
        const skill = file.match(/^(?:\.agents\/skills|\.claude\/skills|\.codex\/skills|skills)\/([^/]+)\//)?.[1];
        if (skill) {
            upsertAsset(skills, {
                id: skill,
                path: file.replace(/^(.*?\/[^/]+)\/.*$/, "$1"),
                metadata,
            });
        }
        const command = file.match(/^(?:commands|\.claude\/commands)\/([^/]+)\.md$/)?.[1];
        if (command) {
            upsertAsset(commands, { id: command, path: file, metadata });
        }
        const agent = file.match(/^(?:\.codex\/agents|agents)\/([^/]+)\.toml$/)?.[1];
        if (agent) {
            upsertAsset(agents, { id: agent, path: file, metadata });
        }
        const workflow = file.match(/^\.ai-engineering\/workflows\/definitions\/([^/]+)\.yaml$/)?.[1];
        if (workflow) {
            upsertAsset(workflows, { id: workflow, path: file, metadata });
        }
    }
    return {
        skills: normalizeAssets(skills),
        commands: normalizeAssets(commands),
        agents: normalizeAssets(agents),
        workflows: normalizeAssets(workflows),
    };
}
export async function listAvailable({ root }) {
    const plugins = await loadPlugins(root);
    const available = [...plugins.values()].map((plugin) => ({
        id: plugin.metadata.id,
        name: plugin.metadata.name,
        version: plugin.metadata.version,
        description: plugin.metadata.description,
        triggers: plugin.triggers ?? { keywords: [] },
        dependencies: {
            required: plugin.dependencies?.required ?? [],
            optional: plugin.dependencies?.optional ?? [],
        },
        assets: {
            skills: plugin.assets?.skills ?? [],
            commands: plugin.assets?.commands ?? [],
            agents: plugin.assets?.agents ?? [],
            hooks: plugin.assets?.hooks ?? [],
        },
        install: plugin.install,
        compatibility: plugin.compatibility,
    }));
    return {
        status: "pass",
        plugins: {
            count: available.length,
            available,
        },
    };
}
export async function checkInstalled({ target }) {
    const state = await readPlatformState(target);
    const lock = state.lock;
    const assets = collectInstalledAssets(state.ownership);
    const mcpServers = [];
    return {
        status: "pass",
        current: {
            state: lock ? "installed" : "not-installed",
            scope: lock?.scope ?? "project",
            platformVersion: lock?.platformVersion,
            installState: state.installState?.status ?? (lock ? "unknown" : "none"),
        },
        plugins: {
            installed: lock?.plugins ?? [],
            roots: lock?.rootPlugins ?? [],
        },
        providers: lock?.providers ?? [],
        mcp: {
            count: mcpServers.length,
            servers: mcpServers,
            byProvider: {},
        },
        skills: {
            count: assets.skills.length,
            installed: assets.skills,
            byOwner: groupByOwner(assets.skills),
        },
        commands: {
            count: assets.commands.length,
            installed: assets.commands,
            byOwner: groupByOwner(assets.commands),
        },
        agents: {
            count: assets.agents.length,
            installed: assets.agents,
            byOwner: groupByOwner(assets.agents),
        },
        workflows: {
            count: assets.workflows.length,
            installed: assets.workflows,
            byOwner: groupByOwner(assets.workflows),
        },
    };
}
export async function findOutdated({ root, target, registry = {} }) {
    const installed = await listInstalled({ target });
    let available = registry;
    if (root && Object.keys(available).length === 0) {
        const plugins = await loadPlugins(root);
        available = Object.fromEntries([...plugins.values()].map((plugin) => [
            plugin.metadata.id,
            { latest: plugin.metadata.version },
        ]));
    }
    const updates = [];
    for (const plugin of installed.plugins) {
        const latest = available[plugin.id]?.latest;
        if (latest && latest !== plugin.version) {
            updates.push({
                id: plugin.id,
                current: plugin.version,
                latest,
            });
        }
    }
    return { status: "pass", updates };
}
export async function updatePlugins({ root, target, context, pluginIds = [], all = false, registry = {}, dryRun = false, force = false, }) {
    const installed = await listInstalled({ target });
    const selected = all
        ? installed.plugins.map((item) => item.id)
        : pluginIds.map((item) => item.split("@")[0]);
    const outdated = await findOutdated({ root, target, registry });
    const applicable = outdated.updates.filter((item) => selected.includes(item.id));
    if (dryRun || applicable.length === 0) {
        return { status: "pass", changed: false, updates: applicable };
    }
    const result = await installPlugins({
        root,
        target,
        context,
        pluginIds: installed.rootPlugins.length > 0
            ? installed.rootPlugins
            : installed.plugins.map((item) => item.id),
        providers: installed.providers.length > 0 ? installed.providers : undefined,
        optionalPlugins: installed.optionalPlugins,
        force,
    });
    return { ...result, changed: true, updates: applicable };
}
export async function removePlugins({ root, target, context, pluginIds = [], all = false, force = false, }) {
    const installContext = normalizeContext(target, context);
    const installed = await listInstalled({ target: installContext.targetRoot });
    const removeIds = new Set(pluginIds.map((item) => item.split("@")[0]));
    const installedRoots = installed.rootPlugins.length > 0
        ? installed.rootPlugins
        : installed.plugins.map((item) => item.id);
    const remainingRoots = all
        ? []
        : installedRoots.filter((id) => !removeIds.has(id));
    const desired = await buildDesiredState({
        root,
        target: installContext.targetRoot,
        context: installContext,
        pluginIds: remainingRoots,
        providers: installed.providers,
        optionalPlugins: installed.optionalPlugins.filter((id) => !removeIds.has(id)),
        rootPlugins: remainingRoots,
        force,
    });
    const plan = await planTransaction({
        target: installContext.targetRoot,
        desiredFiles: desired.desiredFiles,
        lock: desired.lock,
        ownership: desired.ownership,
        force,
    });
    await applyTransaction(plan);
    await writeLifecycleState(installContext.targetRoot, desired.lock);
    return {
        status: "pass",
        scope: installContext.scope,
        plugins: desired.plugins,
        providers: installed.providers,
    };
}
