import { discoverPlugins } from "../discovery/discover-plugins.mjs";
import { resolveDependencyGraph } from "./dependency-graph.mjs";
import { resolveAssets } from "./resolve-assets.mjs";

export async function resolvePlatform({ root, requested, optional = [], platformVersion, providers }) {
  const plugins = await discoverPlugins({ root });
  const graph = resolveDependencyGraph({ requested, optional, plugins, platformVersion, providers });
  const assetResult = resolveAssets({ pluginIds: graph.pluginIds, plugins });

  return {
    platformVersion,
    providers: [...providers].sort((left, right) => left.localeCompare(right)),
    plugins,
    pluginIds: graph.pluginIds,
    graph: graph.edges,
    assets: assetResult.assets,
    ownership: assetResult.ownership,
  };
}