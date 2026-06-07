import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  findOutdated,
  installPlugins,
  listInstalled,
  removePlugins,
  updatePlugins,
} from "../src/lifecycle.mjs";
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

test("lists, detects outdated plugins, and supports dry-run updates", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-update-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["backend"],
      providers: ["codex"],
    });
    const installed = await listInstalled({ target });
    assert.deepEqual(installed.plugins.map((item) => item.id), ["architecture", "backend"]);

    const registry = {
      backend: { latest: "1.1.0" },
      architecture: { latest: "1.0.0" },
    };
    const outdated = await findOutdated({ target, registry });
    assert.equal(outdated.updates[0].id, "backend");
    assert.equal(outdated.updates[0].latest, "1.1.0");

    const dryRun = await updatePlugins({
      root: repoRoot,
      target,
      pluginIds: ["backend"],
      registry,
      dryRun: true,
    });
    assert.equal(dryRun.changed, false);
    const lockAfterDryRun = JSON.parse(
      await readFile(path.join(target, ".aiep/platform.lock"), "utf8"),
    );
    assert.equal(lockAfterDryRun.plugins.find((item) => item.id === "backend").version, "1.0.0");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli lists installed plugins and reports outdated plugins", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-cli-update-"));
  try {
    await runCli(["plugin", "install", "backend", "--provider", "codex"], { cwd: target });
    const list = await runCli(["plugin", "list", "--json"], { cwd: target });
    assert.equal(list.exitCode, 0);
    assert.deepEqual(
      JSON.parse(list.stdout).plugins.map((item) => item.id),
      ["architecture", "backend"],
    );

    const outdated = await runCli(["plugin", "outdated", "--json"], { cwd: target });
    assert.equal(outdated.exitCode, 0);
    assert.deepEqual(JSON.parse(outdated.stdout).updates, []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("removes plugins by ownership and preserves user-owned files", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-remove-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["backend", "testing"],
      providers: ["codex"],
    });
    await writeFile(path.join(target, "user-owned.txt"), "keep\n");

    await removePlugins({ root: repoRoot, target, pluginIds: ["backend"] });
    assert.equal(await exists(target, "skills/test-automation-validate/SKILL.md"), true);
    assert.equal(await exists(target, "skills/java-analyze/SKILL.md"), false);
    assert.equal(await exists(target, "user-owned.txt"), true);

    await removePlugins({ root: repoRoot, target, all: true });
    assert.equal(await exists(target, ".aiep/install-state.json"), false);
    assert.equal(await exists(target, "user-owned.txt"), true);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli removes an installed plugin", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-cli-remove-"));
  try {
    await runCli(["plugin", "install", "backend", "--provider", "codex"], { cwd: target });
    const result = await runCli(["plugin", "remove", "backend", "--json"], { cwd: target });
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.equal(await exists(target, "skills/java-analyze/SKILL.md"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
