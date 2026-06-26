import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPlatformArtifact } from "../src/platform/build/build-platform-artifact.mjs";
import { listArtifactFiles, sha256File } from "../src/platform/build/list-artifact-files.mjs";
import { stagePlatformArtifact } from "../src/platform/build/stage-platform-artifact.mjs";
import { verifyPlatformArtifact } from "../src/platform/build/verify-platform-artifact.mjs";
import { resolvePlatform } from "../src/platform/resolver/resolve-platform.mjs";
import { repoRoot } from "./helpers.mjs";

test("lists artifact files in deterministic relative order", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "platform-build-list-"));
  await mkdir(path.join(root, "b"), { recursive: true });
  await mkdir(path.join(root, "a"), { recursive: true });
  await writeFile(path.join(root, "b", "two.txt"), "two", "utf8");
  await writeFile(path.join(root, "a", "one.txt"), "one", "utf8");

  assert.deepEqual(await listArtifactFiles(root), ["a/one.txt", "b/two.txt"]);
  assert.equal(await sha256File(path.join(root, "a", "one.txt")), "7692c3ad3540bb803c020b3aee66cd8887123234ea0c6e7143c0add73ff431ed");
});

test("stages provider-neutral files for resolved plugin assets", async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), "platform-build-stage-"));
  const resolution = await resolvePlatform({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
  });

  await stagePlatformArtifact({ root: repoRoot, resolution, stagedRoot: outputRoot });

  const files = await listArtifactFiles(outputRoot);
  assert.equal(files.includes("plugins/platform/plugin.yaml"), true);
  assert.equal(files.includes("plugins/platform/skills/incident-response/SKILL.md"), true);
  assert.equal(files.includes("plugins/platform/commands/respond-incident.md"), true);
  assert.match(await readFile(path.join(outputRoot, "plugins/platform/plugin.yaml"), "utf8"), /Platform Engineering/);
});

test("builds deterministic provider-neutral platform artifact", async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), "platform-build-output-"));

  const first = await buildPlatformArtifact({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
    outputRoot,
  });
  const second = await buildPlatformArtifact({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
    outputRoot,
  });

  assert.equal(first.path, second.path);
  assert.deepEqual(first.manifest, second.manifest);
  assert.equal(first.manifest.kind, "PlatformBuildArtifact");
  assert.equal(first.manifest.files.some((file) => file.path === "artifact.json"), true);
  assert.equal(first.manifest.files.some((file) => file.path === "checksums.json"), true);
});

test("verifies artifact checksums and rejects tampering", async () => {
  const outputRoot = await mkdtemp(path.join(tmpdir(), "platform-build-verify-"));
  const built = await buildPlatformArtifact({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
    outputRoot,
  });

  assert.equal((await verifyPlatformArtifact({ artifactRoot: built.path })).status, "pass");

  await writeFile(path.join(built.path, "plugins/platform/plugin.yaml"), "tampered", "utf8");
  await assert.rejects(
    () => verifyPlatformArtifact({ artifactRoot: built.path }),
    /checksum mismatch for plugins\/platform\/plugin.yaml/,
  );
});

