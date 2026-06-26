import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { resolvePlatform } from "../src/platform/resolver/resolve-platform.mjs";
import { generatePlatformLockfile } from "../src/platform/lockfile/generate-lockfile.mjs";
import { validatePlatformContracts } from "../src/platform/validation/validate-platform-contracts.mjs";
import { resolutionToJson } from "../src/platform/cli-routing.mjs";
import { runCli, repoRoot } from "./helpers.mjs";

function directResolution() {
  return resolvePlatform({
    root: repoRoot,
    requested: ["platform"],
    optional: [],
    platformVersion: "1.0.0",
    providers: ["codex"],
  });
}

test("validate --platform routes to the platform contract validator", async () => {
  const { exitCode, stdout } = await runCli(["validate", "--platform", "--json"]);
  assert.equal(exitCode, 0);
  const result = JSON.parse(stdout);
  assert.equal(result.status, "pass");
  assert.ok(result.pluginCount >= 1);
  const direct = await validatePlatformContracts({ root: repoRoot });
  assert.equal(result.pluginCount, direct.pluginCount);
  assert.equal(result.assetCount, direct.assetCount);
});

test("doctor --platform passes in source mode", async () => {
  const { exitCode, stdout } = await runCli(["doctor", "--platform", "--json"]);
  assert.equal(exitCode, 0);
  const result = JSON.parse(stdout);
  assert.equal(result.status, "pass");
  assert.equal(result.scope, "source-platform");
});

test("resolve --json matches a direct resolvePlatform call", async () => {
  const { exitCode, stdout } = await runCli([
    "resolve",
    "platform",
    "--provider",
    "codex",
    "--json",
  ]);
  assert.equal(exitCode, 0);
  const result = JSON.parse(stdout);
  const direct = resolutionToJson(await directResolution());
  assert.deepEqual(result.pluginIds, direct.pluginIds);
  assert.deepEqual(result.graph, direct.graph);
  assert.deepEqual(result.providers, direct.providers);
});

test("resolve --write-lock writes a lockfile equal to generatePlatformLockfile", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "m5-resolve-"));
  const lockPath = path.join(dir, "platform.lock");
  try {
    const { exitCode } = await runCli([
      "resolve",
      "platform",
      "--provider",
      "codex",
      "--write-lock",
      lockPath,
    ]);
    assert.equal(exitCode, 0);
    const written = JSON.parse(await readFile(lockPath, "utf8"));
    const expected = generatePlatformLockfile(await directResolution());
    assert.deepEqual(written, expected);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("resolve --write-lock without a path is a usage error", async () => {
  const { exitCode, stderr } = await runCli(["resolve", "platform", "--write-lock"]);
  assert.equal(exitCode, 1);
  assert.match(stderr, /--write-lock <path>/);
});
