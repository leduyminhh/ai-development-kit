import { createInterface } from "node:readline/promises";

const COLORS = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  bold: "\u001b[1m",
};

function color(value, code) {
  return `${code}${value}${COLORS.reset}`;
}

function isCancelAnswer(answer) {
  return answer === "cancel";
}

function isBackAnswer(answer) {
  return answer === "back";
}

/**
 * Render upgrade selection screen with checklist UI
 */
export function renderUpgradeStep({
  title,
  updates = [],
  selected = [],
  cursor = 0,
  allowAll = false,
  all = false,
}) {
  const divider = color("────────────────────────────────────────", COLORS.dim);
  const lines = [
    "",
    color("AI Engineering upgrade wizard", COLORS.bold + COLORS.cyan),
    divider,
    color(`${title}`, COLORS.yellow),
    color("Use ↑/↓ or j/k to move • Space: select • Enter: continue • Esc/q: cancel • b: back", COLORS.dim),
    "",
  ];

  if (updates.length === 0) {
    lines.push(color("  ✓ All plugins are up to date!", COLORS.green));
    lines.push("");
    lines.push(divider);
    return lines.join("\n");
  }

  if (allowAll) {
    lines.push(`${cursor === -1 ? color("›", COLORS.green) : " "} [${all ? color("x", COLORS.green) : " "}] ${color("Upgrade all plugins", COLORS.bold)} ${color("(update everything)", COLORS.dim)}`);
  }

  updates.forEach((update, index) => {
    const checked = selected.includes(update.id);
    const marker = cursor === index ? color("›", COLORS.green) : " ";
    const versionChange = color(`${update.current}`, COLORS.dim) + " → " + color(`${update.latest}`, COLORS.green);
    lines.push(`${marker} [${checked ? color("x", COLORS.green) : " "}] ${color(update.id, COLORS.bold)} ${versionChange}`);
  });

  lines.push("", divider, color("Tip: selected items will be upgraded. Press Enter to preview/apply the changes.", COLORS.dim), "");
  return lines.join("\n");
}

/**
 * Parse keyboard input for checklist navigation
 */
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

/**
 * Apply checklist action and return new state
 */
export function applyChecklistAction({
  action,
  updates,
  selected,
  cursor,
  all = false,
  allowAll = false,
}) {
  let nextSelected = [...selected];
  let nextAll = all;
  let nextCursor = cursor;

  if (action === "down") nextCursor = Math.min(updates.length - 1, cursor + 1);
  if (action === "up") nextCursor = Math.max(allowAll ? -1 : 0, cursor - 1);
  if (action === "all" || (action === "toggle" && cursor === -1)) {
    nextAll = !all;
    nextSelected = nextAll ? updates.map((u) => u.id).sort() : [];
  } else if (action === "toggle") {
    const updateId = updates[cursor].id;
    if (nextSelected.includes(updateId)) {
      nextSelected = nextSelected.filter((id) => id !== updateId);
    } else {
      nextSelected = [...nextSelected, updateId].sort();
    }
    nextAll = updates.length > 0 && updates.every((u) => nextSelected.includes(u.id));
  }

  return { selected: nextSelected, all: nextAll, cursor: nextCursor };
}

/**
 * Create interactive checklist prompt for terminal
 */
function createUpgradeChecklistPrompt({ input, output }) {
  return async function upgradeChecklistPrompt(step, options) {
    if (!input.setRawMode || !input.isTTY) {
      return null;
    }

    const updates = options.updates ?? [];
    if (updates.length === 0) {
      output.write(renderUpgradeStep({
        title: step,
        updates: [],
      }));
      return { all: false, selected: [] };
    }

    let selected = [...(options.selected ?? [])];
    let cursor = options.allowAll ? -1 : 0;
    let all = false;

    input.setRawMode(true);
    input.resume();

    return await new Promise((resolve) => {
      const render = () => {
        output.write("\x1Bc");
        output.write(renderUpgradeStep({
          title: step,
          updates,
          selected,
          cursor,
          allowAll: options.allowAll,
          all,
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
          resolve(options.allowAll ? { all, selected } : selected);
          return;
        }

        ({ selected, all, cursor } = applyChecklistAction({
          action,
          updates,
          selected,
          cursor,
          all,
          allowAll: options.allowAll,
        }));
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

/**
 * Create terminal prompter for upgrade wizard
 */
export function createUpgradeTerminalPrompter({ input, output }) {
  const readline = createInterface({ input, output });
  const checklist = createUpgradeChecklistPrompt({ input, output });

  return {
    async ask(step, options) {
      if (step === "selectPlugins") {
        const result = await checklist(step, options);
        if (result !== null) return result;
      }

      if (step === "confirm") {
        const choices = options.choices ?? ["upgrade", "back", "cancel"];
        output.write(`\n${color("Ready to upgrade", COLORS.bold + COLORS.cyan)}\n\n`);
        
        if (options.summary) {
          output.write(color("The following plugins will be upgraded:", COLORS.yellow) + "\n");
          for (const update of options.summary) {
            output.write(`  ${color("•", COLORS.green)} ${update.id}: ${color(update.current, COLORS.dim)} → ${color(update.latest, COLORS.green)}\n`);
          }
          output.write("\n");
        }

        choices.forEach((choice, index) => {
          const label = choice === "upgrade" ? color(choice, COLORS.green) : choice;
          output.write(`  ${index + 1}. ${label}\n`);
        });

        const answer = await readline.question("> ");
        const parsed = answer.trim().toLowerCase();
        if (parsed === "1" || parsed === "upgrade") return "upgrade";
        if (parsed === "2" || parsed === "back" || parsed === "b") return "back";
        return "cancel";
      }

      return "cancel";
    },
    close() {
      readline.close();
    },
  };
}

/**
 * Run upgrade wizard workflow
 */
export async function runUpgradeWizard({
  outdated,
  prompter,
  onConfirm = async () => {},
}) {
  const updates = outdated.updates ?? [];

  if (updates.length === 0) {
    return { action: "noop", reason: "no-updates" };
  }

  // Step 1: Select plugins to upgrade
  const selectionAnswer = await prompter.ask("selectPlugins", {
    updates,
    selected: updates.map((u) => u.id), // Default: select all
    allowAll: true,
  });

  if (isCancelAnswer(selectionAnswer)) {
    return { action: "cancel" };
  }

  if (isBackAnswer(selectionAnswer)) {
    return { action: "cancel" };
  }

  const normalized = Array.isArray(selectionAnswer)
    ? { all: false, selected: selectionAnswer }
    : selectionAnswer;

  const selectedPlugins = normalized.all
    ? updates.map((u) => u.id)
    : normalized.selected;

  if (selectedPlugins.length === 0) {
    return { action: "noop", reason: "no-selection" };
  }

  // Step 2: Confirm upgrade
  const summary = updates.filter((u) => selectedPlugins.includes(u.id));
  const confirmAction = await prompter.ask("confirm", {
    choices: ["upgrade", "back", "cancel"],
    summary,
  });

  if (confirmAction === "back") {
    return runUpgradeWizard({ outdated, prompter, onConfirm });
  }

  if (confirmAction !== "upgrade") {
    return { action: "cancel" };
  }

  await onConfirm(selectedPlugins);

  return {
    action: "upgrade",
    all: normalized.all,
    pluginIds: selectedPlugins,
  };
}
