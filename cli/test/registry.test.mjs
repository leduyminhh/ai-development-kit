import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildAllPlugins } from "../src/builder.mjs";
import { generateRegistry, resolveArtifactSource } from "../src/registry.mjs";
import { repoRoot } from "./helpers.mjs";

test("generates sorted npm and GitHub registry entries", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-registry-"));
  try {
    const artifacts = path.join(temp, "plugins");
    await buildAllPlugins({ root: repoRoot, outputRoot: artifacts });
    const registry = await generateRegistry({
      root: repoRoot,
      artifactsRoot: artifacts,
      registryRoot: path.join(temp, "registry"),
    });
    assert.deepEqual(
      registry.plugins.map((item) => item.id),
      ["application", "architecture", "data", "knowledge", "platform", "quality", "security"],
    );
    const application = JSON.parse(
      await readFile(path.join(temp, "registry", "plugins", "application.json"), "utf8"),
    );
    const entry = application.versions[0];
    assert.equal(entry.npm.package, "@ai-engineering-platform/plugin-application");
    assert.match(entry.github.url, /ai-engineering-platform-application-1\.0\.0\.tgz$/);
    assert.equal(entry.npm.integrity, entry.github.integrity);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("falls back only when the primary source is unavailable", async () => {
  const entry = {
    npm: { package: "npm-source", integrity: "sha256-good" },
    github: { url: "github-source", integrity: "sha256-good" },
  };
  const fallback = await resolveArtifactSource(entry, async (source) => {
    if (source === "npm-source") {
      const error = new Error("unavailable");
      error.code = "AI_ENGINEERING_SOURCE_UNAVAILABLE";
      throw error;
    }
    return { source, integrity: "sha256-good" };
  });
  assert.equal(fallback.source, "github-source");

  await assert.rejects(
    resolveArtifactSource(entry, async () => ({ integrity: "sha256-bad" })),
    /integrity mismatch/,
  );
});
