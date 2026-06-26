import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";

async function existingPath(candidates) {
  for (const candidate of candidates) {
    try {
      await stat(candidate);
      return candidate;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return null;
}

function sourceCandidatesForAsset({ root, asset }) {
  if (asset.type === "skills") return [path.join(root, "plugins", asset.pluginId, "skills", asset.path)];
  if (asset.type === "agents") {
    return [
      path.join(root, "plugins", asset.pluginId, "agents", asset.path),
      path.join(root, "plugins", asset.pluginId, "skills", asset.path, "agents"),
    ];
  }
  return [path.join(root, "plugins", asset.pluginId, asset.path)];
}

function destinationPathForAsset({ stagedRoot, asset }) {
  if (asset.type === "commands") return path.join(stagedRoot, "plugins", asset.pluginId, asset.path);
  return path.join(stagedRoot, "plugins", asset.pluginId, asset.type, asset.path);
}

export async function stagePlatformArtifact({ root, resolution, stagedRoot }) {
  for (const pluginId of resolution.pluginIds) {
    const destination = path.join(stagedRoot, "plugins", pluginId, "plugin.yaml");
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, "plugins", pluginId, "plugin.yaml"), destination);
  }

  for (const asset of resolution.assets) {
    const source = await existingPath(sourceCandidatesForAsset({ root, asset }));
    if (!source) continue;
    const destination = destinationPathForAsset({ stagedRoot, asset });
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
  }
}
