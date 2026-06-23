import assert from "node:assert/strict";
import test from "node:test";

import { renderChecklistStep, parseChecklistKey, runInstallWizard, applyChecklistAction } from "../src/install-wizard.mjs";
import { parseInstallRequest } from "../src/install-request.mjs";

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

test("renders plugin checklist with install all and recommendation reasons", () => {
  const output = renderChecklistStep({
    title: "Plugins",
    choices: ["application", "platform", "quality"],
    selected: ["platform"],
    cursor: 0,
    allowAll: true,
    all: false,
    detected: [{ pluginId: "platform", reasons: ["baseline runtime"] }],
  });

  assert.match(output, /Plugins/);
  assert.match(output, /Install all plugins/);
  assert.match(output, /platform/);
  assert.match(output, /baseline runtime/);
});

test("parses checklist keys for toggle, submit, and movement", () => {
  assert.equal(parseChecklistKey(" "), "toggle");
  assert.equal(parseChecklistKey("\r"), "submit");
  assert.equal(parseChecklistKey("\n"), "submit");
  assert.equal(parseChecklistKey("j"), "down");
  assert.equal(parseChecklistKey("k"), "up");
  assert.equal(parseChecklistKey("a"), "all");
  assert.equal(parseChecklistKey("q"), "cancel");
});

test("renderChecklistStep highlights install all when active", () => {
  const output = renderChecklistStep({
    title: "Plugins",
    choices: ["quality"],
    selected: [],
    cursor: -1,
    allowAll: true,
    all: true,
  });

  assert.match(stripAnsi(output), /\u203a.*\[x\] Install all plugins/);
});

test("parseChecklistKey fallback for escape and back keys", () => {
  assert.equal(parseChecklistKey("\u001b"), "cancel");
  assert.equal(parseChecklistKey("b"), "back");
  assert.equal(parseChecklistKey("x"), "ignore");
});


test("parses terminal arrow-key escape sequences", () => {
  assert.equal(parseChecklistKey("[A"), "up");
  assert.equal(parseChecklistKey("[B"), "down");
  assert.equal(parseChecklistKey("[C"), "ignore");
  assert.equal(parseChecklistKey("[D"), "ignore");
});

test("cancels wizard immediately when checklist returns cancel", async () => {
  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [
      { id: "platform", dependencies: { optional: [] } },
      { id: "quality", dependencies: { optional: [] } },
    ],
    detectedProviders: ["codex"],
    detectedPlugins: [],
    preparePlan: async () => {
      throw new Error("preparePlan should not run after cancel");
    },
    prompter: {
      async ask() {
        return "cancel";
      },
    },
  });

  assert.equal(result.action, "cancel");
});

test("renders friendlier checklist copy and footer", () => {
  const output = renderChecklistStep({
    title: "Plugins",
    choices: ["platform"],
    selected: ["platform"],
    cursor: 0,
    allowAll: true,
    all: false,
    detected: [{ pluginId: "platform", reasons: ["baseline runtime"] }],
  });

  assert.ok(output.includes("AI Engineering install wizard"));
  assert.ok(output.includes("Use ↑/↓"));
  assert.ok(output.includes("Esc/q: cancel"));
  assert.ok(output.includes("recommended: baseline runtime"));
});



test("renders plugin descriptions with recommendation reasons", () => {
  const output = renderChecklistStep({
    title: "rootPlugins",
    choices: ["platform", "quality"],
    selected: ["platform"],
    cursor: 0,
    descriptions: {
      platform: "Core AI Engineering runtime and baseline instructions.",
      quality: "Testing and code review workflows.",
    },
    detected: [{ pluginId: "platform", reasons: ["baseline runtime"] }],
  });

  assert.ok(output.includes("Core AI Engineering runtime and baseline instructions."));
  assert.ok(output.includes("Testing and code review workflows."));
});

test("supports returning from provider child step to plugin parent step", async () => {
  const calls = [];
  const answers = [
    ["platform"],
    "back",
    ["platform", "quality"],
    ["codex"],
    "project",
    "install",
  ];

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [
      { id: "platform", dependencies: { optional: [] } },
      { id: "quality", dependencies: { optional: [] } },
    ],
    detectedProviders: ["codex"],
    detectedPlugins: [],
    preparePlan: async () => ({ summary: [] }),
    prompter: {
      async ask(step) {
        calls.push(step);
        return answers.shift();
      },
    },
  });

  assert.equal(result.action, "install");
  assert.deepEqual(result.intent.rootPlugins, ["platform", "quality"]);
  assert.deepEqual(calls.slice(0, 4), ["rootPlugins", "providers", "rootPlugins", "providers"]);
});

test("install all toggle selects all choices and toggling again clears them", () => {
  const first = applyChecklistAction({
    action: "toggle",
    choices: ["platform", "quality", "security"],
    selected: [],
    cursor: -1,
    all: false,
    allowAll: true,
  });
  assert.equal(first.all, true);
  assert.deepEqual(first.selected, ["platform", "quality", "security"]);

  const second = applyChecklistAction({
    action: "toggle",
    choices: ["platform", "quality", "security"],
    selected: first.selected,
    cursor: -1,
    all: true,
    allowAll: true,
  });
  assert.equal(second.all, false);
  assert.deepEqual(second.selected, []);
});


test("renders colorized sections and visual separators", () => {
  const output = renderChecklistStep({
    title: "rootPlugins",
    choices: ["platform"],
    selected: ["platform"],
    cursor: 0,
  });

  assert.ok(output.includes("["));
  assert.ok(output.includes("────────────────"));
});

test("provider step includes antigravity as install target", async () => {
  const calls = [];
  const answers = [["platform"], ["antigravity"], "project", "install"];

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [{ id: "platform", dependencies: { optional: [] } }],
    detectedProviders: [],
    detectedPlugins: [],
    preparePlan: async () => ({ summary: [] }),
    prompter: {
      async ask(step, options) {
        calls.push({ step, choices: options.choices });
        return answers.shift();
      },
    },
  });

  assert.ok(calls.find((call) => call.step === "providers").choices.includes("antigravity"));
  assert.deepEqual(result.intent.providers, ["antigravity"]);
});
