import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { detectProviders } from "../src/provider-detection.mjs";

test("detects every provider signal deterministically", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "provider-detection-"));
  try {
    await mkdir(path.join(target, ".codex"));
    await writeFile(path.join(target, "CLAUDE.md"), "# Claude\n");
    await mkdir(path.join(target, ".cursor"));
    assert.deepEqual(await detectProviders({ projectRoot: target }), [
      "claude",
      "codex",
      "cursor",
    ]);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("returns no providers when no deterministic signal exists", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "provider-empty-"));
  try {
    assert.deepEqual(await detectProviders({ projectRoot: target }), []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
