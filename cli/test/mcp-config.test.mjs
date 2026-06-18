import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import * as TOML from "@iarna/toml";

import {
  createMcpRegistrations,
  mergeCodexMcpConfig,
  mergeJsonMcpConfig,
  removeManagedMcpConfig,
} from "../src/mcp-config.mjs";

const platformRegistration = {
  command: "node",
  args: ["C:\\runtime\\platform\\src\\index.js"],
  env: {},
};

test("creates canonical MCP registrations from the runtime root", () => {
  const runtimeRoot = path.resolve("runtime");
  const registrations = createMcpRegistrations({
    serverIds: ["platform"],
    runtimeRoot,
  });

  assert.deepEqual(registrations.platform, {
    command: "node",
    args: [
      path.join(
        runtimeRoot,
        "mcp-servers",
        "platform",
        "src",
        "index.js",
      ),
    ],
    env: {},
  });
});

test("merges Codex MCP config without replacing user settings", () => {
  const currentText = [
    'model = "gpt-5"',
    "",
    "[mcp_servers.user_owned]",
    'command = "user-command"',
    "",
  ].join("\n");

  const result = mergeCodexMcpConfig({
    currentText,
    desired: { platform: platformRegistration },
    previouslyManaged: [],
    force: false,
  });
  const parsed = TOML.parse(result.content);

  assert.equal(parsed.model, "gpt-5");
  assert.equal(parsed.mcp_servers.user_owned.command, "user-command");
  assert.deepEqual(parsed.mcp_servers.platform.args, platformRegistration.args);
  assert.deepEqual(result.managedNames, ["platform"]);
});

test("merges JSON MCP config while preserving sibling keys", () => {
  const currentText = JSON.stringify({
    projects: { "C:\\work": { trusted: true } },
    rules: { enabled: true },
    mcpServers: {
      user_owned: { command: "user-command", args: [] },
    },
  });

  const result = mergeJsonMcpConfig({
    currentText,
    desired: { platform: platformRegistration },
    previouslyManaged: [],
    force: false,
    provider: "Claude",
  });
  const parsed = JSON.parse(result.content);

  assert.equal(parsed.projects["C:\\work"].trusted, true);
  assert.equal(parsed.rules.enabled, true);
  assert.equal(parsed.mcpServers.user_owned.command, "user-command");
  assert.deepEqual(parsed.mcpServers.platform, platformRegistration);
});

test("rejects unmanaged MCP name conflicts unless forced", () => {
  const currentText = JSON.stringify({
    mcpServers: { platform: { command: "user-command", args: [] } },
  });

  assert.throws(
    () =>
      mergeJsonMcpConfig({
        currentText,
        desired: { platform: platformRegistration },
        previouslyManaged: [],
        force: false,
        provider: "Cursor",
      }),
    /unmanaged MCP server already exists: platform/,
  );
});

test("reports malformed provider config", () => {
  assert.throws(
    () =>
      mergeCodexMcpConfig({
        currentText: "[invalid",
        desired: {},
        previouslyManaged: [],
      }),
    /Cannot parse Codex MCP config/,
  );
  assert.throws(
    () =>
      mergeJsonMcpConfig({
        currentText: "{",
        desired: {},
        previouslyManaged: [],
        provider: "Claude",
      }),
    /Cannot parse Claude MCP config/,
  );
});

test("removes only managed server names", () => {
  const currentText = JSON.stringify({
    mcpServers: {
      platform: platformRegistration,
      user_owned: { command: "user-command", args: [] },
    },
  });

  const result = removeManagedMcpConfig({
    provider: "claude",
    currentText,
    managedNames: ["platform"],
  });
  const parsed = JSON.parse(result.content);

  assert.equal(parsed.mcpServers.platform, undefined);
  assert.equal(parsed.mcpServers.user_owned.command, "user-command");
});
