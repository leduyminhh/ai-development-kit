import assert from "node:assert/strict";
import test from "node:test";

import { runInstallWizard } from "../src/install-wizard.mjs";
import { parseInstallRequest } from "../src/install-request.mjs";

function scriptedPrompter(answers) {
  const calls = [];
  return {
    calls,
    async ask(step, options) {
      calls.push({ step, options });
      const answer = answers.shift();
      if (typeof answer === "function") return answer(step, options);
      return answer;
    },
    close() {},
  };
}

const availablePlugins = [
  { id: "application", dependencies: { optional: [] } },
  { id: "platform", dependencies: { optional: [] } },
  { id: "quality", dependencies: { optional: [] } },
  { id: "security", dependencies: { optional: [] } },
];

test("wizard starts plugin selection from detected recommendations", async () => {
  const prompter = scriptedPrompter([
    ["platform", "quality"],
    ["codex"],
    "project",
    "install",
  ]);

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins,
    detectedProviders: ["codex"],
    detectedPlugins: [{ pluginId: "platform" }, { pluginId: "quality" }],
    preparePlan: async () => ({ summary: [] }),
    prompter,
  });

  assert.deepEqual(prompter.calls[0].options.selected, ["platform", "quality"]);
  assert.deepEqual(result.intent.rootPlugins, ["platform", "quality"]);
  assert.equal(result.intent.all, false);
});

test("wizard supports install all selection", async () => {
  const prompter = scriptedPrompter([
    { all: true, selected: [] },
    ["cursor"],
    "project",
    "install",
  ]);

  const result = await runInstallWizard({
    draft: parseInstallRequest([]),
    availablePlugins,
    detectedProviders: ["cursor"],
    detectedPlugins: [],
    preparePlan: async () => ({ summary: [] }),
    prompter,
  });

  assert.equal(result.intent.all, true);
  assert.deepEqual(result.intent.rootPlugins, []);
});
