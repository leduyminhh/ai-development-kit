import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  renderChecklistStep,
  parseChecklistKey,
  runInstallWizard,
  applyChecklistAction,
  createTerminalPrompter,
} from "../src/install-wizard.mjs";
import { parseInstallRequest } from "../src/install-request.mjs";

class TtyInput extends PassThrough {
  constructor() {
    super();
    this.isTTY = true;
    this.rawModes = [];
  }

  setRawMode(value) {
    this.rawModes.push(value);
    return this;
  }
}

class MemoryOutput {
  constructor() {
    this.text = "";
  }

  write(chunk) {
    this.text += String(chunk);
    return true;
  }
}

function writeChunks(input, chunks) {
  chunks.forEach((chunk, index) => {
    setTimeout(() => input.write(chunk), index * 5);
  });
}

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

test("checklist action deselects an existing choice", () => {
  const result = applyChecklistAction({
    action: "toggle",
    choices: ["platform", "quality"],
    selected: ["platform", "quality"],
    cursor: 0,
    all: true,
    allowAll: true,
  });

  assert.equal(result.all, false);
  assert.deepEqual(result.selected, ["quality"]);
});

test("checklist action selects a new non-all choice", () => {
  const result = applyChecklistAction({
    action: "toggle",
    choices: ["platform", "quality"],
    selected: ["platform"],
    cursor: 1,
    all: false,
    allowAll: true,
  });

  assert.equal(result.all, true);
  assert.deepEqual(result.selected, ["platform", "quality"]);
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

test("resumes an interrupted install session as editable wizard defaults", async () => {
  const calls = [];
  const sessions = [];
  const answers = [["platform"], ["codex"], ["quality"], "global", "install"];
  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [
      { id: "platform", dependencies: { optional: ["quality"] } },
      { id: "quality", dependencies: { optional: [] } },
    ],
    detectedProviders: ["codex"],
    detectedPlugins: [],
    existingSession: {
      status: "running",
      draft: {
        rootPlugins: ["platform"],
        all: false,
        providers: ["codex"],
        optionalPlugins: [],
        scope: "global",
      },
    },
    onSession: async (intent, step) => sessions.push({ intent, step }),
    preparePlan: async (intent) => ({ summary: [`${intent.scope}: ${intent.rootPlugins.join(",")}`] }),
    prompter: {
      async ask(step, options) {
        calls.push(step);
        if (step === "rootPlugins") assert.deepEqual(options.selected, ["platform"]);
        if (step === "providers") assert.deepEqual(options.selected, ["codex"]);
        if (step === "scope") assert.equal(options.selected, "global");
        return answers.shift();
      },
    },
  });

  assert.deepEqual(calls, ["rootPlugins", "providers", "optionalPlugins", "scope", "confirm"]);
  assert.equal(result.action, "install");
  assert.equal(result.intent.scope, "global");
  assert.deepEqual(result.intent.optionalPlugins, ["quality"]);
  assert.deepEqual(sessions.map((item) => item.step), ["plugins", "providers", "optionalPlugins", "scope", "confirm"]);
});

test("supports optional plugin back navigation and confirm cancellation", async () => {
  const calls = [];
  const answers = [
    ["platform"],
    ["codex"],
    "back",
    ["cursor"],
    ["quality"],
    "project",
    "cancel",
  ];

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [
      { id: "platform", dependencies: { optional: ["quality"] } },
      { id: "quality", dependencies: { optional: [] } },
    ],
    detectedProviders: [],
    detectedPlugins: [],
    preparePlan: async () => ({ summary: ["preview"] }),
    prompter: {
      async ask(step) {
        calls.push(step);
        return answers.shift();
      },
    },
  });

  assert.equal(result.action, "cancel");
  assert.deepEqual(calls, [
    "rootPlugins",
    "providers",
    "optionalPlugins",
    "rootPlugins",
    "providers",
    "scope",
    "confirm",
  ]);
});

test("handles all plugin answer and scope back navigation", async () => {
  const calls = [];
  const answers = [
    { all: true, selected: ["platform", "quality"] },
    ["codex"],
    "back",
    { all: true, selected: ["platform", "quality"] },
    ["claude"],
    "global",
    "install",
  ];

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [
      { id: "platform", dependencies: { optional: [] } },
      { id: "quality", dependencies: { optional: [] } },
    ],
    detectedProviders: [],
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
  assert.equal(result.intent.all, true);
  assert.deepEqual(result.intent.rootPlugins, []);
  assert.deepEqual(result.intent.providers, ["claude"]);
  assert.equal(result.intent.scope, "global");
  assert.deepEqual(calls, ["rootPlugins", "providers", "scope", "rootPlugins", "providers", "scope", "confirm"]);
});

test("normalizes a scalar plugin answer as an empty selection", async () => {
  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [{ id: "platform", dependencies: { optional: [] } }],
    detectedProviders: [],
    detectedPlugins: [],
    preparePlan: async () => ({ summary: [] }),
    prompter: {
      async ask(step) {
        if (step === "rootPlugins") return "platform";
        if (step === "providers") return ["codex"];
        if (step === "scope") return "project";
        return "install";
      },
    },
  });

  assert.equal(result.action, "install");
  assert.deepEqual(result.intent.rootPlugins, []);
});

test("scope back returns to optional plugin selection when optional candidates exist", async () => {
  const calls = [];
  const answers = [
    ["platform"],
    ["codex"],
    [],
    "back",
    ["platform"],
    ["codex"],
    ["quality"],
    "global",
    "install",
  ];

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [
      { id: "platform", dependencies: { optional: ["quality"] } },
      { id: "quality", dependencies: { optional: [] } },
    ],
    detectedProviders: [],
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
  assert.deepEqual(result.intent.optionalPlugins, ["quality"]);
  assert.deepEqual(calls, [
    "rootPlugins",
    "providers",
    "optionalPlugins",
    "scope",
    "rootPlugins",
    "providers",
    "optionalPlugins",
    "scope",
    "confirm",
  ]);
});

test("confirm back reopens scope before installing", async () => {
  const calls = [];
  const answers = [["platform"], ["codex"], "global", "back", ["platform"], ["codex"], "project", "install"];

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins: [{ id: "platform", dependencies: { optional: [] } }],
    detectedProviders: [],
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
  assert.equal(result.intent.scope, "project");
  assert.deepEqual(calls, ["rootPlugins", "providers", "scope", "confirm", "rootPlugins", "providers", "scope", "confirm"]);
});

test("terminal prompter drives raw checklist and single-select scope", async () => {
  const input = new TtyInput();
  const output = new MemoryOutput();
  const prompter = createTerminalPrompter({ input, output });

  const pluginPromise = prompter.ask("rootPlugins", {
    choices: ["platform", "quality"],
    selected: [],
    allowAll: true,
  });
  writeChunks(input, [" ", "\r"]);
  assert.deepEqual(await pluginPromise, { all: true, selected: ["platform", "quality"] });

  const scopePromise = prompter.ask("scope", {
    choices: ["project", "global"],
    selected: "project",
  });
  writeChunks(input, ["\u001b[B", " ", "\r"]);
  assert.equal(await scopePromise, "global");

  prompter.close();
  assert.deepEqual(input.rawModes, [true, false, true, false]);
  assert.match(output.text, /rootPlugins/);
  assert.match(output.text, /scope/);
});

test("terminal prompter returns raw cancel and back actions", async () => {
  const input = new TtyInput();
  const output = new MemoryOutput();
  const prompter = createTerminalPrompter({ input, output });

  const cancelPromise = prompter.ask("rootPlugins", {
    choices: ["platform"],
    selected: [],
    allowAll: true,
  });
  writeChunks(input, ["q"]);
  assert.equal(await cancelPromise, "cancel");

  const backPromise = prompter.ask("providers", {
    choices: ["codex"],
    selected: [],
  });
  writeChunks(input, ["b"]);
  assert.equal(await backPromise, "back");

  prompter.close();
});

test("terminal prompter falls back to numbered readline selections without a TTY", async () => {
  const input = new PassThrough();
  const output = new MemoryOutput();
  const prompter = createTerminalPrompter({ input, output });

  const pluginsPromise = prompter.ask("rootPlugins", {
    choices: ["platform", "quality"],
    selected: [],
    descriptions: { quality: "Quality workflow" },
  });
  setTimeout(() => input.write("1,2\n"), 0);
  assert.deepEqual(await pluginsPromise, ["platform", "quality"]);

  const confirmPromise = prompter.ask("confirm", {
    choices: ["install", "back", "cancel"],
    selected: "cancel",
  });
  setTimeout(() => input.write("2\n"), 0);
  assert.equal(await confirmPromise, "back");

  prompter.close();
  assert.match(output.text, /Quality workflow/);
});

test("terminal prompter confirm renders the plan and accepts numbered choices", async () => {
  const input = new PassThrough();
  const output = new MemoryOutput();
  const prompter = createTerminalPrompter({ input, output });

  const plan = {
    providers: ["codex"],
    scope: "project",
    targetRoot: "/tmp/project",
    rootPlugins: ["platform"],
    requiredPlugins: [],
    optionalPlugins: [],
    managedFiles: [1, 2, 3],
    managedMerges: [],
  };

  const installPromise = prompter.ask("confirm", {
    choices: ["install", "back", "cancel"],
    plan,
  });
  setTimeout(() => input.write("1\n"), 0);
  assert.equal(await installPromise, "install");
  assert.match(output.text, /Ready to install/);
  assert.match(output.text, /Root plugins: platform/);

  const cancelPromise = prompter.ask("confirm", {
    choices: ["install", "back", "cancel"],
  });
  setTimeout(() => input.write("3\n"), 0);
  assert.equal(await cancelPromise, "cancel");

  prompter.close();
});
