import { AiepError } from "./errors.mjs";

const SUPPORTED_PROVIDERS = new Set(["codex", "claude", "cursor"]);

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
  plugins,
  platformVersion,
  providers,
}) {
  for (const provider of providers) {
    if (!SUPPORTED_PROVIDERS.has(provider)) {
      throw new AiepError(`unsupported provider ${provider}`, {
        code: "AIEP_INCOMPATIBLE",
      });
    }
  }

  const resolved = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(pluginId) {
    const plugin = plugins.get(pluginId);
    if (!plugin) {
      throw new AiepError(`unknown plugin ${pluginId}`, {
        code: "AIEP_UNKNOWN_PLUGIN",
      });
    }
    if (visiting.has(pluginId)) {
      throw new AiepError(`dependency cycle detected at ${pluginId}`, {
        code: "AIEP_DEPENDENCY_CYCLE",
      });
    }
    if (visited.has(pluginId)) {
      return;
    }
    if (!isPlatformCompatible(plugin.compatibility?.platform, platformVersion)) {
      throw new AiepError(
        `plugin ${pluginId} is incompatible with platform ${platformVersion}`,
        { code: "AIEP_INCOMPATIBLE" },
      );
    }
    for (const provider of providers) {
      if (plugin.compatibility?.providers?.[provider] !== "supported") {
        throw new AiepError(
          `plugin ${pluginId} does not support provider ${provider}`,
          { code: "AIEP_INCOMPATIBLE" },
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

  for (const pluginId of [...new Set(requested)].sort()) {
    visit(pluginId);
  }

  const skills = new Set();
  const commands = new Set();
  const agents = new Set();
  const hooks = new Set();
  const ownership = { skills: {}, commands: {}, agents: {}, hooks: {} };
  for (const pluginId of resolved) {
    const assets = plugins.get(pluginId).assets;
    for (const value of assets.skills ?? []) skills.add(value);
    for (const value of assets.commands ?? []) commands.add(value);
    for (const value of assets.agents ?? []) agents.add(value);
    for (const value of assets.hooks ?? []) hooks.add(value);
    addOwners(ownership.skills, assets.skills ?? [], pluginId);
    addOwners(ownership.commands, assets.commands ?? [], pluginId);
    addOwners(ownership.agents, assets.agents ?? [], pluginId);
    addOwners(ownership.hooks, assets.hooks ?? [], pluginId);
  }

  return {
    pluginIds: resolved,
    skills: [...skills].sort(),
    commands: [...commands].sort(),
    agents: [...agents].sort(),
    hooks: [...hooks].sort(),
    providers: [...new Set(providers)].sort(),
    ownership,
  };
}
