import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  checkCommandOutput,
  validateAgainstSchema,
} from "../src/schema-validate.mjs";
import { repoRoot } from "./helpers.mjs";

const SCHEMA = {
  type: "object",
  required: ["title", "items"],
  properties: {
    title: { type: "string", minLength: 1 },
    items: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    mode: { enum: ["a", "b"] },
  },
  additionalProperties: false,
};

test("validateAgainstSchema accepts a valid document", () => {
  assert.deepEqual(
    validateAgainstSchema(SCHEMA, { title: "x", items: ["a"], mode: "a" }),
    [],
  );
});

test("validateAgainstSchema reports missing, type, enum, and extra errors", () => {
  const errors = validateAgainstSchema(SCHEMA, {
    items: [],
    mode: "c",
    extra: 1,
  });
  assert.ok(errors.some((message) => /missing required property "title"/.test(message)));
  assert.ok(errors.some((message) => /items: expected at least 1 item/.test(message)));
  assert.ok(errors.some((message) => /is not one of/.test(message)));
  assert.ok(errors.some((message) => /unexpected property "extra"/.test(message)));
});

test("checkCommandOutput validates a document against a plugin schema", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-schema-"));
  try {
    const good = path.join(dir, "good.json");
    await writeFile(
      good,
      JSON.stringify({
        currentDataContract: "v1",
        targetDataContract: "v2",
        migrationStages: ["expand"],
        rollbackProcedure: ["revert"],
      }),
    );
    const okResult = await checkCommandOutput({
      root: repoRoot,
      pluginId: "data",
      file: good,
    });
    assert.equal(okResult.ok, true);
    assert.equal(okResult.schema, "schemas/data-migration-context.schema.json");

    const bad = path.join(dir, "bad.json");
    await writeFile(bad, JSON.stringify({ currentDataContract: "v1" }));
    const badResult = await checkCommandOutput({
      root: repoRoot,
      pluginId: "data",
      file: bad,
    });
    assert.equal(badResult.ok, false);
    assert.ok(badResult.errors.length > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
