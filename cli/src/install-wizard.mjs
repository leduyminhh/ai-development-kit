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

function reasonLookup(detected = []) {
  return new Map(detected.map((item) => [item.pluginId, item.reasons ?? []]));
}

export function renderChecklistStep({
  title,
  choices,
  selected = [],
  cursor = 0,
  allowAll = false,
  all = false,
  detected = [],
}) {
  const reasons = reasonLookup(detected);
  const lines = ["", `${title}:`, "Use ↑/↓ or j/k to move, Space to toggle, Enter to continue."];
  if (allowAll) {
    lines.push(`${cursor === -1 ? "›" : " "} [${all ? "x" : " "}] Install all plugins`);
  }
  choices.forEach((choice, index) => {
    const checked = selected.includes(choice);
    const marker = cursor === index ? "›" : " ";
    const reasonText = reasons.has(choice) ? ` — ${reasons.get(choice).join("; ")}` : "";
    lines.push(`${marker} [${checked ? "x" : " "}] ${choice}${reasonText}`);
  });
  lines.push("");
  return lines.join("\n");
}

export function parseChecklistKey(input) {
  if (input === " " || input === "space") return "toggle";
  if (input === "\r" || input === "\n" || input === "enter") return "submit";
  if (input === "j" || input === "down") return "down";
  if (input === "k" || input === "up") return "up";
  if (input === "a") return "all";
  if (input === "b") return "back";
  if (input === "q" || input === "\u001b") return "cancel";
  return "ignore";
}

function createChecklistPrompt({ input, output }) {
  return async function checklistPrompt(step, options) {
    if (!input.setRawMode || !input.isTTY) {
      return null;
    }
    const choices = options.choices ?? [];
    let selected = [...(options.selected ?? [])];
    let cursor = options.allowAll ? -1 : 0;
    let all = false;
    input.setRawMode(true);
    input.resume();
    return await new Promise((resolve) => {
      const render = () => {
        output.write("\x1Bc");
        output.write(renderChecklistStep({ title: step, choices, selected, cursor, allowAll: options.allowAll, all, detected: options.detected }));
      };
      const onData = (chunk) => {
        const action = parseChecklistKey(chunk.toString("utf8"));
        if (action === "down") cursor = Math.min(choices.length - 1, cursor + 1);
        if (action === "up") cursor = Math.max(options.allowAll ? -1 : 0, cursor - 1);
        if (action === "all") all = !all;
        if (action === "toggle") {
          if (cursor === -1) all = !all;
          else if (selected.includes(choices[cursor])) selected = selected.filter((item) => item !== choices[cursor]);
          else selected = [...selected, choices[cursor]].sort();
        }
        if (action === "cancel") {
          cleanup();
          resolve("cancel");
          return;
        }
        if (action === "submit") {
          cleanup();
          resolve(options.allowAll ? { all, selected } : selected);
          return;
        }
        render();
      };
      const cleanup = () => {
        input.off("data", onData);
        input.setRawMode(false);
        output.write("\n");
      };
      input.on("data", onData);
      render();
    });
  };
}

export function createTerminalPrompter({ input, output }) {
  const readline = createInterface({ input, output });
  const checklist = createChecklistPrompt({ input, output });
  return {
    async ask(step, options) {
      const multi = ["rootPlugins", "providers", "optionalPlugins"].includes(step);
      if (multi && step !== "optionalPlugins") {
        const result = await checklist(step, options);
        if (result !== null) return result;
      }
      const choices = options.choices ?? [];
      output.write(`\n${step}:\n`);
      choices.forEach((choice, index) => {
        output.write(`  ${index + 1}. ${choice}\n`);
      });
      const selected = options.selected ?? (multi ? [] : choices[0]);
      const answer = await readline.question("> ");
      return parseSelection(answer, choices, selected, multi);
    },
    close() {
      readline.close();
    },
  };
}
