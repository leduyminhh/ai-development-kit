import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  loadCanonicalCommand,
  loadPlatform,
  loadPlugins,
  validateRepository,
} from "./contracts.mjs";
import {
  listFiles,
  replaceDirectoryAtomic,
  resolveInside,
  sha256File,
  writeJsonAtomic,
} from "./io.mjs";
import { projectProviders } from "./providers.mjs";
import { resolvePluginGraph } from "./resolver.mjs";
import { preparePluginDistribution } from "./distribution.mjs";

async function copyDirectory(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, {
    recursive: true,
    filter: (pathname) =>
      !pathname.includes("__pycache__") && !pathname.endsWith(".pyc"),
  });
}

export async function buildPlugin({ root, pluginId, outputRoot }) {
  await validateRepository(root);
  const platform = await loadPlatform(root);
  const plugins = await loadPlugins(root);
  const graph = resolvePluginGraph({
    requested: [pluginId],
    plugins,
    platformVersion: platform.product.version,
    providers: platform.providers.enabled,
  });
  const plugin = plugins.get(pluginId);
  await mkdir(outputRoot, { recursive: true });
  const temporaryRoot = await mkdtemp(path.join(outputRoot, ".ai-engineering-stage-"));
  const staged = path.join(temporaryRoot, "artifact");
  await mkdir(staged, { recursive: true });

  try {
    for (const skill of graph.skills) {
      await copyDirectory(
        path.join(root, "skills", skill),
        resolveInside(staged, `skills/${skill}`),
      );
    }

    const commands = [];
    for (const ownerId of graph.pluginIds) {
      for (const commandId of plugins.get(ownerId).assets.commands) {
        const source = path.join(root, "packages", ownerId, "commands", `${commandId}.md`);
        const destination = resolveInside(staged, `commands/${commandId}.md`);
        await mkdir(path.dirname(destination), { recursive: true });
        await cp(source, destination);
        commands.push(await loadCanonicalCommand(source));
      }
    }

    for (const agent of graph.agents) {
      const source = path.join(root, ".codex", "agents", `${agent}.toml`);
      const destination = resolveInside(staged, `agents/${agent}.toml`);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(source, destination);
    }
    await mkdir(resolveInside(staged, "hooks"), { recursive: true });
    await writeJsonAtomic(resolveInside(staged, "hooks/manifest.json"), {
      hooks: graph.hooks,
    });

    const projections = projectProviders({
      plugin,
      commands,
      skills: graph.skills,
      agents: graph.agents,
      hooks: graph.hooks,
    });
    for (const projection of Object.values(projections)) {
      for (const file of projection.files) {
        const destination = resolveInside(staged, file.path);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, file.content, "utf8");
      }
    }

    await writeJsonAtomic(resolveInside(staged, "plugin.json"), {
      apiVersion: "ai-engineering.dev/v1alpha1",
      kind: "PluginArtifact",
      metadata: plugin.metadata,
      compatibility: plugin.compatibility,
      dependencies: plugin.dependencies,
      assets: {
        skills: graph.skills,
        commands: graph.commands,
        agents: graph.agents,
        hooks: graph.hooks,
      },
    });
    await writeJsonAtomic(resolveInside(staged, "manifest.lock"), {
      schemaVersion: 1,
      platformVersion: platform.product.version,
      rootPlugin: pluginId,
      plugins: graph.pluginIds.map((id) => ({
        id,
        version: plugins.get(id).metadata.version,
      })),
      providers: graph.providers,
    });

    const checksums = {};
    for (const relative of await listFiles(staged)) {
      if (relative !== "checksums.json") {
        checksums[relative] = await sha256File(resolveInside(staged, relative));
      }
    }
    await writeJsonAtomic(resolveInside(staged, "checksums.json"), {
      algorithm: "sha256",
      files: checksums,
    });

    const destination = path.join(
      outputRoot,
      pluginId,
      plugin.metadata.version,
    );
    await replaceDirectoryAtomic(staged, destination);
    return { id: pluginId, version: plugin.metadata.version, path: destination };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function buildAllPlugins({ root, outputRoot }) {
  const plugins = await loadPlugins(root);
  const results = [];
  for (const pluginId of plugins.keys()) {
    results.push(await buildPlugin({ root, pluginId, outputRoot }));
  }
  return results;
}

export async function buildAllDistributions({ root, outputRoot }) {
  const pluginArtifacts = await buildAllPlugins({
    root,
    outputRoot: path.join(outputRoot, "plugins"),
  });
  const distributions = [];
  for (const artifact of pluginArtifacts) {
    distributions.push(
      await preparePluginDistribution({
        pluginId: artifact.id,
        version: artifact.version,
        artifactRoot: artifact.path,
        npmRoot: path.join(outputRoot, "npm"),
        releaseRoot: path.join(outputRoot, "releases"),
      }),
    );
  }
  return { pluginArtifacts, distributions };
}

export async function verifyPluginArtifact(artifactRoot) {
  const checksums = JSON.parse(
    await readFile(path.join(artifactRoot, "checksums.json"), "utf8"),
  );
  for (const [relative, expected] of Object.entries(checksums.files)) {
    const actual = await sha256File(resolveInside(artifactRoot, relative));
    if (actual !== expected) {
      throw new Error(`checksum mismatch: ${relative}`);
    }
  }
  return { status: "pass", fileCount: Object.keys(checksums.files).length };
}
