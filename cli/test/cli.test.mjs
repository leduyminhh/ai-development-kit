// cli/test/cli.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../index.mjs";

test("parseArgs đọc lệnh, provider, plugin, scope, yes", () => {
  const a = parseArgs(["install", "--provider", "claude", "--plugin", "application", "-g", "--yes"]);
  assert.equal(a._[0], "install");
  assert.deepEqual(a.providers, ["claude"]);
  assert.deepEqual(a.plugins, ["application"]);
  assert.equal(a.scope, "global");
  assert.equal(a.yes, true);
  assert.equal(a.explicit, true);
});

test("parseArgs mặc định: không cờ chọn → explicit=false", () => {
  const a = parseArgs(["install"]);
  assert.equal(a.explicit, false);
  assert.equal(a.scope, "project");
});
