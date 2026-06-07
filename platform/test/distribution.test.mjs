import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPlugin } from "../src/builder.mjs";
import { preparePluginDistribution } from "../src/distribution.mjs";
import { extractPluginArchive } from "../src/archive.mjs";
import { repoRoot } from "./helpers.mjs";

test("prepares equivalent npm and GitHub release plugin artifacts", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "aiep-distribution-"));
  try {
    const artifact = await buildPlugin({
      root: repoRoot,
      pluginId: "backend",
      outputRoot: path.join(temp, "plugins"),
    });
    const distribution = await preparePluginDistribution({
      pluginId: "backend",
      version: "1.0.0",
      artifactRoot: artifact.path,
      npmRoot: path.join(temp, "npm"),
      releaseRoot: path.join(temp, "releases"),
    });
    const npmPackage = JSON.parse(
      await readFile(path.join(distribution.npmPackageRoot, "package.json"), "utf8"),
    );
    assert.equal(npmPackage.name, "@ai-engineering-platform/plugin-backend");
    assert.equal(npmPackage.aiep.artifact, "./artifact/plugin.json");

    const extracted = path.join(temp, "github-expanded");
    await extractPluginArchive({ archive: distribution.githubArchive, destination: extracted });
    for (const relative of ["plugin.json", "manifest.lock", "checksums.json"]) {
      assert.equal(
        await readFile(path.join(distribution.npmPackageRoot, "artifact", relative), "utf8"),
        await readFile(path.join(extracted, relative), "utf8"),
      );
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("documents AIEP lifecycle commands in both readmes", async () => {
  const expected = [
    "npx ai-engineering-platform --help",
    "aiep plugin install backend",
    "aiep install --all",
    "aiep plugin update backend",
    "aiep plugin remove backend",
    "npm install",
    "npm run build",
    "npm link",
  ];
  for (const file of ["README.md", "README_VI.md"]) {
    const content = await readFile(path.join(repoRoot, file), "utf8");
    for (const text of expected) {
      assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
});
