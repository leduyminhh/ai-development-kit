import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  loadCanonicalCommand,
  validateCanonicalCommand,
} from "../src/command-contracts.mjs";
import { repoRoot } from "./helpers.mjs";

test("loads one canonical namespaced command model", async () => {
  const sourcePath = path.join(
    repoRoot,
    "plugins/application/commands/review-backend.md",
  );
  const command = await loadCanonicalCommand({
    sourcePath,
    pluginId: "application",
    pluginVersion: "1.0.0",
    repositoryRoot: repoRoot,
  });

  assert.equal(command.id, "application.review_backend");
  assert.equal(command.pluginId, "application");
  assert.equal(command.slug, "review-backend");
  assert.equal(command.mcpTool, undefined);
  assert.equal(
    command.sourcePath,
    "plugins/application/commands/review-backend.md",
  );
  assert.deepEqual(command.outputContract, [
    "summary",
    "critical findings",
    "major findings",
    "test gaps",
    "verification",
  ]);
});

test("accepts a command without MCP metadata", async () => {
  const sourcePath = path.join(
    repoRoot,
    "plugins/application/commands/deliver-feature.md",
  );
  const command = await loadCanonicalCommand({
    sourcePath,
    pluginId: "application",
    pluginVersion: "1.0.0",
    repositoryRoot: repoRoot,
  });

  assert.equal(command.id, "application.deliver_feature");
  assert.equal(command.mcpTool, undefined);
  assert.deepEqual(validateCanonicalCommand(command), []);
});
