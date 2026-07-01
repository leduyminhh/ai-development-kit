import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBuild, ADAPTERS } from "../build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("ADAPTERS có đủ 4 provider", () => {
  assert.deepEqual(Object.keys(ADAPTERS).sort(), ["antigravity", "claude", "codex", "cursor"]);
});

test("runBuild materialize file claude vào build dir tạm", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "aie-build-"));
  const res = runBuild({ root: ROOT, providers: ["claude"], pluginIds: ["application"], outDir: out });
  assert.ok(res.results.find((r) => r.provider === "claude").count > 0);
  const skillDir = path.join(out, "claude", ".claude", "skills");
  assert.ok(fs.existsSync(skillDir));
});
