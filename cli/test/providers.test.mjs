import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { findCommandPath, loadCanonicalCommand } from "../src/contracts.mjs";
import {
  projectClaude,
  projectCodex,
  projectCursor,
  projectProviders,
} from "../src/providers.mjs";
import { repoRoot } from "./helpers.mjs";

test("projects canonical command semantics for all providers", async () => {
  const command = await loadCanonicalCommand(
    await findCommandPath(repoRoot, "review-backend"),
  );
  const context = {
    plugin: { metadata: { id: "backend", name: "Backend Engineering", version: "1.0.0" } },
    commands: [command],
    skills: ["java-analyze", "code-shared-design", "test-automation-validate"],
    agents: ["java-analyze"],
    hooks: ["project-audit"],
  };

  const codex = projectCodex(context);
  const claude = projectClaude(context);
  const cursor = projectCursor(context);

  assert.equal(codex.manifest.provider, "codex");
  assert.match(codex.workflow, /review-backend/);
  assert.match(claude.command, /^---[\s\S]*description:/);
  assert.match(cursor.rule, /Required Skills/);
  assert.deepEqual(
    [codex.intent, claude.intent, cursor.intent],
    [command.intent, command.intent, command.intent],
  );
});

test("emits only contained relative provider paths", async () => {
  const command = await loadCanonicalCommand(
    await findCommandPath(repoRoot, "review-backend"),
  );
  const outputs = projectProviders({
    plugin: { metadata: { id: "backend", name: "Backend Engineering", version: "1.0.0" } },
    commands: [command],
    skills: ["java-analyze"],
    agents: [],
    hooks: [],
  });

  assert.deepEqual(Object.keys(outputs).sort(), [
    "claude",
    "codex",
    "cursor",
  ]);
  for (const provider of Object.values(outputs)) {
    for (const output of provider.files) {
      assert.equal(path.isAbsolute(output.path), false);
      assert.equal(output.path.split(/[\\/]/).includes(".."), false);
    }
  }
});
