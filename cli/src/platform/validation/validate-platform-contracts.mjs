import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { createAssetDescriptors } from "../contracts/asset.mjs";
import { normalizePluginManifest } from "../contracts/plugin.mjs";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function validatePlatformContracts({ root }) {
  const pluginsRoot = path.join(root, "plugins");
  const entries = await readdir(pluginsRoot, { withFileTypes: true });
  const plugins = [];
  const assets = [];

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const manifestPath = path.join(pluginsRoot, entry.name, "plugin.yaml");
    const manifest = await readJson(manifestPath);
    const plugin = normalizePluginManifest(manifest);
    plugins.push(plugin);
    assets.push(...createAssetDescriptors({ pluginId: plugin.id, assets: plugin.assets }));
  }

  plugins.sort((left, right) => left.id.localeCompare(right.id));
  assets.sort((left, right) => left.id.localeCompare(right.id));

  return {
    status: "pass",
    pluginCount: plugins.length,
    assetCount: assets.length,
    pluginIds: plugins.map((plugin) => plugin.id),
    assetIds: assets.map((asset) => asset.id),
  };
}