import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { doctorProject } from "../src/doctor.mjs";
import { installPlugins } from "../src/lifecycle.mjs";
import { repoRoot } from "./helpers.mjs";

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
