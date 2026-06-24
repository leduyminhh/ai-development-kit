import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./helpers.mjs";

const schemaPath = path.join(
  repoRoot,
  "plugins",
  "application",
  "schemas",
  "feature-context.schema.json",
);

test("defines the required feature context fields and strict stack signals", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));

  assert.deepEqual(schema.required, [
    "featureGoal",
    "acceptanceCriteria",
    "sourceScopes",
    "stackSignals",
    "artifacts",
    "verification",
    "residualRisks",
  ]);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.acceptanceCriteria.minItems, 1);
  assert.equal(schema.properties.sourceScopes.minItems, 1);
  assert.equal(schema.properties.stackSignals.items.additionalProperties, false);
  assert.deepEqual(schema.properties.stackSignals.items.properties.stack.enum, [
    "java-spring",
    "fastapi",
    "django-drf",
    "python-ambiguous",
    "react",
  ]);

  for (const property of [
    "uiStates",
    "apiOperations",
    "dataChanges",
    "securityRequirements",
    "testMatrix",
  ]) {
    assert.equal(schema.properties[property].type, "array");
    assert.equal(schema.properties[property].items.type, "string");
  }
});
