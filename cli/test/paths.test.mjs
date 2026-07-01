import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { PROVIDERS, scopeRoot, isProvider, manifestPath } from "../lib/paths.mjs";

test("PROVIDERS liệt kê đủ 4 provider theo thứ tự chuẩn", () => {
  assert.deepEqual(PROVIDERS, ["antigravity", "claude", "codex", "cursor"]);
});

test("isProvider phân biệt provider hợp lệ", () => {
  assert.equal(isProvider("claude"), true);
  assert.equal(isProvider("nope"), false);
});

test("scopeRoot: global trả về home, project trả về cwd", () => {
  const prev = process.env.AIE_INSTALL_ROOT;
  delete process.env.AIE_INSTALL_ROOT;
  assert.equal(scopeRoot("global"), os.homedir());
  assert.equal(scopeRoot("project"), process.cwd());
  if (prev !== undefined) process.env.AIE_INSTALL_ROOT = prev;
});

test("scopeRoot: AIE_INSTALL_ROOT override mọi scope", () => {
  const prev = process.env.AIE_INSTALL_ROOT;
  process.env.AIE_INSTALL_ROOT = "/tmp/aie-test";
  assert.equal(scopeRoot("project"), "/tmp/aie-test");
  assert.equal(scopeRoot("global"), "/tmp/aie-test");
  if (prev === undefined) delete process.env.AIE_INSTALL_ROOT;
  else process.env.AIE_INSTALL_ROOT = prev;
});

test("manifestPath nằm trong .ai-engineering", () => {
  assert.match(manifestPath("project").replaceAll("\\", "/"), /\.ai-engineering\/manifest\.json$/);
});
