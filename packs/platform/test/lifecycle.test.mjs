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

test("installs application project-locally with required dependencies", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-install-"));
  try {
    const result = await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex"],
    });
    const lock = JSON.parse(await readFile(path.join(target, ".ai-engineering/platform.lock"), "utf8"));
    const installedPacks = JSON.parse(
      await readFile(
        path.join(target, ".ai-engineering/installed-packs.yaml"),
        "utf8",
      ),
    );
    const mcp = JSON.parse(await readFile(path.join(target, ".mcp.json"), "utf8"));
    const applicationMcpEntrypoint = mcp.mcpServers.application.args[0];

    assert.deepEqual(result.plugins, ["architecture", "application"]);
    assert.deepEqual(lock.plugins.map((item) => item.id), ["architecture", "application"]);
    assert.deepEqual(
      installedPacks.packs.map((item) => item.id),
      ["architecture", "application"],
    );
    assert.equal(
      await exists(target, ".codex/skills/code-shared-design/SKILL.md"),
      true,
    );
    assert.equal(await exists(target, ".codex/agents/openai.yaml"), true);
    assert.equal(await exists(target, ".mcp.json"), true);
    assert.equal(applicationMcpEntrypoint.startsWith(target), true);
    assert.equal(applicationMcpEntrypoint.includes(`${path.sep}mcp-servers${path.sep}`), true);
    assert.equal(await exists(target, ".ai-engineering/mcp-servers/application-mcp/src/index.js"), true);
    assert.equal(await exists(target, "AGENTS.md"), true);
    assert.equal(await exists(target, ".codex-plugin/plugin.json"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("installs all plugins and stops on unmanaged conflicts", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-install-all-"));
  try {
    const all = await installPlugins({
      root: repoRoot,
      target,
      all: true,
      providers: ["codex", "claude", "cursor"],
    });
    assert.equal(all.plugins.length, 7);

    await writeFile(path.join(target, ".cursor/rules/provider.json"), "user\n", {
      flag: "a",
    });
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
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-install-"));
  try {
    const result = await runCli(
      ["plugin", "install", "application", "--provider", "codex", "--json"],
      { cwd: target },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.equal(await exists(target, ".codex/agents/openai.yaml"), true);
    assert.equal(await exists(target, ".codex-plugin/plugin.json"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("lists, detects outdated plugins, and supports dry-run updates", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-update-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex"],
    });
    const installed = await listInstalled({ target });
    assert.deepEqual(installed.plugins.map((item) => item.id), ["architecture", "application"]);

    const registry = {
      application: { latest: "1.1.0" },
      architecture: { latest: "1.0.0" },
    };
    const outdated = await findOutdated({ target, registry });
    assert.equal(outdated.updates[0].id, "application");
    assert.equal(outdated.updates[0].latest, "1.1.0");

    const dryRun = await updatePlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      registry,
      dryRun: true,
    });
    assert.equal(dryRun.changed, false);
    const lockAfterDryRun = JSON.parse(
      await readFile(path.join(target, ".ai-engineering/platform.lock"), "utf8"),
    );
    assert.equal(
      lockAfterDryRun.plugins.find((item) => item.id === "application").version,
      "1.0.0",
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli lists installed plugins and reports outdated plugins", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-update-"));
  try {
    await runCli(["plugin", "install", "application", "--provider", "codex"], { cwd: target });
    const list = await runCli(["plugin", "list", "--json"], { cwd: target });
    assert.equal(list.exitCode, 0);
    assert.deepEqual(
      JSON.parse(list.stdout).plugins.map((item) => item.id),
      ["architecture", "application"],
    );

    const outdated = await runCli(["plugin", "outdated", "--json"], { cwd: target });
    assert.equal(outdated.exitCode, 0);
    assert.deepEqual(JSON.parse(outdated.stdout).updates, []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("removes plugins by ownership and preserves user-owned files", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-remove-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application", "quality"],
      providers: ["codex"],
    });
    await writeFile(path.join(target, "user-owned.txt"), "keep\n");

    await removePlugins({ root: repoRoot, target, pluginIds: ["application"] });
    assert.equal(
      await exists(target, ".codex/skills/test-automation-validate/SKILL.md"),
      true,
    );
    assert.equal(
      await exists(target, ".codex/skills/java-analyze/SKILL.md"),
      false,
    );
    assert.equal(await exists(target, "user-owned.txt"), true);

    await removePlugins({ root: repoRoot, target, all: true });
    assert.equal(await exists(target, ".ai-engineering/install-state.json"), false);
    assert.equal(await exists(target, "user-owned.txt"), true);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli removes an installed plugin", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-remove-"));
  try {
    await runCli(["plugin", "install", "application", "--provider", "codex"], { cwd: target });
    const result = await runCli(["plugin", "remove", "application", "--json"], { cwd: target });
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.equal(
      await exists(target, ".codex/skills/java-analyze/SKILL.md"),
      false,
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
