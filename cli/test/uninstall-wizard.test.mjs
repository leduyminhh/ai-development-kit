import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import {
  renderUninstallStep,
  parseChecklistKey,
  applyChecklistAction,
  runUninstallWizard,
  createUninstallTerminalPrompter,
} from "../src/uninstall-wizard.mjs";

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

test("renderUninstallStep with no plugins", () => {
  const output = renderUninstallStep({
    title: "Select plugins to remove",
    plugins: [],
  });
  assert.match(output, /No plugins installed/);
});

test("renderUninstallStep with plugins", () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];
  const output = renderUninstallStep({
    title: "Select plugins to remove",
    plugins,
    selected: ["platform"],
    cursor: 0,
    allowAll: true,
    all: false,
  });
  assert.match(output, /platform/);
  assert.match(output, /security/);
  assert.match(output, /v1\.0\.0/);
  assert.match(output, /v2\.0\.0/);
});

test("renderUninstallStep with all selected", () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
  ];
  const output = renderUninstallStep({
    title: "Select plugins to remove",
    plugins,
    selected: ["platform"],
    cursor: -1,
    allowAll: true,
    all: true,
  });
  assert.match(output, /Remove all plugins/);
});

test("parseChecklistKey recognizes actions", () => {
  assert.equal(parseChecklistKey(" "), "toggle");
  assert.equal(parseChecklistKey("\r"), "submit");
  assert.equal(parseChecklistKey("\n"), "submit");
  assert.equal(parseChecklistKey("\u001b[A"), "up");
  assert.equal(parseChecklistKey("\u001b[B"), "down");
  assert.equal(parseChecklistKey("k"), "up");
  assert.equal(parseChecklistKey("j"), "down");
  assert.equal(parseChecklistKey("a"), "all");
  assert.equal(parseChecklistKey("b"), "back");
  assert.equal(parseChecklistKey("q"), "cancel");
  assert.equal(parseChecklistKey("\u001b"), "cancel");
  assert.equal(parseChecklistKey("x"), "ignore");
});

test("applyChecklistAction toggles selection", () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];
  
  let state = { selected: [], all: false, cursor: 0 };
  state = applyChecklistAction({
    action: "toggle",
    plugins,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  
  assert.deepEqual(state.selected, ["platform"]);
  assert.equal(state.all, false);
});

test("applyChecklistAction toggles all", () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];
  
  let state = { selected: [], all: false, cursor: -1 };
  state = applyChecklistAction({
    action: "toggle",
    plugins,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  
  assert.equal(state.all, true);
  assert.deepEqual(state.selected, ["platform", "security"]);
});

test("applyChecklistAction navigates up and down", () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];
  
  let state = { selected: [], all: false, cursor: 0 };
  
  state = applyChecklistAction({
    action: "down",
    plugins,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  assert.equal(state.cursor, 1);
  
  state = applyChecklistAction({
    action: "up",
    plugins,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  assert.equal(state.cursor, 0);
  
  state = applyChecklistAction({
    action: "up",
    plugins,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  assert.equal(state.cursor, -1);
});

test("runUninstallWizard with no plugins", async () => {
  const result = await runUninstallWizard({
    installed: { plugins: [] },
    prompter: {
      ask: async () => {
        throw new Error("Should not prompt when no plugins");
      },
      close: () => {},
    },
  });
  
  assert.equal(result.action, "noop");
  assert.equal(result.reason, "no-plugins");
});

test("runUninstallWizard with cancel", async () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
  ];
  
  const result = await runUninstallWizard({
    installed: { plugins },
    prompter: {
      ask: async () => "cancel",
      close: () => {},
    },
  });
  
  assert.equal(result.action, "cancel");
});

test("runUninstallWizard with selection and removal", async () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];
  
  let confirmCalled = false;
  const result = await runUninstallWizard({
    installed: { plugins },
    prompter: {
      ask: async (step) => {
        if (step === "selectPlugins") {
          return ["platform"];
        }
        if (step === "confirm") {
          return "remove";
        }
        return "cancel";
      },
      close: () => {},
    },
    onConfirm: async (selected) => {
      confirmCalled = true;
      assert.deepEqual(selected, ["platform"]);
    },
  });
  
  assert.equal(result.action, "remove");
  assert.equal(result.all, false);
  assert.deepEqual(result.pluginIds, ["platform"]);
  assert.equal(confirmCalled, true);
});

test("runUninstallWizard with remove all", async () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];
  
  const result = await runUninstallWizard({
    installed: { plugins },
    prompter: {
      ask: async (step) => {
        if (step === "selectPlugins") {
          return { all: true, selected: ["platform", "security"] };
        }
        if (step === "confirm") {
          return "remove";
        }
        return "cancel";
      },
      close: () => {},
    },
    onConfirm: async () => {},
  });
  
  assert.equal(result.action, "remove");
  assert.equal(result.all, true);
  assert.deepEqual(result.pluginIds, ["platform", "security"]);
});

test("runUninstallWizard with no selection", async () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
  ];
  
  const result = await runUninstallWizard({
    installed: { plugins },
    prompter: {
      ask: async (step) => {
        if (step === "selectPlugins") {
          return [];
        }
        return "cancel";
      },
      close: () => {},
    },
  });
  
  assert.equal(result.action, "noop");
  assert.equal(result.reason, "no-selection");
});

test("runUninstallWizard with back from confirm", async () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
  ];
  
  let askCount = 0;
  const result = await runUninstallWizard({
    installed: { plugins },
    prompter: {
      ask: async (step) => {
        askCount++;
        if (askCount === 1 && step === "selectPlugins") {
          return ["platform"];
        }
        if (askCount === 2 && step === "confirm") {
          return "back";
        }
        if (askCount === 3 && step === "selectPlugins") {
          return ["platform"];
        }
        if (askCount === 4 && step === "confirm") {
          return "remove";
        }
        return "cancel";
      },
      close: () => {},
    },
    onConfirm: async () => {},
  });
  
  assert.equal(result.action, "remove");
  assert.equal(askCount, 4);
});

test("runUninstallWizard preserves safety - empty selection by default", async () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];
  
  const result = await runUninstallWizard({
    installed: { plugins },
    prompter: {
      ask: async (step) => {
        if (step === "selectPlugins") {
          // User presses Enter without selecting anything
          return [];
        }
        return "cancel";
      },
      close: () => {},
    },
  });
  
  // Should return noop because no selection (safe default)
  assert.equal(result.action, "noop");
  assert.equal(result.reason, "no-selection");
});

test("applyChecklistAction deselects existing plugin and all shortcut clears selection", () => {
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];

  const deselected = applyChecklistAction({
    action: "toggle",
    plugins,
    selected: ["platform", "security"],
    cursor: 0,
    all: true,
    allowAll: true,
  });
  assert.deepEqual(deselected.selected, ["security"]);
  assert.equal(deselected.all, false);

  const cleared = applyChecklistAction({
    action: "all",
    plugins,
    selected: ["platform", "security"],
    cursor: 1,
    all: true,
    allowAll: true,
  });
  assert.deepEqual(cleared.selected, []);
  assert.equal(cleared.all, false);
});

test("terminal uninstall prompter handles empty TTY checklist", async () => {
  const input = new TtyInput();
  const output = new MemoryOutput();
  const prompter = createUninstallTerminalPrompter({ input, output });

  const result = await prompter.ask("selectPlugins", { plugins: [] });

  prompter.close();
  assert.deepEqual(result, { all: false, selected: [] });
  assert.match(output.text, /No plugins installed/);
});

test("terminal uninstall prompter drives raw checklist submit, back, and cancel", async () => {
  const input = new TtyInput();
  const output = new MemoryOutput();
  const prompter = createUninstallTerminalPrompter({ input, output });
  const plugins = [
    { id: "platform", version: "1.0.0" },
    { id: "security", version: "2.0.0" },
  ];

  const selectedPromise = prompter.ask("selectPlugins", { plugins, selected: [], allowAll: true });
  writeChunks(input, ["j", "j", " ", "\r"]);
  assert.deepEqual(await selectedPromise, { all: false, selected: ["security"] });

  const backPromise = prompter.ask("selectPlugins", { plugins, selected: [], allowAll: true });
  writeChunks(input, ["b"]);
  assert.equal(await backPromise, "back");

  const cancelPromise = prompter.ask("selectPlugins", { plugins, selected: [], allowAll: true });
  writeChunks(input, ["q"]);
  assert.equal(await cancelPromise, "cancel");

  prompter.close();
  assert.deepEqual(input.rawModes, [true, false, true, false, true, false]);
});

test("terminal uninstall confirm accepts remove, back, and cancel choices", async () => {
  const input = new PassThrough();
  const output = new MemoryOutput();
  const prompter = createUninstallTerminalPrompter({ input, output });
  const summary = [{ id: "platform", version: "1.0.0" }];

  const removePromise = prompter.ask("confirm", { summary });
  setTimeout(() => input.write("remove\n"), 0);
  assert.equal(await removePromise, "remove");

  const backPromise = prompter.ask("confirm", { summary });
  setTimeout(() => input.write("b\n"), 0);
  assert.equal(await backPromise, "back");

  const explicitCancelPromise = prompter.ask("confirm", { summary });
  setTimeout(() => input.write("3\n"), 0);
  assert.equal(await explicitCancelPromise, "cancel");

  const cancelPromise = prompter.ask("unknown", {});
  assert.equal(await cancelPromise, "cancel");

  prompter.close();
  assert.match(output.text, /Ready to uninstall/);
  assert.match(output.text, /User-owned files will be preserved/);
});

test("runUninstallWizard cancels when confirmation is not remove", async () => {
  const result = await runUninstallWizard({
    installed: { plugins: [{ id: "platform", version: "1.0.0" }] },
    prompter: {
      ask: async (step) => (step === "selectPlugins" ? ["platform"] : "cancel"),
      close: () => {},
    },
  });

  assert.equal(result.action, "cancel");
});

test("terminal uninstall prompter falls back to cancel without a TTY checklist", async () => {
  const input = new PassThrough();
  const output = new MemoryOutput();
  const prompter = createUninstallTerminalPrompter({ input, output });

  const result = await prompter.ask("selectPlugins", {
    plugins: [{ id: "platform", version: "1.0.0" }],
    selected: [],
    allowAll: true,
  });

  prompter.close();
  assert.equal(result, "cancel");
});

test("runUninstallWizard treats selection back as cancel", async () => {
  const result = await runUninstallWizard({
    installed: { plugins: [{ id: "platform", version: "1.0.0" }] },
    prompter: {
      ask: async () => "back",
      close: () => {},
    },
  });

  assert.equal(result.action, "cancel");
});
