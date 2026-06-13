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
    scope: "project",
    plugin: { metadata: { id: "backend", name: "Backend Engineering", version: "1.0.0" } },
    commands: [command],
    skills: ["java-analyze", "code-shared-design", "test-automation-validate"],
    agents: ["java-analyze"],
    hooks: ["project-audit"],
    mcpServers: {
      application: {
        command: "node",
        args: ["C:\\runtime\\application-mcp\\src\\index.js"],
        env: {},
      },
    },
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
  assert.equal(codex.mcpConfig.path, ".codex/config.toml");
  assert.equal(claude.mcpConfig.path, ".mcp.json");
  assert.equal(cursor.mcpConfig.path, ".cursor/mcp.json");
});

test("emits only contained relative provider paths", async () => {
  const command = await loadCanonicalCommand(
    await findCommandPath(repoRoot, "review-backend"),
  );
  const outputs = projectProviders({
    scope: "project",
    plugin: { metadata: { id: "backend", name: "Backend Engineering", version: "1.0.0" } },
    commands: [command],
    skills: ["java-analyze"],
    agents: [],
    hooks: [],
    mcpServers: {},
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

test("global projections expose only user-level MCP configs", async () => {
  const outputs = projectProviders({
    scope: "global",
    plugin: {
      metadata: {
        id: "platform",
        name: "AI Engineering Platform",
        version: "1.0.0",
      },
    },
    commands: [],
    skills: [],
    agents: [],
    hooks: [],
    mcpServers: {
      platform: {
        command: "node",
        args: ["C:\\runtime\\platform-mcp\\src\\index.js"],
        env: {},
      },
    },
  });

  assert.deepEqual(outputs.codex.files, []);
  assert.deepEqual(outputs.claude.files, []);
  assert.deepEqual(outputs.cursor.files, []);
  assert.equal(outputs.codex.mcpConfig.path, ".codex/config.toml");
  assert.equal(outputs.claude.mcpConfig.path, ".claude.json");
  assert.equal(outputs.cursor.mcpConfig.path, ".cursor/mcp.json");
});
