import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { findCommandPath, loadCanonicalCommand } from "../src/contracts.mjs";
import {
  projectProvider,
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
  assert.deepEqual(
    codex.files.map((file) => file.path),
    [".codex/agents/openai.yaml", ".codex/workflows/commands.md"],
  );
  assert.deepEqual(
    claude.files.map((file) => file.path),
    [".claude/commands/review-backend.md", ".claude-plugin/plugin.json"],
  );
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

test("global projections expose native files and user-level MCP configs", async () => {
  const command = await loadCanonicalCommand(
    await findCommandPath(repoRoot, "review-backend"),
  );
  const outputs = projectProviders({
    scope: "global",
    plugin: {
      metadata: {
        id: "platform",
        name: "AI Engineering Platform",
        version: "1.0.0",
      },
    },
    commands: [command],
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

  assert.deepEqual(
    outputs.codex.files.map((file) => file.path),
    [".codex/agents/openai.yaml", ".codex/workflows/commands.md"],
  );
  assert.deepEqual(
    outputs.claude.files.map((file) => file.path),
    [".claude/commands/review-backend.md"],
  );
  assert.deepEqual(outputs.cursor.files, []);
  assert.equal(outputs.codex.mcpConfig.path, ".codex/config.toml");
  assert.equal(outputs.claude.mcpConfig.path, ".claude.json");
  assert.equal(outputs.cursor.mcpConfig.path, ".cursor/mcp.json");
});

function projectionInput(provider, scope) {
  return {
    schemaVersion: 1,
    provider,
    scope,
    plugins: [{ id: "application", version: "1.0.0" }],
    skills: [
      {
        id: "java-analyze",
        sourcePath: "plugins/application/skills/java-analyze",
        owners: ["application"],
      },
    ],
    commands: [
      {
        id: "application.review_backend",
        pluginId: "application",
        slug: "review-backend",
        description: "Review backend source code.",
        version: "1.0.0",
        intent: "Review backend.",
        inputs: ["source scope"],
        requiredSkills: ["java-analyze"],
        steps: ["Inspect source."],
        outputContract: ["summary"],
        sourcePath: "plugins/application/commands/review-backend.md",
        markdown: "# Review Backend",
        owners: ["application"],
      },
    ],
    agents: [
      {
        id: "java-analyze",
        sourcePath: "adapters/codex/agents/java-analyze.toml",
        owners: ["application"],
      },
    ],
    hooks: [],
    mcpServers: {},
  };
}

test("projects exact provider-native project layouts", () => {
  const codex = projectProvider(projectionInput("codex", "project"));
  const claude = projectProvider(projectionInput("claude", "project"));
  const cursor = projectProvider(projectionInput("cursor", "project"));

  assert.deepEqual(
    codex.assets.map((item) => item.destinationPath),
    [
      ".agents/skills/java-analyze",
      ".codex/agents/java-analyze.toml",
      ".codex/agents/openai.yaml",
      ".codex/workflows/commands.md",
    ],
  );
  assert.deepEqual(
    claude.assets.map((item) => item.destinationPath),
    [
      ".claude/commands/review-backend.md",
      ".claude-plugin/plugin.json",
      ".claude/skills/java-analyze",
    ],
  );
  assert.deepEqual(
    cursor.assets.map((item) => item.destinationPath),
    [
      ".cursor/rules/provider.json",
      ".cursor/rules/review-backend.mdc",
    ],
  );
  assert.equal(codex.instructions[0].destinationPath, "AGENTS.md");
  assert.equal(claude.instructions[0].destinationPath, "CLAUDE.md");
  assert.equal(cursor.instructions[0].destinationPath, "AGENTS.md");
});

test("projects exact provider-native global layouts", () => {
  const codex = projectProvider(projectionInput("codex", "global"));
  const claude = projectProvider(projectionInput("claude", "global"));
  const cursor = projectProvider(projectionInput("cursor", "global"));

  assert.equal(codex.instructions[0].destinationPath, ".codex/AGENTS.md");
  assert.equal(claude.instructions[0].destinationPath, ".claude/CLAUDE.md");
  assert.equal(
    claude.assets.some(
      (item) => item.destinationPath === ".claude-plugin/plugin.json",
    ),
    false,
  );
  assert.deepEqual(cursor.assets, []);
  assert.equal(cursor.mcpConfig.destinationPath, ".cursor/mcp.json");
});
