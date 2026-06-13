import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { doctorProject } from "../src/doctor.mjs";
import { installPlugins } from "../src/lifecycle.mjs";
import { repoRoot } from "./helpers.mjs";
import { resolveInstallContext } from "../src/install-scope.mjs";

test("doctor validates initialized projects and generated adapters", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-doctor-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex", "cursor"],
    });

    const result = await doctorProject({ target });
    assert.equal(result.status, "pass");
    assert.deepEqual(result.packs, ["architecture", "application"]);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("global doctor validates native registrations without project assets", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-doctor-project-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-doctor-home-"));
  try {
    const context = resolveInstallContext({
      scope: "global",
      projectRoot: project,
      homeRoot: home,
    });
    await installPlugins({
      root: repoRoot,
      target: context.targetRoot,
      context,
      pluginIds: ["platform"],
      providers: ["claude"],
    });

    const result = await doctorProject({ target: home, context });
    assert.equal(result.scope, "global");
    assert.equal(result.mcpServers[0].name, "platform");
    assert.equal(result.mcpServers[0].toolCount, 3);
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});

test("doctor rejects provider registrations that do not match the runtime", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-doctor-project-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-doctor-home-"));
  try {
    const context = resolveInstallContext({
      scope: "global",
      projectRoot: project,
      homeRoot: home,
    });
    await installPlugins({
      root: repoRoot,
      target: context.targetRoot,
      context,
      pluginIds: ["platform"],
      providers: ["claude"],
    });
    const configPath = path.join(home, ".claude.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.mcpServers.platform.args = ["wrong.js"];
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

    await assert.rejects(
      doctorProject({ target: home, context }),
      /Claude registration does not match installed runtime: platform/,
    );
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});

test("doctor rejects deprecated target plugin roots", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-doctor-old-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["quality"],
      providers: ["codex"],
    });
    await mkdir(path.join(target, ".codex-plugin"));

    await assert.rejects(
      doctorProject({ target }),
      /deprecated target plugin folder remains active: .codex-plugin/,
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
