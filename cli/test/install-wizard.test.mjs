import assert from "node:assert/strict";
import test from "node:test";

import { parseInstallRequest } from "../src/install-request.mjs";
import { runInstallWizard } from "../src/install-wizard.mjs";

test("preserves explicit root plugin and asks editable choices", async () => {
  const steps = [];
  const answers = {
    providers: ["codex"],
    optionalPlugins: [],
    scope: "project",
    confirm: "install",
  };
  const prompter = {
    async ask(step) {
      steps.push(step);
      return answers[step];
    },
  };
  const result = await runInstallWizard({
    draft: parseInstallRequest(["application"]),
    availablePlugins: [
      {
        id: "application",
        dependencies: { required: ["architecture"], optional: ["quality"] },
      },
      { id: "quality", dependencies: { required: [], optional: [] } },
    ],
    detectedProviders: [],
    preparePlan: async () => ({ requiredPlugins: ["architecture"] }),
    prompter,
  });

  assert.deepEqual(steps, [
    "providers",
    "optionalPlugins",
    "scope",
    "confirm",
  ]);
  assert.deepEqual(result.intent.rootPlugins, ["application"]);
  assert.equal(result.action, "install");
});

test("cancel returns without applying installation", async () => {
  const prompter = {
    async ask(step) {
      if (step === "providers") return ["codex"];
      if (step === "scope") return "project";
      return "cancel";
    },
  };
  const result = await runInstallWizard({
    draft: parseInstallRequest(["application"]),
    availablePlugins: [
      { id: "application", dependencies: { required: [], optional: [] } },
    ],
    detectedProviders: [],
    preparePlan: async () => ({}),
    prompter,
  });
  assert.equal(result.action, "cancel");
});
