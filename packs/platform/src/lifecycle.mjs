import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  findCommandPath,
  findSkillPath,
  loadCanonicalCommand,
  loadPlatform,
  loadPlugins,
} from "./contracts.mjs";
import { listFiles } from "./io.mjs";
import { writeJsonAtomic } from "./io.mjs";
import { projectProviders } from "./providers.mjs";
import { resolvePluginGraph } from "./resolver.mjs";
import { applyTransaction, planTransaction } from "./transaction.mjs";
import { readPlatformState } from "./state.mjs";
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

function providerManifest(platform, graph, provider) {
  return `${JSON.stringify(
    {
      name: platform.product.name,
      description: platform.product.description,
      version: platform.product.version,
      provider,
      skills: "./skills/",
      aiEngineering: {
        apiVersion: platform.apiVersion,
        plugins: graph.pluginIds,
        resolvedSkills: graph.skills,
      },
    },
    null,
    2,
  )}\n`;
}

function addOwnership(files, relativePath, owners, source, shared = false) {
  files[relativePath] = {
    owners: [...owners].sort(),
    source,
    checksum: "",
    shared,
  };
}

async function buildDesiredState({
  root,
  pluginIds = [],
  all = false,
  providers,
  rootPlugins,
}) {
  const platform = await loadPlatform(root);
  const plugins = await loadPlugins(root);
  const requested = all ? [...plugins.keys()] : pluginIds;
  const graph = resolvePluginGraph({
    requested,
    plugins,
    platformVersion: platform.product.version,
    providers: providers ?? platform.providers.enabled,
  });

  const desiredFiles = new Map();
  const ownershipFiles = {};
  for (const skill of graph.skills) {
    const prefixes = new Set();
    if (graph.providers.includes("codex")) prefixes.add(`.codex/skills/${skill}`);
    if (graph.providers.includes("claude")) prefixes.add(`skills/${skill}`);
    if (graph.providers.includes("generic")) prefixes.add(`skills/${skill}`);
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
      const content = await readFile(source, "utf8");
      const relativePath = `commands/${commandId}.md`;
      desiredFiles.set(relativePath, content);
      addOwnership(ownershipFiles, relativePath, [pluginId], commandId, false);
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

  const context = {
    plugin: { metadata: { id: "platform", name: platform.product.displayName, version: platform.product.version } },
    commands,
    skills: graph.skills,
    agents: graph.agents,
    hooks: graph.hooks,
  };
  const projections = projectProviders(context);
  const enabledProviders = new Set(graph.providers);
  for (const [provider, projection] of Object.entries(projections)) {
    if (!enabledProviders.has(provider)) continue;
    for (const file of projection.files) {
      desiredFiles.set(file.path, file.content);
      addOwnership(ownershipFiles, file.path, graph.pluginIds, provider, false);
    }
  }

  const mcpPath = ".mcp.json";
  desiredFiles.set(
    mcpPath,
    `${JSON.stringify(
      {
        mcpServers: Object.fromEntries(
          graph.pluginIds.map((packId) => [
            packId,
            {
              command: "node",
              args: [
                path.join(
                  root,
                  "mcp-servers",
                  `${packId}-mcp`,
                  "src",
                  "index.js",
                ),
              ],
            },
          ]),
        ),
      },
      null,
      2,
    )}\n`,
  );
  addOwnership(ownershipFiles, mcpPath, graph.pluginIds, "mcp", true);

  const lock = {
    schemaVersion: 1,
    platformVersion: platform.product.version,
    providers: graph.providers,
    rootPlugins: rootPlugins ?? requested,
    plugins: graph.pluginIds.map((id) => ({
      id,
      version: plugins.get(id).metadata.version,
    })),
  };
  return {
    desiredFiles,
    lock,
    ownership: { schemaVersion: 1, files: ownershipFiles },
    plugins: graph.pluginIds,
    providers: graph.providers,
  };
}

export async function installPlugins({
  root,
  target,
  pluginIds = [],
  all = false,
  providers,
  force = false,
}) {
  await initializeProject({ root, target });
  const desired = await buildDesiredState({ root, pluginIds, all, providers });
  const plan = await planTransaction({
    target,
    desiredFiles: desired.desiredFiles,
    lock: desired.lock,
    ownership: desired.ownership,
    force,
  });
  await applyTransaction(plan);
  await writeJsonAtomic(
    path.join(target, ".ai-engineering", "installed-packs.yaml"),
    {
      schemaVersion: 1,
      packs: desired.lock.plugins,
    },
  );
  await writeJsonAtomic(path.join(target, ".ai-engineering", "lockfile.yaml"), {
    schemaVersion: 1,
    platformVersion: desired.lock.platformVersion,
    providers: desired.lock.providers,
    packs: desired.lock.plugins,
  });
  return {
    status: "pass",
    plugins: desired.plugins,
    providers: desired.providers,
  };
}

export async function listInstalled({ target }) {
  const state = await readPlatformState(target);
  return {
    status: "pass",
    plugins: state.lock?.plugins ?? [],
    rootPlugins: state.lock?.rootPlugins ?? [],
    providers: state.lock?.providers ?? [],
    platformVersion: state.lock?.platformVersion,
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
  return {
    status: "pass",
    updates,
  };
}

export async function updatePlugins({
  root,
  target,
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
  const applicable = outdated.updates.filter((item) => selected.includes(item.id));
  if (dryRun || applicable.length === 0) {
    return {
      status: "pass",
      changed: false,
      updates: applicable,
    };
  }
  const providers = installed.providers.length > 0 ? installed.providers : undefined;
  const result = await installPlugins({
    root,
    target,
    pluginIds: selected,
    all: false,
    providers,
    force,
  });
  return {
    ...result,
    changed: true,
    updates: applicable,
  };
}

export async function removePlugins({
  root,
  target,
  pluginIds = [],
  all = false,
  force = false,
}) {
  const installed = await listInstalled({ target });
  const removeIds = new Set(pluginIds.map((item) => item.split("@")[0]));
  const installedRoots =
    installed.rootPlugins.length > 0
      ? installed.rootPlugins
      : installed.plugins.map((item) => item.id);
  const remainingRoots = all
    ? []
    : installedRoots.filter((id) => !removeIds.has(id));
  const desired =
    remainingRoots.length === 0
      ? {
          desiredFiles: new Map(),
          lock: {
            schemaVersion: 1,
            platformVersion: installed.platformVersion ?? "1.0.0",
            providers: [],
            rootPlugins: [],
            plugins: [],
          },
          ownership: { schemaVersion: 1, files: {} },
          plugins: [],
          providers: [],
        }
      : await buildDesiredState({
          root,
          pluginIds: remainingRoots,
          providers: installed.providers,
          rootPlugins: remainingRoots,
        });
  const plan = await planTransaction({
    target,
    desiredFiles: desired.desiredFiles,
    lock: desired.lock,
    ownership: desired.ownership,
    force,
  });
  await applyTransaction(plan);
  await writeJsonAtomic(
    path.join(target, ".ai-engineering", "installed-packs.yaml"),
    {
      schemaVersion: 1,
      packs: desired.lock.plugins,
    },
  );
  await writeJsonAtomic(path.join(target, ".ai-engineering", "lockfile.yaml"), {
    schemaVersion: 1,
    platformVersion: desired.lock.platformVersion,
    providers: desired.lock.providers,
    packs: desired.lock.plugins,
  });
  return {
    status: "pass",
    plugins: desired.plugins,
    providers: desired.providers,
  };
}
