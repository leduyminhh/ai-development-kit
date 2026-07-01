import { test } from "node:test";
import assert from "node:assert/strict";
import { runSteps, runWizard } from "../lib/wizard.mjs";
import { BACK, CANCEL } from "../lib/prompt.mjs";

test("runSteps quay lại khi BACK rồi hoàn tất", async () => {
  const calls = [];
  const steps = [
    { key: "a", run: () => { calls.push("a"); return "A"; } },
    { key: "b", run: () => { calls.push("b"); return calls.filter((c) => c === "b").length === 1 ? BACK : "B"; } },
  ];
  const state = await runSteps(steps);
  assert.deepEqual(state, { a: "A", b: "B" });
});

test("runSteps trả null khi CANCEL", async () => {
  const state = await runSteps([{ key: "a", run: () => CANCEL }]);
  assert.equal(state, null);
});

test("runWizard install thu thập scope/providers/plugins", async () => {
  const deps = {
    selectOne: async (title) => (String(title).includes("scope") ? "project" : true),
    selectMany: async (title) => (String(title).includes("provider") ? ["claude"] : ["application"]),
    confirmStep: async () => true,
    providers: ["antigravity", "claude", "codex", "cursor"],
    pluginIds: ["application", "architecture"],
    readInstalled: () => [],
  };
  const out = await runWizard("install", deps);
  assert.equal(out.action, "install");
  assert.deepEqual(out.providers, ["claude"]);
  assert.deepEqual(out.plugins, ["application"]);
  assert.equal(out.scope, "project");
});

test("runWizard install trả null khi confirmStep từ chối", async () => {
  const deps = {
    selectOne: async () => "project",
    selectMany: async () => ["claude"],
    confirmStep: async () => false,
    providers: ["antigravity", "claude", "codex", "cursor"],
    pluginIds: ["application"],
    readInstalled: () => [],
  };
  const out = await runWizard("install", deps);
  assert.equal(out, null);
});

test("runWizard uninstall đọc provider theo scope đã chọn", async () => {
  const deps = {
    selectOne: async () => "global",
    selectMany: async () => ["codex"],
    confirmStep: async () => true,
    providers: ["antigravity", "claude", "codex", "cursor"],
    pluginIds: ["application"],
    readInstalled: (scope) => scope === "global" ? [{ provider: "codex", plugins: ["application"] }] : [],
  };
  const out = await runWizard("uninstall", deps);
  assert.equal(out.scope, "global");
  assert.deepEqual(out.providers, ["codex"]);
  assert.equal(out.plugins, "all");
});

test("runWizard uninstall trả empty khi scope chưa cài gì", async () => {
  const deps = {
    selectOne: async () => "project",
    selectMany: async () => [],
    confirmStep: async () => true,
    providers: ["antigravity", "claude", "codex", "cursor"],
    pluginIds: ["application"],
    readInstalled: () => [],
  };
  const out = await runWizard("uninstall", deps);
  assert.equal(out.empty, true);
  assert.equal(out.scope, "project");
});
