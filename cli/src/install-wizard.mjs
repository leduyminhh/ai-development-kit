import { createInterface } from "node:readline/promises";

import {
  applyDetectedProviders,
  toInstallIntent,
} from "./install-request.mjs";

function wizardField(value) {
  return { value, source: "wizard", locked: false };
}

function recommendedPluginSelection(draft, detectedPlugins) {
  if (draft.rootPlugins.locked || draft.rootPlugins.value.length > 0) {
    return draft.rootPlugins.value;
  }
  return [...new Set((detectedPlugins ?? []).map((item) => item.pluginId))].sort();
}

function normalizePluginAnswer(answer) {
  if (Array.isArray(answer)) return { all: false, selected: answer };
  if (answer && typeof answer === "object") {
    return { all: Boolean(answer.all), selected: answer.selected ?? [] };
  }
  return { all: false, selected: [] };
}

function optionalCandidates(draft, availablePlugins) {
  const rootPlugins = Array.isArray(draft.rootPlugins.value)
    ? draft.rootPlugins.value
    : [];
  const byId = new Map(availablePlugins.map((item) => [item.id, item]));
  return [
    ...new Set(
      rootPlugins.flatMap(
        (id) => byId.get(id)?.dependencies?.optional ?? [],
      ),
    ),
  ].sort();
}

export async function runInstallWizard({
  draft: originalDraft,
  availablePlugins,
  detectedProviders,
  detectedPlugins = [],
  preparePlan,
  prompter,
}) {
  let draft = applyDetectedProviders(originalDraft, detectedProviders);
  if (!draft.rootPlugins.locked && !draft.all.locked) {
    const pluginAnswer = normalizePluginAnswer(
      await prompter.ask("rootPlugins", {
        choices: availablePlugins.map((item) => item.id),
        selected: recommendedPluginSelection(draft, detectedPlugins),
        detected: detectedPlugins,
        allowAll: true,
      }),
    );
    draft.all = wizardField(pluginAnswer.all);
    draft.rootPlugins = wizardField(pluginAnswer.all ? [] : pluginAnswer.selected);
  }
  if (!draft.providers.locked) {
    draft.providers = wizardField(
      await prompter.ask("providers", {
        choices: ["codex", "claude", "cursor"],
        selected: draft.providers.value,
      }),
    );
  }
  const candidates = optionalCandidates(draft, availablePlugins);
  if (!draft.optionalPlugins.locked && candidates.length > 0) {
    draft.optionalPlugins = wizardField(
      await prompter.ask("optionalPlugins", {
        choices: candidates,
        selected: draft.optionalPlugins.value,
      }),
    );
  }
  if (!draft.scope.locked) {
    draft.scope = wizardField(
      await prompter.ask("scope", {
        choices: ["project", "global"],
        selected: draft.scope.value,
      }),
    );
  }
  const intent = toInstallIntent(draft);
  const plan = await preparePlan(intent);
  const action = await prompter.ask("confirm", {
    choices: ["install", "back", "cancel"],
    plan,
  });
  if (action === "back") {
    draft.scope = { value: "project", source: "default", locked: false };
    return runInstallWizard({
      draft,
      availablePlugins,
      detectedProviders: draft.providers.value,
      preparePlan,
      prompter,
    });
  }
  return { action, intent, plan };
}

function parseSelection(answer, choices, selected, multiple) {
  if (!answer.trim()) return selected;
  const indexes = answer
    .split(",")
    .map((value) => Number(value.trim()) - 1)
    .filter((value) => value >= 0 && value < choices.length);
  const values = indexes.map((index) => choices[index]);
  return multiple ? values : values[0];
}

export function createTerminalPrompter({ input, output }) {
  const readline = createInterface({ input, output });
  return {
    async ask(step, options) {
      const choices = options.choices ?? [];
      output.write(`\n${step}:\n`);
      choices.forEach((choice, index) => {
        output.write(`  ${index + 1}. ${choice}\n`);
      });
      const multiple = ["rootPlugins", "providers", "optionalPlugins"].includes(
        step,
      );
      const selected = options.selected ?? (multiple ? [] : choices[0]);
      const answer = await readline.question("> ");
      return parseSelection(answer, choices, selected, multiple);
    },
    close() {
      readline.close();
    },
  };
}
