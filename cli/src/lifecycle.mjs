import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import {
  findCommandPath,
  findSkillPath,
  loadCanonicalCommand,
  loadPlatform,
  loadPlugins,
} from "./contracts.mjs";
import { listFiles, writeJsonAtomic } from "./io.mjs";
import {
  createMcpRegistrations,
  mergeCodexMcpConfig,
  mergeJsonMcpConfig,
} from "./mcp-config.mjs";
import { projectProviders } from "./providers.mjs";
import { resolvePluginGraph } from "./resolver.mjs";
import { readPlatformState } from "./state.mjs";
import { applyTransaction, planTransaction } from "./transaction.mjs";
import { initializeProject } from "./init.mjs";

async function readDirectoryFiles(sourceRoot, destinationPrefix) {
  const files = new Map();
  for (const relative of await listFiles(sourceRoot)) {
    files.set(
      `${destinationPrefix}/${relative}`,
      await readFile(path.join(sourceRoot, relative), "utf8"),
    );
  }
  return files;
}

async function readTextIfExists(pathname) {
  try {
    return await readFile(pathname, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function normalizeContext(target, context) {
  return (
    context ?? {
      scope: "project",
      targetRoot: target,
      stateRoot: path.join(target, ".ai-engineering"),
      projectAssets: true,
    }
  );
}

function addOwnership(
  files,
  relativePath,
  owners,
  source,
  shared = false,
  extra = {},
) {
  files[relativePath] = {
    owners: [...owners].sort(),
    source,
    checksum: "",
    shared,
    ...extra,
  };
}

async function addProjectAssets({
  root,
  graph,
  plugins,
  desiredFiles,
  ownershipFiles,
}) {
  for (const skill of graph.skills) {
    const prefixes = new Set();
    if (graph.providers.includes("codex")) {
      prefixes.add(`.codex/skills/${skill}`);
    }
    if (graph.providers.includes("claude")) prefixes.add(`skills/${skill}`);
    for (const prefix of prefixes) {
      for (const [relativePath, content] of await readDirectoryFiles(
        await findSkillPath(root, skill),
        prefix,
      )) {
        desiredFiles.set(relativePath, content);
        addOwnership(
          ownershipFiles,
          relativePath,
          graph.ownership.skills[skill] ?? graph.pluginIds,
          skill,
          (graph.ownership.skills[skill] ?? []).length > 1,
        );
      }
    }
  }

  const commands = [];
  for (const pluginId of graph.pluginIds) {
    const plugin = plugins.get(pluginId);
    for (const commandId of plugin.assets.commands) {
      const source = await findCommandPath(root, commandId);
      const relativePath = `commands/${commandId}.md`;
      desiredFiles.set(relativePath, await readFile(source, "utf8"));
      addOwnership(ownershipFiles, relativePath, [pluginId], commandId);
      commands.push(await loadCanonicalCommand(source));
    }
  }

  for (const agent of graph.agents) {
    const relativePath = `agents/${agent}.toml`;
    desiredFiles.set(
      relativePath,
      await readFile(
        path.join(root, "adapters", "codex", "agents", `${agent}.toml`),
        "utf8",
      ),
    );
    addOwnership(
      ownershipFiles,
      relativePath,
      graph.ownership.agents[agent] ?? graph.pluginIds,
      agent,
      (graph.ownership.agents[agent] ?? []).length > 1,
    );
  }
  return commands;
}

async function addRuntimeFiles({
  root,
  graph,
  desiredFiles,
  ownershipFiles,
}) {
  for (const pluginId of graph.pluginIds) {
    const serverRoot = path.join(root, "mcp-servers", `${pluginId}-mcp`);
    const serverPrefix = `.ai-engineering/mcp-servers/${pluginId}-mcp`;
    for (const [relativePath, content] of await readDirectoryFiles(
      serverRoot,
      serverPrefix,
    )) {
      desiredFiles.set(relativePath, content);
      addOwnership(
        ownershipFiles,
        relativePath,
        [pluginId],
        "mcp-server",
      );
    }
  }

  if (graph.pluginIds.length === 0) return;
  for (const [relativePath, content] of await readDirectoryFiles(
    path.join(root, "core", "mcp"),
    ".ai-engineering/core/mcp",
  )) {
    desiredFiles.set(relativePath, content);
    addOwnership(
      ownershipFiles,
      relativePath,
      graph.pluginIds,
      "mcp-runtime",
      true,
    );
  }
}

async function mergeProviderConfig({
  provider,
  projection,
  target,
  previousState,
  force,
}) {
  const currentText = await readTextIfExists(
    path.join(target, projection.mcpConfig.path),
  );
  const previouslyManaged =
    previousState.lock?.managedMcpServers?.[provider] ?? [];
  if (projection.mcpConfig.format === "toml") {
    return mergeCodexMcpConfig({
      currentText,
      desired: projection.mcpConfig.servers,
      previouslyManaged,
      force,
    });
  }
  return mergeJsonMcpConfig({
    currentText,
    desired: projection.mcpConfig.servers,
    previouslyManaged,
    force,
    provider: provider === "claude" ? "Claude" : "Cursor",
  });
}

async function buildDesiredState({
  root,
  target,
  context,
  pluginIds = [],
  all = false,
  providers,
  rootPlugins,
  force = false,
}) {
  const installContext = normalizeContext(target, context);
  const platform = await loadPlatform(root);
  const plugins = await loadPlugins(root);
  const requested = all ? [...plugins.keys()] : pluginIds;
  const graph = resolvePluginGraph({
    requested,
    plugins,
    platformVersion: platform.product.version,
    providers: providers ?? platform.providers.enabled,
  });
  const previousState = await readPlatformState(installContext.targetRoot);
  const desiredFiles = new Map();
  const ownershipFiles = {};

  const commands = installContext.projectAssets
    ? await addProjectAssets({
        root,
        graph,
        plugins,
        desiredFiles,
        ownershipFiles,
      })
    : [];

  await addRuntimeFiles({ root, graph, desiredFiles, ownershipFiles });

  const mcpServers = createMcpRegistrations({
    packIds: graph.pluginIds,
    runtimeRoot: path.join(installContext.targetRoot, ".ai-engineering"),
  });
  const projections = projectProviders({
    scope: installContext.scope,
    plugin: {
      metadata: {
        id: "platform",
        name: platform.product.displayName,
        version: platform.product.version,
      },
    },
    commands,
    skills: graph.skills,
    agents: graph.agents,
    hooks: graph.hooks,
    mcpServers,
  });

  for (const provider of graph.providers) {
    const projection = projections[provider];
    if (installContext.projectAssets && graph.pluginIds.length > 0) {
      for (const file of projection.files) {
        desiredFiles.set(file.path, file.content);
        addOwnership(
          ownershipFiles,
          file.path,
          graph.pluginIds,
          provider,
        );
      }
    }

    const merged = await mergeProviderConfig({
      provider,
      projection,
      target: installContext.targetRoot,
      previousState,
      force,
    });
    if (!merged.empty) {
      desiredFiles.set(projection.mcpConfig.path, merged.content);
      addOwnership(
        ownershipFiles,
        projection.mcpConfig.path,
        graph.pluginIds,
        `${provider}-mcp-config`,
        true,
        { mergeStrategy: "mcp-config" },
      );
    }
  }

  const activeProviders =
    graph.pluginIds.length === 0 ? [] : graph.providers;
  const lock = {
    schemaVersion: 1,
    platformVersion: platform.product.version,
    scope: installContext.scope,
    providers: activeProviders,
    rootPlugins: rootPlugins ?? requested,
    plugins: graph.pluginIds.map((id) => ({
      id,
      version: plugins.get(id).metadata.version,
    })),
    managedMcpServers: Object.fromEntries(
      activeProviders.map((provider) => [
        provider,
        Object.keys(mcpServers).sort(),
      ]),
    ),
  };
  return {
    desiredFiles,
    lock,
    ownership: { schemaVersion: 1, files: ownershipFiles },
    plugins: graph.pluginIds,
    providers: activeProviders,
  };
}

async function writeLifecycleState(target, lock) {
  const stateRoot = path.join(target, ".ai-engineering");
  if (lock.plugins.length === 0) {
    await rm(path.join(stateRoot, "installed-packs.yaml"), { force: true });
    await rm(path.join(stateRoot, "lockfile.yaml"), { force: true });
    return;
  }
  await writeJsonAtomic(path.join(stateRoot, "installed-packs.yaml"), {
    schemaVersion: 1,
    packs: lock.plugins,
  });
  await writeJsonAtomic(path.join(stateRoot, "lockfile.yaml"), {
    schemaVersion: 1,
    platformVersion: lock.platformVersion,
    scope: lock.scope,
    providers: lock.providers,
    packs: lock.plugins,
  });
}

export async function installPlugins({
  root,
  target,
  context,
  pluginIds = [],
  all = false,
  providers,
  force = false,
}) {
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
    providers: desired.providers,
  };
}

export async function listInstalled({ target }) {
  const state = await readPlatformState(target);
  return {
    status: "pass",
    scope: state.lock?.scope ?? "project",
    plugins: state.lock?.plugins ?? [],
    rootPlugins: state.lock?.rootPlugins ?? [],
    providers: state.lock?.providers ?? [],
    platformVersion: state.lock?.platformVersion,
    managedMcpServers: state.lock?.managedMcpServers ?? {},
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
  if (!current.paths.includes(assetPath)) current.paths.push(assetPath);
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
  for (const [file, metadata] of entries) {
    const skill = file.match(/^(?:\.codex\/skills|skills)\/([^/]+)\//)?.[1];
    if (skill) {
      upsertAsset(skills, {
        id: skill,
        path: file.replace(/^(.*?\/[^/]+)\/.*$/, "$1"),
        metadata,
      });
    }

    const command = file.match(/^commands\/([^/]+)\.md$/)?.[1];
    if (command) {
      upsertAsset(commands, { id: command, path: file, metadata });
    }

    const agent = file.match(/^agents\/([^/]+)\.toml$/)?.[1];
    if (agent) {
      upsertAsset(agents, { id: agent, path: file, metadata });
    }
  }
  return {
    skills: normalizeAssets(skills),
    commands: normalizeAssets(commands),
    agents: normalizeAssets(agents),
  };
}

export async function listAvailable({ root }) {
  const plugins = await loadPlugins(root);
  const packs = [...plugins.values()].map((plugin) => ({
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
    packs: {
      count: packs.length,
      available: packs,
    },
  };
}

export async function checkInstalled({ target }) {
  const state = await readPlatformState(target);
  const lock = state.lock;
  const assets = collectInstalledAssets(state.ownership);
  const managedMcpServers = sortedValues(Object.values(lock?.managedMcpServers ?? {}).flat());
  const installedPackOrder = (lock?.plugins ?? []).map((item) => item.id);
  const mcpServerNames = [
    ...installedPackOrder.filter((item) => managedMcpServers.includes(item)),
    ...managedMcpServers.filter((item) => !installedPackOrder.includes(item)),
  ];
  const mcpServers = mcpServerNames.map((name) => ({
    name,
    providers: Object.entries(lock?.managedMcpServers ?? {})
      .filter(([, servers]) => servers.includes(name))
      .map(([provider]) => provider)
      .sort(),
    path: `.ai-engineering/mcp-servers/${name}-mcp`,
    installed: true,
  }));
  return {
    status: "pass",
    current: {
      state: lock ? "installed" : "not-installed",
      scope: lock?.scope ?? "project",
      platformVersion: lock?.platformVersion,
      installState: state.installState?.status ?? (lock ? "unknown" : "none"),
    },
    packs: {
      installed: lock?.plugins ?? [],
      roots: lock?.rootPlugins ?? [],
    },
    providers: lock?.providers ?? [],
    mcp: {
      count: mcpServers.length,
      servers: mcpServers,
      byProvider: lock?.managedMcpServers ?? {},
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
  };
}

export async function findOutdated({ target, registry = {} }) {
  const installed = await listInstalled({ target });
  const updates = [];
  for (const plugin of installed.plugins) {
    const latest = registry[plugin.id]?.latest;
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

export async function updatePlugins({
  root,
  target,
  context,
  pluginIds = [],
  all = false,
  registry = {},
  dryRun = false,
  force = false,
}) {
  const installed = await listInstalled({ target });
  const selected = all
    ? installed.plugins.map((item) => item.id)
    : pluginIds.map((item) => item.split("@")[0]);
  const outdated = await findOutdated({ target, registry });
  const applicable = outdated.updates.filter((item) =>
    selected.includes(item.id),
  );
  if (dryRun || applicable.length === 0) {
    return { status: "pass", changed: false, updates: applicable };
  }
  const result = await installPlugins({
    root,
    target,
    context,
    pluginIds: selected,
    providers:
      installed.providers.length > 0 ? installed.providers : undefined,
    force,
  });
  return { ...result, changed: true, updates: applicable };
}

export async function removePlugins({
  root,
  target,
  context,
  pluginIds = [],
  all = false,
  force = false,
}) {
  const installContext = normalizeContext(target, context);
  const installed = await listInstalled({ target: installContext.targetRoot });
  const removeIds = new Set(pluginIds.map((item) => item.split("@")[0]));
  const installedRoots =
    installed.rootPlugins.length > 0
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
    providers: desired.providers,
  };
}
