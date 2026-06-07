import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadCanonicalCommand, loadPlatform, loadPlugins } from "./contracts.mjs";
import { listFiles } from "./io.mjs";
import { projectProviders } from "./providers.mjs";
import { resolvePluginGraph } from "./resolver.mjs";
import { applyTransaction, planTransaction } from "./transaction.mjs";
import { readPlatformState } from "./state.mjs";

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
      aiep: {
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

export async function installPlugins({
  root,
  target,
  pluginIds = [],
  all = false,
  providers,
  force = false,
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
    for (const [relativePath, content] of await readDirectoryFiles(
      path.join(root, "skills", skill),
      `skills/${skill}`,
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

  const commands = [];
  for (const pluginId of graph.pluginIds) {
    const plugin = plugins.get(pluginId);
    for (const commandId of plugin.assets.commands) {
      const source = path.join(root, "packages", pluginId, "commands", `${commandId}.md`);
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
      await readFile(path.join(root, ".codex", "agents", `${agent}.toml`), "utf8"),
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

  const providerPaths = {
    codex: ".codex-plugin/plugin.json",
    claude: ".claude-plugin/plugin.json",
    cursor: ".cursor-plugin/plugin.json",
  };
  for (const provider of graph.providers) {
    const relativePath = providerPaths[provider];
    desiredFiles.set(relativePath, providerManifest(platform, graph, provider));
    addOwnership(ownershipFiles, relativePath, graph.pluginIds, provider, false);
  }

  const lock = {
    schemaVersion: 1,
    platformVersion: platform.product.version,
    providers: graph.providers,
    plugins: graph.pluginIds.map((id) => ({
      id,
      version: plugins.get(id).metadata.version,
    })),
  };
  const plan = await planTransaction({
    target,
    desiredFiles,
    lock,
    ownership: { schemaVersion: 1, files: ownershipFiles },
    force,
  });
  await applyTransaction(plan);
  return {
    status: "pass",
    plugins: graph.pluginIds,
    providers: graph.providers,
  };
}

export async function listInstalled({ target }) {
  const state = await readPlatformState(target);
  return {
    status: "pass",
    plugins: state.lock?.plugins ?? [],
    providers: state.lock?.providers ?? [],
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
