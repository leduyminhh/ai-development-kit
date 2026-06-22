import assert from "node:assert/strict";
import test from "node:test";

import { loadPlatform, loadPlugins } from "../src/contracts.mjs";
import {
  validateProjectionPlan,
} from "../src/projection-contracts.mjs";
import { buildProjectionInput } from "../src/projection-input.mjs";
import { resolvePluginGraph } from "../src/resolver.mjs";
import { repoRoot } from "./helpers.mjs";

test("builds one provider-neutral projection input", async () => {
  const platform = await loadPlatform(repoRoot);
  const plugins = await loadPlugins(repoRoot);
  const graph = resolvePluginGraph({
    requested: ["application"],
    optional: [],
    plugins,
    platformVersion: platform.product.version,
    providers: ["claude"],
  });
  const input = await buildProjectionInput({
    root: repoRoot,
    graph,
    plugins,
    scope: "project",
    provider: "claude",
    mcpServers: {},
  });

  assert.equal(input.schemaVersion, 1);
  assert.equal(input.provider, "claude");
  assert.ok(input.commands.some((item) => item.id === "application.review_backend"));
  assert.equal(
    input.commands.some((item) => Object.hasOwn(item, "destinationPath")),
    false,
  );
  assert.deepEqual(
    input.skills[0].owners,
    [...input.skills[0].owners].sort(),
  );
});

test("rejects escaping projection destinations", () => {
  assert.throws(
    () =>
      validateProjectionPlan({
        schemaVersion: 1,
        provider: "claude",
        scope: "project",
        assets: [
          {
            operation: "render",
            assetType: "command",
            assetId: "application.review_backend",
            destinationPath: "../review.md",
            content: "one",
            owners: ["application"],
            shared: false,
          },
        ],
        instructions: [],
      }),
    /escapes target root/,
  );
});

test("accepts antigravity projection provider", () => {
  const result = validateProjectionPlan({
    schemaVersion: 1,
    provider: "antigravity",
    scope: "project",
    assets: [
      {
        operation: "render",
        assetType: "provider-manifest",
        assetId: "antigravity.plugin",
        destinationPath: "antigravity-plugin.json",
        content: "{}\n",
        owners: ["application"],
        shared: false,
      },
    ],
    instructions: [],
    mcpConfig: {
      destinationPath: "mcp/mcp.json",
      format: "json",
      rootKey: "mcpServers",
      servers: {},
    },
  });

  assert.equal(result.provider, "antigravity");
  assert.equal(result.mcpConfig.destinationPath, "mcp/mcp.json");
});

test("rejects unknown projection provider", () => {
  assert.throws(
    () =>
      validateProjectionPlan({
        schemaVersion: 1,
        provider: "copilot",
        scope: "project",
        assets: [],
        instructions: [],
      }),
    /unsupported projection provider copilot/,
  );
});

test("rejects duplicate projection destinations", () => {
  assert.throws(
    () =>
      validateProjectionPlan({
        schemaVersion: 1,
        provider: "claude",
        scope: "project",
        assets: [
          {
            operation: "render",
            assetType: "command",
            assetId: "application.first",
            destinationPath: ".claude/commands/review.md",
            content: "one",
            owners: ["application"],
            shared: false,
          },
          {
            operation: "render",
            assetType: "command",
            assetId: "application.second",
            destinationPath: ".claude/commands/review.md",
            content: "two",
            owners: ["application"],
            shared: false,
          },
        ],
        instructions: [],
      }),
    /duplicate destination/,
  );
});

test("preserves resolved ownership in projected assets", () => {
  const result = validateProjectionPlan({
    schemaVersion: 1,
    provider: "claude",
    scope: "project",
    assets: [
      {
        operation: "copy",
        assetType: "skill",
        assetId: "java-analyze",
        sourcePath: "plugins/application/skills/java-analyze",
        destinationPath: ".claude/skills/java-analyze",
        owners: ["application", "architecture"],
        shared: true,
      },
    ],
    instructions: [],
  });

  assert.deepEqual(result.assets[0].owners, [
    "application",
    "architecture",
  ]);
  assert.equal(result.assets[0].assetType, "skill");
  assert.equal(result.assets[0].assetId, "java-analyze");
});
