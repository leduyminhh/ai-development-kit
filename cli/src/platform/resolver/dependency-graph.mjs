import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";
import { assertPluginCompatibility } from "./compatibility.mjs";

export function uniqueSorted(values = []) {
  return [...new Set(values)].sort((left, right) => String(left).localeCompare(String(right)));
}

export function resolveDependencyGraph({ requested, optional = [], plugins, platformVersion, providers }) {
  const rootPlugins = uniqueSorted(requested);
  const optionalPlugins = uniqueSorted(optional);
  const allowedOptional = new Set(
    rootPlugins.flatMap((pluginId) => plugins.get(pluginId)?.dependencies?.optional ?? []),
  );

  for (const pluginId of optionalPlugins) {
    assertCondition(
      allowedOptional.has(pluginId),
      `plugin ${pluginId} is not an optional dependency of the selected roots`,
      { code: PLATFORM_ERROR_CODES.INVALID_CONTRACT },
    );
  }

  const resolved = [];
  const visited = new Set();
  const visiting = new Set();
  const edges = [];

  function visit(pluginId, parentId = undefined) {
    const plugin = plugins.get(pluginId);
    assertCondition(plugin, `unknown plugin ${pluginId}`, {
      code: PLATFORM_ERROR_CODES.INVALID_CONTRACT,
    });
    assertCondition(!visiting.has(pluginId), `dependency cycle detected at ${pluginId}`, {
      code: PLATFORM_ERROR_CODES.INVALID_CONTRACT,
    });
    if (parentId) {
      edges.push({ from: parentId, to: pluginId, type: "required" });
    }
    if (visited.has(pluginId)) return;

    assertPluginCompatibility({ plugin, platformVersion, providers });
    visiting.add(pluginId);
    for (const dependencyId of uniqueSorted(plugin.dependencies?.required)) {
      visit(dependencyId, pluginId);
    }
    visiting.delete(pluginId);
    visited.add(pluginId);
    resolved.push(pluginId);
  }

  for (const pluginId of rootPlugins) visit(pluginId);
  for (const pluginId of optionalPlugins) {
    visit(pluginId);
  }

  return {
    pluginIds: resolved,
    edges: edges.sort((left, right) =>
      `${left.from}:${left.to}:${left.type}`.localeCompare(`${right.from}:${right.to}:${right.type}`),
    ),
  };
}
