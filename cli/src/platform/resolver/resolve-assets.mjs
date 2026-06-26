import { createAssetDescriptors } from "../contracts/asset.mjs";

export function resolveAssets({ pluginIds, plugins }) {
  const descriptorsById = new Map();
  const ownership = {};

  for (const pluginId of pluginIds) {
    const plugin = plugins.get(pluginId);
    for (const descriptor of createAssetDescriptors({ pluginId, assets: plugin.assets })) {
      descriptorsById.set(descriptor.id, descriptor);
      ownership[descriptor.id] = [...(ownership[descriptor.id] ?? []), pluginId].sort();
    }
  }

  const assets = [...descriptorsById.values()].sort((left, right) => left.id.localeCompare(right.id));
  return { assets, ownership };
}
