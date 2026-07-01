// cli/test/uninstall-check.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install, uninstall, check } from "../lib/install.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function withTarget(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aie-unc-"));
  const prev = process.env.AIE_INSTALL_ROOT;
  process.env.AIE_INSTALL_ROOT = dir;
  try { return fn(dir); }
  finally { if (prev === undefined) delete process.env.AIE_INSTALL_ROOT; else process.env.AIE_INSTALL_ROOT = prev; }
}

test("check báo present/total sau khi install", () => {
  withTarget(() => {
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    const report = check({ scope: "project" });
    const claude = report.installs.find((e) => e.provider === "claude");
    assert.ok(claude.total > 0);
    assert.equal(claude.missing, 0);
  });
});

test("uninstall gỡ file và cập nhật manifest; gỡ khối managed khỏi CLAUDE.md", () => {
  withTarget((dir) => {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Giữ lại\n", "utf8");
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    uninstall({ root: ROOT, providers: ["claude"], plugins: "all", scope: "project" });
    assert.equal(fs.existsSync(path.join(dir, ".claude", "commands")), false);
    const claudeMd = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /Giữ lại/);
    assert.doesNotMatch(claudeMd, /AGENTS_BASELINE/);
    const report = check({ scope: "project" });
    assert.equal(report.installs.find((e) => e.provider === "claude"), undefined);
  });
});
