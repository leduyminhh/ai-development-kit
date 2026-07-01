import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadPlugins, knownPluginIds, resolvePluginIds, expandDependencies, validatePlugins,
} from "../lib/plugins.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("loadPlugins đọc được plugin application với version", () => {
  const plugins = loadPlugins(ROOT);
  assert.ok(plugins.has("application"));
  assert.equal(plugins.get("application").metadata.version, "1.0.0");
});

test("knownPluginIds gồm application và đã sort", () => {
  const ids = knownPluginIds(ROOT);
  assert.ok(ids.includes("application"));
  assert.deepEqual(ids, [...ids].sort());
});

test("resolvePluginIds báo lỗi id không tồn tại", () => {
  assert.throws(() => resolvePluginIds(["khong-co"], ROOT), /khong-co/);
});

test("expandDependencies kéo required deps của application", () => {
  const plugins = loadPlugins(ROOT);
  const out = expandDependencies(["application"], plugins);
  for (const dep of ["architecture", "quality", "security", "data"]) {
    assert.ok(out.includes(dep), `thiếu dep ${dep}`);
  }
  assert.ok(out.includes("application"));
});

test("validatePlugins trả rỗng cho repo hợp lệ", () => {
  const plugins = loadPlugins(ROOT);
  assert.deepEqual(validatePlugins(plugins, ROOT), []);
});
