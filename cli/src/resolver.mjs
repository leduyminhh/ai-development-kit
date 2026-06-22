import { PlatformError } from "./errors.mjs";
import { SUPPORTED_PROVIDER_SET } from "./provider-list.mjs";

function isPlatformCompatible(range, version) {
  const major = Number(version.split(".")[0]);
  const minimum = range?.match(/>=([0-9]+)\./);
  const maximum = range?.match(/<([0-9]+)\./);
  return (
    (!minimum || major >= Number(minimum[1])) &&
    (!maximum || major < Number(maximum[1]))
  );
}

function addOwners(target, values, pluginId) {
  for (const value of values) {
    const owners = target[value] ?? [];
    if (!owners.includes(pluginId)) {
      owners.push(pluginId);
      owners.sort();
    }
    target[value] = owners;
  }
}

export function resolvePluginGraph({
  requested,
  optional = [],
  plugins,
  platformVersion,
  providers,
}) {
  for (const provider of providers) {
    if (!SUPPORTED_PROVIDER_SET.has(provider)) {
      throw new PlatformError(`unsupported provider ${provider}`, {
        code: "AI_ENGINEERING_INCOMPATIBLE",
      });
    }
  }

  const resolved = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(pluginId) {
    const plugin = plugins.get(pluginId);
    if (!plugin) {
      throw new PlatformError(`unknown plugin ${pluginId}`, {
        code: "AI_ENGINEERING_UNKNOWN_PLUGIN",
      });
    }
    if (visiting.has(pluginId)) {
      throw new PlatformError(`dependency cycle detected at ${pluginId}`, {
        code: "AI_ENGINEERING_DEPENDENCY_CYCLE",
      });
    }
    if (visited.has(pluginId)) {
      return;
    }
    if (!isPlatformCompatible(plugin.compatibility?.platform, platformVersion)) {
      throw new PlatformError(
        `plugin ${pluginId} is incompatible with platform ${platformVersion}`,
        { code: "AI_ENGINEERING_INCOMPATIBLE" },
      );
    }
    for (const provider of providers) {
      if (plugin.compatibility?.providers?.[provider] !== "supported") {
        throw new PlatformError(
          `plugin ${pluginId} does not support provider ${provider}`,
          { code: "AI_ENGINEERING_INCOMPATIBLE" },
        );
      }
    }

    visiting.add(pluginId);
    for (const dependency of [...(plugin.dependencies?.required ?? [])].sort()) {
      visit(dependency);
    }
    visiting.delete(pluginId);
    visited.add(pluginId);
    resolved.push(pluginId);
  }

  const rootPlugins = [...new Set(requested)].sort();
  const optionalPlugins = [...new Set(optional)].sort();
  const allowedOptional = new Set(
    rootPlugins.flatMap(
      (pluginId) => plugins.get(pluginId)?.dependencies?.optional ?? [],
    ),
  );
  for (const pluginId of optionalPlugins) {
    if (!allowedOptional.has(pluginId)) {
      throw new PlatformError(
        `plugin ${pluginId} is not an optional dependency of the selected roots`,
        { code: "AI_ENGINEERING_INCOMPATIBLE" },
      );
    }
  }
  for (const pluginId of rootPlugins) {
    visit(pluginId);
  }
  for (const pluginId of optionalPlugins) {
    visit(pluginId);
  }

  const skills = new Set();
  const commands = new Set();
  const agents = new Set();
  const hooks = new Set();
const workflows = new Set();
  const ownership = { skills: {}, commands: {}, agents: {}, hooks: {}, workflows: {} };
  for (const pluginId of resolved) {
    const assets = plugins.get(pluginId).assets;
    for (const value of assets.skills ?? []) skills.add(value);
    for (const value of assets.commands ?? []) {
      const slug = value
        .replace(/^commands\//, "")
        .replace(/\.md$/, "");
      commands.add(`${pluginId}.${slug.replaceAll("-", "_")}`);
    }
    for (const value of assets.agents ?? []) agents.add(value);
    for (const value of assets.hooks ?? []) hooks.add(value);
    for (const value of assets.workflows ?? []) {
      const wfSlug = value
        .replace(/^workflows\//, "")
        .replace(/\.yaml$/, "");
      workflows.add(wfSlug);
    }
    addOwners(ownership.skills, assets.skills ?? [], pluginId);
    addOwners(
      ownership.commands,
      (assets.commands ?? []).map((value) => {
        const slug = value
          .replace(/^commands\//, "")
          .replace(/\.md$/, "");
        return `${pluginId}.${slug.replaceAll("-", "_")}`;
      }),
      pluginId,
    );
    addOwners(ownership.agents, assets.agents ?? [], pluginId);
    addOwners(ownership.hooks, assets.hooks ?? [], pluginId);
    addOwners(ownership.workflows, (assets.workflows ?? []).map((value) => {
      return value.replace(/^workflows\//, "").replace(/\.yaml$/, "");
    }), pluginId);
  }

  return {
    rootPlugins,
    requiredPlugins: resolved.filter(
      (pluginId) =>
        !rootPlugins.includes(pluginId) &&
        !optionalPlugins.includes(pluginId),
    ),
    optionalPlugins,
    pluginIds: resolved,
    skills: [...skills].sort(),
    commands: [...commands].sort(),
    agents: [...agents].sort(),
    hooks: [...hooks].sort(),
    workflows: [...workflows].sort(),
    providers: [...new Set(providers)].sort(),
    ownership,
  };
}

