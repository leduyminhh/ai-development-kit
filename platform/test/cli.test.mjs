import assert from "node:assert/strict";
import test from "node:test";

import { runCli } from "./helpers.mjs";

test("prints the platform version", async () => {
  const result = await runCli(["--version"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^1\.0\.0\s*$/);
  assert.equal(result.stderr, "");
});

test("prints lifecycle commands in help", async () => {
  const result = await runCli(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /aiep plugin install/);
  assert.match(result.stdout, /aiep update --all/);
  assert.equal(result.stderr, "");
});
