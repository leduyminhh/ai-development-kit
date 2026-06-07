import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { installPlugins } from "../src/lifecycle.mjs";
import { repoRoot, runCli } from "./helpers.mjs";

async function exists(root, relativePath) {
  try {
    await readFile(path.join(root, relativePath));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

test("installs backend project-locally with required dependencies", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-install-"));
  try {
    const result = await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["backend"],
      providers: ["codex"],
    });
    const lock = JSON.parse(await readFile(path.join(target, ".aiep/platform.lock"), "utf8"));

    assert.deepEqual(result.plugins, ["architecture", "backend"]);
    assert.deepEqual(lock.plugins.map((item) => item.id), ["architecture", "backend"]);
    assert.equal(await exists(target, "skills/code-shared-design/SKILL.md"), true);
    assert.equal(await exists(target, ".codex-plugin/plugin.json"), true);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("installs all plugins and stops on unmanaged conflicts", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-install-all-"));
  try {
    const all = await installPlugins({
      root: repoRoot,
      target,
      all: true,
      providers: ["codex", "claude", "cursor"],
    });
    assert.equal(all.plugins.length, 6);

    await writeFile(path.join(target, ".cursor-plugin/plugin.json"), "user\n");
    await assert.rejects(
      installPlugins({
        root: repoRoot,
        target,
        all: true,
        providers: ["cursor"],
      }),
      /conflict/,
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli installs a plugin into the current project", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-cli-install-"));
  try {
    const result = await runCli(
      ["plugin", "install", "backend", "--provider", "codex", "--json"],
      { cwd: target },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.equal(await exists(target, ".codex-plugin/plugin.json"), true);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
