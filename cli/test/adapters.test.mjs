// cli/test/adapters.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel } from "../lib/plugins.mjs";
import claude from "../../adapters/claude/adapter.mjs";
import codex from "../../adapters/codex/adapter.mjs";
import cursor from "../../adapters/cursor/adapter.mjs";
import antigravity from "../../adapters/antigravity/adapter.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const model = () => loadModel({ root: ROOT, pluginIds: ["application"], scope: "project" });

test("claude: skill copyDir + command render + instruction CLAUDE.md", () => {
  const out = claude.build(model(), { scope: "project" });
  assert.ok(out.files.some((f) => f.path.startsWith(".claude/skills/") && f.copyDir));
  assert.ok(out.files.some((f) => f.path.startsWith(".claude/commands/") && typeof f.content === "string"));
  assert.equal(out.instruction.path, "CLAUDE.md");
  assert.equal(out.mcp.path, ".mcp.json");
});

test("codex: skill vào .agents/skills, agent .toml copy, AGENTS.md instruction", () => {
  const out = codex.build(model(), { scope: "project" });
  assert.ok(out.files.some((f) => f.path.startsWith(".agents/skills/") && f.copyDir));
  assert.ok(out.files.some((f) => f.path.startsWith(".codex/agents/") && f.path.endsWith(".toml")));
  assert.ok(out.files.some((f) => f.path === ".codex/workflows/commands.md"));
  assert.equal(out.instruction.path, "AGENTS.md");
  assert.equal(out.mcp.format, "toml");
});

test("cursor: rules .mdc, không có instruction ở global", () => {
  const proj = cursor.build(model(), { scope: "project" });
  assert.ok(proj.files.some((f) => f.path.startsWith(".cursor/rules/") && f.path.endsWith(".mdc")));
  assert.equal(proj.instruction.path, "AGENTS.md");
  const glob = cursor.build(loadModel({ root: ROOT, pluginIds: ["application"], scope: "global" }), { scope: "global" });
  assert.equal(glob.instruction, null);
});

test("antigravity: skills/ + commands/ + AGENTS.md instruction", () => {
  const out = antigravity.build(model(), { scope: "project" });
  assert.ok(out.files.some((f) => f.path.startsWith("skills/") && f.copyDir));
  assert.ok(out.files.some((f) => f.path.startsWith("commands/") && f.path.endsWith(".md")));
  assert.equal(out.instruction.path, "AGENTS.md");
});
