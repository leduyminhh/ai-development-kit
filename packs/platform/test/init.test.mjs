import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initializeProject } from "../src/init.mjs";
import { repoRoot } from "./helpers.mjs";

test("initializes a project with AGENTS template and platform state", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-init-"));
  try {
    const result = await initializeProject({ root: repoRoot, target });

    assert.equal(result.status, "pass");
    assert.match(
      await readFile(path.join(target, "AGENTS.md"), "utf8"),
      /AI-ENGINEERING:BEGIN AGENTS_BASELINE/,
    );
    assert.equal(
      JSON.parse(
        await readFile(path.join(target, ".ai-engineering", "manifest.yaml"), "utf8"),
      ).platform,
      "ai-engineering-platform",
    );
    assert.deepEqual(
      JSON.parse(
        await readFile(path.join(target, ".ai-engineering", "lockfile.yaml"), "utf8"),
      ).packs,
      [],
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("updates only the managed AGENTS block and creates a backup", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-init-merge-"));
  try {
    const agentsPath = path.join(target, "AGENTS.md");
    await writeFile(
      agentsPath,
      [
        "# Local Rules",
        "",
        "Purpose: keep this text unchanged.",
        "",
        "<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->",
        "old managed content",
        "<!-- AI-ENGINEERING:END AGENTS_BASELINE -->",
        "",
      ].join("\n"),
    );

    await initializeProject({ root: repoRoot, target });

    const merged = await readFile(agentsPath, "utf8");
    assert.match(merged, /Purpose: keep this text unchanged[.]/);
    assert.doesNotMatch(merged, /old managed content/);
    assert.equal(
      (
        await readFile(
          path.join(target, ".ai-engineering", "backups", "AGENTS.md"),
          "utf8",
        )
      ).includes("old managed content"),
      true,
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
