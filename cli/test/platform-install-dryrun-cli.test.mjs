import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "./helpers.mjs";

test("install --platform --dry-run prints a plan and writes nothing", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-cli-"));
  try {
    const { exitCode, stdout } = await runCli(
      ["install", "platform", "--target", "codex", "--platform", "--dry-run"],
      { cwd: target },
    );
    assert.equal(exitCode, 0);
    assert.match(stdout, /Managed files:/);
    assert.match(stdout, /Providers: codex/);
    assert.deepEqual(await readdir(target), []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("install --platform --dry-run --json emits a structured plan", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-cli-json-"));
  try {
    const { exitCode, stdout } = await runCli(
      ["install", "platform", "--target", "codex", "--platform", "--dry-run", "--json"],
      { cwd: target },
    );
    assert.equal(exitCode, 0);
    const plan = JSON.parse(stdout);
    assert.ok(Array.isArray(plan.managedFiles));
    assert.deepEqual(plan.providers, ["codex"]);
    assert.deepEqual(await readdir(target), []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
