import assert from "node:assert/strict";
import test from "node:test";

import { validateHandlerParity } from "../../core/mcp/stdio-runtime.js";
import { validateStructuredToolContract } from "../src/contracts.mjs";

test("rejects missing MCP handlers", () => {
  assert.throws(
    () =>
      validateHandlerParity(
        { name: "test", tools: [{ name: "test.one" }] },
        {},
      ),
    /missing handlers: test.one/,
  );
});

test("rejects handlers without contracts", () => {
  assert.throws(
    () =>
      validateHandlerParity(
        { name: "test", tools: [{ name: "test.one" }] },
        {
          "test.one": () => ({}),
          "test.extra": () => ({}),
        },
      ),
    /handlers without contracts: test.extra/,
  );
});

test("accepts exact contract-handler parity", () => {
  assert.doesNotThrow(() =>
    validateHandlerParity(
      { name: "test", tools: [{ name: "test.one" }] },
      { "test.one": () => ({}) },
    ),
  );
});

test("validates structured MCP tool contracts", () => {
  assert.deepEqual(
    validateStructuredToolContract({
      name: "test.one",
      description: "Test tool.",
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    }),
    [],
  );
  assert.match(
    validateStructuredToolContract("test.one").join("\n"),
    /must use a structured definition/,
  );
});
