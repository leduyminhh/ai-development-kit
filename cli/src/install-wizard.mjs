import { createInterface } from "node:readline/promises";

import {
  applyDetectedProviders,
  toInstallIntent,
} from "./install-request.mjs";

const COLORS = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  bold: "\u001b[1m",
};

function color(value, code) {
  return `${code}${value}${COLORS.reset}`;
}

function wizardField(value) {
  return { value, source: "wizard", locked: false };
}

function recommendedPluginSelection(draft, detectedPlugins) {
  if (draft.rootPlugins.locked || draft.rootPlugins.value.length > 0) {
    return draft.rootPlugins.value;
  }
  return [...new Set((detectedPlugins ?? []).map((item) => item.pluginId))].sort();
}

function pluginDescriptions(availablePlugins) {
  return Object.fromEntries(
    availablePlugins.map((item) => [item.id, item.description ?? item.metadata?.description ?? ""]),
  );
}

function isCancelAnswer(answer) {
  return answer === "cancel";
}

function isBackAnswer(answer) {
  return answer === "back";
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
  existingSession = null,
  onSession = async () => {},
  preparePlan,
  prompter,
}) {
  let draft = applyDetectedProviders(originalDraft, detectedProviders);
  if (existingSession?.status === "running") {
    draft = {
      ...draft,
      rootPlugins: wizardField(existingSession.draft.rootPlugins ?? []),
      all: wizardField(Boolean(existingSession.draft.all)),
      providers: wizardField(existingSession.draft.providers ?? draft.providers.value),
      optionalPlugins: wizardField(existingSession.draft.optionalPlugins ?? []),
      scope: wizardField(existingSession.draft.scope ?? draft.scope.value),
    };
  }
  if (!draft.rootPlugins.locked && !draft.all.locked) {
    const rootPluginAnswer = await prompter.ask("rootPlugins", {
      choices: availablePlugins.map((item) => item.id),
      selected: recommendedPluginSelection(draft, detectedPlugins),
      descriptions: pluginDescriptions(availablePlugins),
      detected: detectedPlugins,
      allowAll: true,
    });
    if (isCancelAnswer(rootPluginAnswer)) return { action: "cancel" };
    const pluginAnswer = normalizePluginAnswer(rootPluginAnswer);
    draft.all = wizardField(pluginAnswer.all);
    draft.rootPlugins = wizardField(pluginAnswer.all ? [] : pluginAnswer.selected);
    await onSession(toInstallIntent(draft), "plugins");
  }
  if (!draft.providers.locked) {
    const providersAnswer = await prompter.ask("providers", {
      choices: ["antigravity", "codex", "claude", "cursor"],
      selected: draft.providers.value,
      detected: detectedProviders,
    });
    if (isCancelAnswer(providersAnswer)) return { action: "cancel" };
    if (isBackAnswer(providersAnswer)) {
      draft.rootPlugins = { value: draft.rootPlugins.value, source: "default", locked: false };
      draft.all = { value: draft.all.value, source: "default", locked: false };
      return runInstallWizard({
        draft,
        availablePlugins,
        detectedProviders,
        detectedPlugins,
        onSession,
        preparePlan,
        prompter,
      });
    }
    draft.providers = wizardField(Array.isArray(providersAnswer) ? providersAnswer : [providersAnswer]);
    await onSession(toInstallIntent(draft), "providers");
  }
  const candidates = optionalCandidates(draft, availablePlugins);
  if (!draft.optionalPlugins.locked && candidates.length > 0) {
    const optionalAnswer = await prompter.ask("optionalPlugins", {
      choices: candidates,
      selected: draft.optionalPlugins.value,
      descriptions: pluginDescriptions(availablePlugins),
    });
    if (isCancelAnswer(optionalAnswer)) return { action: "cancel" };
    if (isBackAnswer(optionalAnswer)) {
      draft.providers = { value: draft.providers.value, source: "default", locked: false };
      return runInstallWizard({
        draft,
        availablePlugins,
        detectedProviders,
        detectedPlugins,
        onSession,
        preparePlan,
        prompter,
      });
    }
    draft.optionalPlugins = wizardField(Array.isArray(optionalAnswer) ? optionalAnswer : [optionalAnswer]);
    await onSession(toInstallIntent(draft), "optionalPlugins");
  }
  if (!draft.scope.locked) {
    const scopeAnswer = await prompter.ask("scope", {
      choices: ["project", "global"],
      selected: draft.scope.value,
    });
    if (isCancelAnswer(scopeAnswer)) return { action: "cancel" };
    if (isBackAnswer(scopeAnswer)) {
      if (candidates.length > 0) {
        draft.optionalPlugins = { value: draft.optionalPlugins.value, source: "default", locked: false };
      } else {
        draft.providers = { value: draft.providers.value, source: "default", locked: false };
      }
      return runInstallWizard({
        draft,
        availablePlugins,
        detectedProviders,
        detectedPlugins,
        onSession,
        preparePlan,
        prompter,
      });
    }
    draft.scope = wizardField(scopeAnswer);
    await onSession(toInstallIntent(draft), "scope");
  }
  const intent = toInstallIntent(draft);
  const plan = await preparePlan(intent);
  await onSession(toInstallIntent(draft), "confirm", JSON.stringify(plan).length.toString(36));
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
      detectedPlugins,
      onSession,
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
  descriptions = {},
  stepType = "plugins", // plugins, providers, optional, scope
}) {
  const reasons = reasonLookup(detected);
  const divider = color("────────────────────────────────────────", COLORS.dim);
  const lines = [
    "",
    color("AI Engineering install wizard", COLORS.bold + COLORS.cyan),
    divider,
    color(`${title}`, COLORS.yellow),
    color("Use ↑/↓ or j/k to move • Space: select • Enter: continue • Esc/q: cancel • b: back", COLORS.dim),
    "",
  ];
  
  if (stepType === "scope") {
    // Scope is single-select, show radio buttons
    choices.forEach((choice, index) => {
      const checked = selected.includes(choice) || selected === choice;
      const marker = cursor === index ? color("›", COLORS.green) : " ";
      const scopeDesc = choice === "project" 
        ? color("(current workspace only)", COLORS.dim)
        : color("(system-wide IDE settings)", COLORS.dim);
      lines.push(`${marker} ${checked ? color("(•)", COLORS.green) : "( )"} ${color(choice, COLORS.bold)} ${scopeDesc}`);
    });
    lines.push("", divider, color("Tip: Use ↑/↓ to change selection, Enter to continue.", COLORS.dim), "");
    return lines.join("\n");
  }
  
  if (allowAll && stepType === "plugins") {
    lines.push(`${cursor === -1 ? color("›", COLORS.green) : " "} [${all ? color("x", COLORS.green) : " "}] ${color("Install all plugins", COLORS.bold)} ${color("(full setup)", COLORS.dim)}`);
  }
  
  choices.forEach((choice, index) => {
    const checked = selected.includes(choice);
    const marker = cursor === index ? color("›", COLORS.green) : " ";
    const reasonText = reasons.has(choice) ? ` ${color(`(recommended: ${reasons.get(choice).join("; ")})`, COLORS.dim)}` : "";
    const detectedMark = detected.some(d => d === choice || (typeof d === "object" && d.pluginId === choice)) 
      ? color(" ✓", COLORS.green) 
      : "";
    lines.push(`${marker} [${checked ? color("x", COLORS.green) : " "}] ${color(choice, COLORS.bold)}${detectedMark}${reasonText}`);
    if (descriptions[choice]) {
      lines.push(color(`    ${descriptions[choice]}`, COLORS.dim));
    }
  });
  
  lines.push("", divider, color("Tip: selected items are marked with [x]. Press Enter to preview/apply the plan.", COLORS.dim), "");
  return lines.join("\n");
}

export function parseChecklistKey(input) {
  if (input === " " || input === "space") return "toggle";
  if (input === "\r" || input === "\n" || input === "enter") return "submit";
  if (input === "\u001b[A" || input === "k" || input === "up") return "up";
  if (input === "\u001b[B" || input === "j" || input === "down") return "down";
  if (input === "a") return "all";
  if (input === "b") return "back";
  if (input === "q" || input === "\u001b") return "cancel";
  return "ignore";
}

export function applyChecklistAction({
  action,
  choices,
  selected,
  cursor,
  all = false,
  allowAll = false,
}) {
  let nextSelected = [...selected];
  let nextAll = all;
  let nextCursor = cursor;
  if (action === "down") nextCursor = Math.min(choices.length - 1, cursor + 1);
  if (action === "up") nextCursor = Math.max(allowAll ? -1 : 0, cursor - 1);
  if (action === "all" || (action === "toggle" && cursor === -1)) {
    nextAll = !all;
    nextSelected = nextAll ? [...choices].sort() : [];
  } else if (action === "toggle") {
    if (nextSelected.includes(choices[cursor])) {
      nextSelected = nextSelected.filter((item) => item !== choices[cursor]);
    } else {
      nextSelected = [...nextSelected, choices[cursor]].sort();
    }
    nextAll = choices.length > 0 && choices.every((choice) => nextSelected.includes(choice));
  }
  return { selected: nextSelected, all: nextAll, cursor: nextCursor };
}

function createChecklistPrompt({ input, output }) {
  return async function checklistPrompt(step, options) {
    if (!input.setRawMode || !input.isTTY) {
      return null;
    }
    const choices = options.choices ?? [];
    const stepType = options.stepType ?? "plugins";
    const isSingleSelect = stepType === "scope";
    
    let selected = isSingleSelect 
      ? (Array.isArray(options.selected) ? options.selected[0] : options.selected)
      : [...(options.selected ?? [])];
    let cursor = (options.allowAll && !isSingleSelect) ? -1 : 0;
    let all = false;
    
    input.setRawMode(true);
    input.resume();
    
    return await new Promise((resolve) => {
      const render = () => {
        output.write("\x1Bc");
        output.write(renderChecklistStep({
          title: step,
          choices,
          selected: isSingleSelect ? [selected] : selected,
          cursor,
          allowAll: options.allowAll && !isSingleSelect,
          all,
          detected: options.detected,
          descriptions: options.descriptions,
          stepType,
        }));
      };
      
      const onData = (chunk) => {
        const action = parseChecklistKey(chunk.toString("utf8"));
        if (action === "cancel") {
          cleanup();
          resolve("cancel");
          return;
        }
        if (action === "back") {
          cleanup();
          resolve("back");
          return;
        }
        if (action === "submit") {
          cleanup();
          if (isSingleSelect) {
            resolve(selected);
          } else {
            resolve(options.allowAll ? { all, selected } : selected);
          }
          return;
        }
        
        if (isSingleSelect) {
          // Single select radio button behavior
          if (action === "down") cursor = Math.min(choices.length - 1, cursor + 1);
          if (action === "up") cursor = Math.max(0, cursor - 1);
          if (action === "toggle") selected = choices[cursor];
        } else {
          // Multi-select checkbox behavior
          ({ selected, all, cursor } = applyChecklistAction({
            action,
            choices,
            selected,
            cursor,
            all,
            allowAll: options.allowAll,
          }));
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
      const useChecklist = ["rootPlugins", "providers", "optionalPlugins", "scope"].includes(step);
      
      if (useChecklist) {
        const stepType = step === "rootPlugins" ? "plugins" 
          : step === "providers" ? "providers"
          : step === "optionalPlugins" ? "optional"
          : "scope";
        const result = await checklist(step, { ...options, stepType });
        if (result !== null) return result;
      }
      
      const choices = options.choices ?? [];
      output.write(`\n${step}:\n`);
      choices.forEach((choice, index) => {
        output.write(`  ${index + 1}. ${choice}\n`);
        if (options.descriptions?.[choice]) {
          output.write(`     ${options.descriptions[choice]}\n`);
        }
      });
      const multi = ["rootPlugins", "providers", "optionalPlugins"].includes(step);
      const selected = options.selected ?? (multi ? [] : choices[0]);
      const answer = await readline.question("> ");
      return parseSelection(answer, choices, selected, multi);
    },
    close() {
      readline.close();
    },
  };
}
