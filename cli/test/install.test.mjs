// cli/test/install.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install, readManifest } from "../lib/install.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function withTarget(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aie-install-"));
  const prev = process.env.AIE_INSTALL_ROOT;
  process.env.AIE_INSTALL_ROOT = dir;
  try { return fn(dir); }
  finally { if (prev === undefined) delete process.env.AIE_INSTALL_ROOT; else process.env.AIE_INSTALL_ROOT = prev; }
}

test("install claude ghi skills + CLAUDE.md managed + manifest", () => {
  withTarget((dir) => {
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    assert.ok(fs.existsSync(path.join(dir, ".claude", "commands")));
    const claudeMd = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /AI-ENGINEERING:BEGIN AGENTS_BASELINE/);
    const manifest = readManifest("project");
    const entry = manifest.installs.find((e) => e.provider === "claude");
    assert.ok(entry);
    assert.ok(entry.plugins.includes("application"));
    assert.ok(entry.managed.includes("CLAUDE.md"));
  });
});

test("install không đè file MCP có sẵn của người dùng", () => {
  withTarget((dir) => {
    const fs2 = fs;
    fs2.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { mine: { url: "x" } } }), "utf8");
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    const mcp = JSON.parse(fs2.readFileSync(path.join(dir, ".mcp.json"), "utf8"));
    assert.ok(mcp.mcpServers.mine, "user MCP server phải được giữ nguyên");
    const entry = readManifest("project").installs.find((e) => e.provider === "claude");
    assert.deepEqual(entry.mcp, []);
  });
});

test("install bảo toàn nội dung người dùng ngoài khối managed", () => {
  withTarget((dir) => {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Ghi chú của tôi\n\nGiữ nguyên dòng này.\n", "utf8");
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    const claudeMd = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /Giữ nguyên dòng này\./);
    assert.match(claudeMd, /AGENTS_BASELINE/);
  });
});
