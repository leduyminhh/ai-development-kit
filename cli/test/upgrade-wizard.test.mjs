import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import {
  renderUpgradeStep,
  parseChecklistKey,
  applyChecklistAction,
  runUpgradeWizard,
  createUpgradeTerminalPrompter,
} from "../src/upgrade-wizard.mjs";

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

test("renderUpgradeStep with no updates", () => {
  const output = renderUpgradeStep({
    title: "Select plugins to upgrade",
    updates: [],
  });
  assert.match(output, /All plugins are up to date/);
});

test("renderUpgradeStep with updates", () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
    { id: "security", current: "2.0.0", latest: "2.1.0" },
  ];
  const output = renderUpgradeStep({
    title: "Select plugins to upgrade",
    updates,
    selected: ["platform"],
    cursor: 0,
    allowAll: true,
    all: false,
  });
  assert.match(output, /platform/);
  assert.match(output, /security/);
  assert.match(output, /1\.0\.0/);
  assert.match(output, /1\.1\.0/);
});

test("renderUpgradeStep with all selected", () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
  ];
  const output = renderUpgradeStep({
    title: "Select plugins to upgrade",
    updates,
    selected: ["platform"],
    cursor: -1,
    allowAll: true,
    all: true,
  });
  assert.match(output, /Upgrade all plugins/);
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
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
    { id: "security", current: "2.0.0", latest: "2.1.0" },
  ];
  
  let state = { selected: [], all: false, cursor: 0 };
  state = applyChecklistAction({
    action: "toggle",
    updates,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  
  assert.deepEqual(state.selected, ["platform"]);
  assert.equal(state.all, false);
});

test("applyChecklistAction toggles all", () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
    { id: "security", current: "2.0.0", latest: "2.1.0" },
  ];
  
  let state = { selected: [], all: false, cursor: -1 };
  state = applyChecklistAction({
    action: "toggle",
    updates,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  
  assert.equal(state.all, true);
  assert.deepEqual(state.selected, ["platform", "security"]);
});

test("applyChecklistAction navigates up and down", () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
    { id: "security", current: "2.0.0", latest: "2.1.0" },
  ];
  
  let state = { selected: [], all: false, cursor: 0 };
  
  state = applyChecklistAction({
    action: "down",
    updates,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  assert.equal(state.cursor, 1);
  
  state = applyChecklistAction({
    action: "up",
    updates,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  assert.equal(state.cursor, 0);
  
  state = applyChecklistAction({
    action: "up",
    updates,
    selected: state.selected,
    cursor: state.cursor,
    all: state.all,
    allowAll: true,
  });
  assert.equal(state.cursor, -1);
});

test("runUpgradeWizard with no updates", async () => {
  const result = await runUpgradeWizard({
    outdated: { updates: [] },
    prompter: {
      ask: async () => {
        throw new Error("Should not prompt when no updates");
      },
      close: () => {},
    },
  });
  
  assert.equal(result.action, "noop");
  assert.equal(result.reason, "no-updates");
});

test("runUpgradeWizard with cancel", async () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
  ];
  
  const result = await runUpgradeWizard({
    outdated: { updates },
    prompter: {
      ask: async () => "cancel",
      close: () => {},
    },
  });
  
  assert.equal(result.action, "cancel");
});

test("runUpgradeWizard with selection and upgrade", async () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
    { id: "security", current: "2.0.0", latest: "2.1.0" },
  ];
  
  let confirmCalled = false;
  const result = await runUpgradeWizard({
    outdated: { updates },
    prompter: {
      ask: async (step) => {
        if (step === "selectPlugins") {
          return ["platform"];
        }
        if (step === "confirm") {
          return "upgrade";
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
  
  assert.equal(result.action, "upgrade");
  assert.equal(result.all, false);
  assert.deepEqual(result.pluginIds, ["platform"]);
  assert.equal(confirmCalled, true);
});

test("runUpgradeWizard with upgrade all", async () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
    { id: "security", current: "2.0.0", latest: "2.1.0" },
  ];
  
  const result = await runUpgradeWizard({
    outdated: { updates },
    prompter: {
      ask: async (step) => {
        if (step === "selectPlugins") {
          return { all: true, selected: ["platform", "security"] };
        }
        if (step === "confirm") {
          return "upgrade";
        }
        return "cancel";
      },
      close: () => {},
    },
    onConfirm: async () => {},
  });
  
  assert.equal(result.action, "upgrade");
  assert.equal(result.all, true);
  assert.deepEqual(result.pluginIds, ["platform", "security"]);
});

test("runUpgradeWizard with no selection", async () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
  ];
  
  const result = await runUpgradeWizard({
    outdated: { updates },
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

test("runUpgradeWizard with back from confirm", async () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
  ];
  
  let askCount = 0;
  const result = await runUpgradeWizard({
    outdated: { updates },
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
          return "upgrade";
        }
        return "cancel";
      },
      close: () => {},
    },
    onConfirm: async () => {},
  });
  
  assert.equal(result.action, "upgrade");
  assert.equal(askCount, 4);
});

test("applyChecklistAction deselects existing update and all shortcut clears selection", () => {
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
    { id: "security", current: "2.0.0", latest: "2.1.0" },
  ];

  const deselected = applyChecklistAction({
    action: "toggle",
    updates,
    selected: ["platform", "security"],
    cursor: 0,
    all: true,
    allowAll: true,
  });
  assert.deepEqual(deselected.selected, ["security"]);
  assert.equal(deselected.all, false);

  const cleared = applyChecklistAction({
    action: "all",
    updates,
    selected: ["platform", "security"],
    cursor: 1,
    all: true,
    allowAll: true,
  });
  assert.deepEqual(cleared.selected, []);
  assert.equal(cleared.all, false);
});

test("terminal upgrade prompter handles empty TTY checklist", async () => {
  const input = new TtyInput();
  const output = new MemoryOutput();
  const prompter = createUpgradeTerminalPrompter({ input, output });

  const result = await prompter.ask("selectPlugins", { updates: [] });

  prompter.close();
  assert.deepEqual(result, { all: false, selected: [] });
  assert.match(output.text, /All plugins are up to date/);
});

test("terminal upgrade prompter drives raw checklist submit, back, and cancel", async () => {
  const input = new TtyInput();
  const output = new MemoryOutput();
  const prompter = createUpgradeTerminalPrompter({ input, output });
  const updates = [
    { id: "platform", current: "1.0.0", latest: "1.1.0" },
    { id: "security", current: "2.0.0", latest: "2.1.0" },
  ];

  const selectedPromise = prompter.ask("selectPlugins", { updates, selected: [], allowAll: true });
  writeChunks(input, ["j", "j", " ", "\r"]);
  assert.deepEqual(await selectedPromise, { all: false, selected: ["security"] });

  const backPromise = prompter.ask("selectPlugins", { updates, selected: [], allowAll: true });
  writeChunks(input, ["b"]);
  assert.equal(await backPromise, "back");

  const cancelPromise = prompter.ask("selectPlugins", { updates, selected: [], allowAll: true });
  writeChunks(input, ["q"]);
  assert.equal(await cancelPromise, "cancel");

  prompter.close();
  assert.deepEqual(input.rawModes, [true, false, true, false, true, false]);
});

test("terminal upgrade confirm accepts upgrade, back, and cancel choices", async () => {
  const input = new PassThrough();
  const output = new MemoryOutput();
  const prompter = createUpgradeTerminalPrompter({ input, output });
  const summary = [{ id: "platform", current: "1.0.0", latest: "1.1.0" }];

  const upgradePromise = prompter.ask("confirm", { summary });
  setTimeout(() => input.write("upgrade\n"), 0);
  assert.equal(await upgradePromise, "upgrade");

  const backPromise = prompter.ask("confirm", { summary });
  setTimeout(() => input.write("b\n"), 0);
  assert.equal(await backPromise, "back");

  const explicitCancelPromise = prompter.ask("confirm", { summary });
  setTimeout(() => input.write("3\n"), 0);
  assert.equal(await explicitCancelPromise, "cancel");

  const cancelPromise = prompter.ask("unknown", {});
  assert.equal(await cancelPromise, "cancel");

  prompter.close();
  assert.match(output.text, /Ready to upgrade/);
  assert.match(output.text, /platform/);
});

test("runUpgradeWizard cancels when confirmation is not upgrade", async () => {
  const result = await runUpgradeWizard({
    outdated: { updates: [{ id: "platform", current: "1.0.0", latest: "1.1.0" }] },
    prompter: {
      ask: async (step) => (step === "selectPlugins" ? ["platform"] : "cancel"),
      close: () => {},
    },
  });

  assert.equal(result.action, "cancel");
});

test("terminal upgrade prompter falls back to cancel without a TTY checklist", async () => {
  const input = new PassThrough();
  const output = new MemoryOutput();
  const prompter = createUpgradeTerminalPrompter({ input, output });

  const result = await prompter.ask("selectPlugins", {
    updates: [{ id: "platform", current: "1.0.0", latest: "1.1.0" }],
    selected: [],
    allowAll: true,
  });

  prompter.close();
  assert.equal(result, "cancel");
});

test("runUpgradeWizard treats selection back as cancel", async () => {
  const result = await runUpgradeWizard({
    outdated: { updates: [{ id: "platform", current: "1.0.0", latest: "1.1.0" }] },
    prompter: {
      ask: async () => "back",
      close: () => {},
    },
  });

  assert.equal(result.action, "cancel");
});
