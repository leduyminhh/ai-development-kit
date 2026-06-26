import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { normalizePluginManifest } from "../contracts/plugin.mjs";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function discoverPlugins({ root }) {
  const pluginsRoot = path.join(root, "plugins");
  const entries = await readdir(pluginsRoot, { withFileTypes: true });
  const plugins = new Map();

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const manifestPath = path.join(pluginsRoot, entry.name, "plugin.yaml");
    const manifest = await readJson(manifestPath);
    const plugin = normalizePluginManifest(manifest);
    plugins.set(plugin.id, {
      ...plugin,
      root: path.join(pluginsRoot, entry.name),
      manifestPath,
    });
  }

  return new Map([...plugins].sort(([left], [right]) => left.localeCompare(right)));
}