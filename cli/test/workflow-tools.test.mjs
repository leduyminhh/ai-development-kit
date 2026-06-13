import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorkflowHandler,
  optionalStringArray,
  requiredString,
} from "../../core/mcp/workflow-tools.js";

test("normalizes required strings and optional arrays", () => {
  assert.equal(requiredString(" production ", "environment"), "production");
  assert.deepEqual(
    optionalStringArray([" zero downtime ", "audit"], "constraints"),
    ["zero downtime", "audit"],
  );
  assert.throws(() => requiredString(" ", "environment"), /environment is required/);
  assert.throws(
    () => optionalStringArray("audit", "constraints"),
    /constraints must be an array of non-empty strings/,
  );
});

test("creates deterministic workflow handlers without mutating input", async () => {
  const input = {
    scope: "checkout",
    risk: "payment regression",
    constraints: ["zero downtime"],
  };
  const before = structuredClone(input);
  const handler = createWorkflowHandler({
    required: ["scope", "risk"],
    optionalArrays: ["constraints"],
    build: ({ scope, risk, constraints }) => ({
      scope,
      risk,
      strategy: [`Prioritize ${risk}`],
      constraints,
    }),
  });

  const first = await handler(input);
  const second = await handler(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.deepEqual(first.constraints, ["zero downtime"]);
});
