// cli/test/uninstall-check.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install, uninstall, check, readManifest } from "../lib/install.mjs";

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

test("gỡ một provider giữ managed block AGENTS.md cho provider còn lại", () => {
  withTarget((dir) => {
    install({ root: ROOT, providers: ["codex", "cursor", "antigravity"], plugins: ["application"], scope: "project" });
    uninstall({ root: ROOT, providers: ["codex"], plugins: "all", scope: "project" });
    const agents = fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8");
    assert.match(agents, /AGENTS_BASELINE/, "AGENTS.md block phải còn vì cursor/antigravity vẫn cài");
    uninstall({ root: ROOT, providers: ["cursor", "antigravity"], plugins: "all", scope: "project" });
    const after = fs.existsSync(path.join(dir, "AGENTS.md")) ? fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8") : "";
    assert.doesNotMatch(after, /AGENTS_BASELINE/, "sau khi gỡ hết, block phải biến mất");
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
