import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadPlatform, loadPlugins } from "./contracts.mjs";
import { sha256File, writeJsonAtomic } from "./io.mjs";

function integrity(hash) {
  return `sha256-${hash}`;
}

export async function generateRegistry({ root, artifactsRoot, registryRoot }) {
  const platform = await loadPlatform(root);
  const plugins = await loadPlugins(root);
  await mkdir(path.join(registryRoot, "plugins"), { recursive: true });
  const index = {
    apiVersion: "aiep.dev/v1alpha1",
    platformVersion: platform.product.version,
    plugins: [],
  };

  for (const [pluginId, plugin] of plugins) {
    const version = plugin.metadata.version;
    const artifactRoot = path.join(artifactsRoot, pluginId, version);
    const artifactIntegrity = integrity(
      await sha256File(path.join(artifactRoot, "checksums.json")),
    );
    const versionEntry = {
      version,
      platform: plugin.compatibility.platform,
      providers: Object.entries(plugin.compatibility.providers)
        .filter(([, support]) => support === "supported")
        .map(([provider]) => provider)
        .sort(),
      dependencies: [...plugin.dependencies.required].sort(),
      npm: {
        package: `@ai-engineering-platform/plugin-${pluginId}`,
        integrity: artifactIntegrity,
      },
      github: {
        url:
          `https://github.com/leduyminhh/ai-engineering-platform/releases/download/` +
          `v${version}/ai-engineering-platform-${pluginId}-${version}.tgz`,
        integrity: artifactIntegrity,
      },
    };
    await writeJsonAtomic(path.join(registryRoot, "plugins", `${pluginId}.json`), {
      apiVersion: "aiep.dev/v1alpha1",
      id: pluginId,
      name: plugin.metadata.name,
      versions: [versionEntry],
    });
    index.plugins.push({
      id: pluginId,
      name: plugin.metadata.name,
      latest: version,
      entry: `plugins/${pluginId}.json`,
    });
  }
  index.plugins.sort((left, right) => left.id.localeCompare(right.id));
  await writeJsonAtomic(path.join(registryRoot, "registry.json"), index);
  return index;
}

export async function loadRegistry(registryRoot) {
  return JSON.parse(await readFile(path.join(registryRoot, "registry.json"), "utf8"));
}

export async function resolveArtifactSource(entry, fetchSource) {
  let result;
  try {
    result = await fetchSource(entry.npm.package);
  } catch (error) {
    if (error.code !== "AIEP_SOURCE_UNAVAILABLE") {
      throw error;
    }
    result = await fetchSource(entry.github.url);
  }
  const expected =
    result.source === entry.github.url ? entry.github.integrity : entry.npm.integrity;
  if (result.integrity !== expected) {
    throw new Error(`integrity mismatch for ${result.source ?? "artifact source"}`);
  }
  return result;
}
