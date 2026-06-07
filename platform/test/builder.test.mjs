import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPlugin } from "../src/builder.mjs";
import { repoRoot } from "./helpers.mjs";

test("builds a deterministic standalone backend artifact", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-build-"));
  try {
    const first = await buildPlugin({ root: repoRoot, pluginId: "backend", outputRoot });
    const firstChecksums = JSON.parse(
      await readFile(path.join(first.path, "checksums.json"), "utf8"),
    );
    const second = await buildPlugin({ root: repoRoot, pluginId: "backend", outputRoot });
    const secondChecksums = JSON.parse(
      await readFile(path.join(second.path, "checksums.json"), "utf8"),
    );

    for (const relative of [
      "plugin.json",
      "commands/review-backend.md",
      "skills/java-analyze/SKILL.md",
      "adapters/codex/provider.json",
      "adapters/claude/provider.json",
      "adapters/cursor/provider.json",
      "manifest.lock",
    ]) {
      assert.ok(firstChecksums.files[relative], `missing checksum for ${relative}`);
    }
    assert.deepEqual(firstChecksums, secondChecksums);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
