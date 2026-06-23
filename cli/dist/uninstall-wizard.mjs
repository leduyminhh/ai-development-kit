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
 * Render uninstall selection screen with checklist UI
 */
export function renderUninstallStep({ title, plugins = [], selected = [], cursor = 0, allowAll = false, all = false, }) {
    const divider = color("────────────────────────────────────────", COLORS.dim);
    const lines = [
        "",
        color("AI Engineering uninstall wizard", COLORS.bold + COLORS.cyan),
        divider,
        color(`${title}`, COLORS.yellow),
        color("Use ↑/↓ or j/k to move • Space: select • Enter: continue • Esc/q: cancel • b: back", COLORS.dim),
        "",
    ];
    if (plugins.length === 0) {
        lines.push(color("  ✓ No plugins installed", COLORS.dim));
        lines.push("");
        lines.push(divider);
        return lines.join("\n");
    }
    if (allowAll) {
        lines.push(`${cursor === -1 ? color("›", COLORS.green) : " "} [${all ? color("x", COLORS.red) : " "}] ${color("Remove all plugins", COLORS.bold)} ${color("(complete uninstall)", COLORS.dim)}`);
    }
    plugins.forEach((plugin, index) => {
        const checked = selected.includes(plugin.id);
        const marker = cursor === index ? color("›", COLORS.green) : " ";
        const versionInfo = color(`v${plugin.version}`, COLORS.dim);
        lines.push(`${marker} [${checked ? color("x", COLORS.red) : " "}] ${color(plugin.id, COLORS.bold)} ${versionInfo}`);
    });
    lines.push("", divider, color("Warning: Selected plugins and their assets will be removed.", COLORS.red), "");
    return lines.join("\n");
}
/**
 * Parse keyboard input for checklist navigation
 */
export function parseChecklistKey(input) {
    if (input === " " || input === "space")
        return "toggle";
    if (input === "\r" || input === "\n" || input === "enter")
        return "submit";
    if (input === "\u001b[A" || input === "k" || input === "up")
        return "up";
    if (input === "\u001b[B" || input === "j" || input === "down")
        return "down";
    if (input === "a")
        return "all";
    if (input === "b")
        return "back";
    if (input === "q" || input === "\u001b")
        return "cancel";
    return "ignore";
}
/**
 * Apply checklist action and return new state
 */
export function applyChecklistAction({ action, plugins, selected, cursor, all = false, allowAll = false, }) {
    let nextSelected = [...selected];
    let nextAll = all;
    let nextCursor = cursor;
    if (action === "down")
        nextCursor = Math.min(plugins.length - 1, cursor + 1);
    if (action === "up")
        nextCursor = Math.max(allowAll ? -1 : 0, cursor - 1);
    if (action === "all" || (action === "toggle" && cursor === -1)) {
        nextAll = !all;
        nextSelected = nextAll ? plugins.map((p) => p.id).sort() : [];
    }
    else if (action === "toggle") {
        const pluginId = plugins[cursor].id;
        if (nextSelected.includes(pluginId)) {
            nextSelected = nextSelected.filter((id) => id !== pluginId);
        }
        else {
            nextSelected = [...nextSelected, pluginId].sort();
        }
        nextAll = plugins.length > 0 && plugins.every((p) => nextSelected.includes(p.id));
    }
    return { selected: nextSelected, all: nextAll, cursor: nextCursor };
}
/**
 * Create interactive checklist prompt for terminal
 */
function createUninstallChecklistPrompt({ input, output }) {
    return async function uninstallChecklistPrompt(step, options) {
        if (!input.setRawMode || !input.isTTY) {
            return null;
        }
        const plugins = options.plugins ?? [];
        if (plugins.length === 0) {
            output.write(renderUninstallStep({
                title: step,
                plugins: [],
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
                output.write(renderUninstallStep({
                    title: step,
                    plugins,
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
                    plugins,
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
 * Create terminal prompter for uninstall wizard
 */
export function createUninstallTerminalPrompter({ input, output }) {
    const readline = createInterface({ input, output });
    const checklist = createUninstallChecklistPrompt({ input, output });
    return {
        async ask(step, options) {
            if (step === "selectPlugins") {
                const result = await checklist(step, options);
                if (result !== null)
                    return result;
            }
            if (step === "confirm") {
                const choices = options.choices ?? ["remove", "back", "cancel"];
                output.write(`\n${color("Ready to uninstall", COLORS.bold + COLORS.red)}\n\n`);
                if (options.summary) {
                    output.write(color("⚠ Warning: The following plugins will be REMOVED:", COLORS.red) + "\n");
                    for (const plugin of options.summary) {
                        output.write(`  ${color("•", COLORS.red)} ${plugin.id} ${color(`v${plugin.version}`, COLORS.dim)}\n`);
                    }
                    output.write("\n");
                    output.write(color("This action will remove all associated assets (skills, commands, agents, etc.).", COLORS.dim) + "\n");
                    output.write(color("User-owned files will be preserved.", COLORS.dim) + "\n\n");
                }
                choices.forEach((choice, index) => {
                    const label = choice === "remove" ? color(choice, COLORS.red) : choice;
                    output.write(`  ${index + 1}. ${label}\n`);
                });
                const answer = await readline.question("> ");
                const parsed = answer.trim().toLowerCase();
                if (parsed === "1" || parsed === "remove")
                    return "remove";
                if (parsed === "2" || parsed === "back" || parsed === "b")
                    return "back";
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
 * Run uninstall wizard workflow
 */
export async function runUninstallWizard({ installed, prompter, onConfirm = async () => { }, }) {
    const plugins = installed.plugins ?? [];
    if (plugins.length === 0) {
        return { action: "noop", reason: "no-plugins" };
    }
    // Step 1: Select plugins to remove
    const selectionAnswer = await prompter.ask("selectPlugins", {
        plugins,
        selected: [], // Default: none selected (safer for removal)
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
        ? plugins.map((p) => p.id)
        : normalized.selected;
    if (selectedPlugins.length === 0) {
        return { action: "noop", reason: "no-selection" };
    }
    // Step 2: Confirm removal
    const summary = plugins.filter((p) => selectedPlugins.includes(p.id));
    const confirmAction = await prompter.ask("confirm", {
        choices: ["remove", "back", "cancel"],
        summary,
    });
    if (confirmAction === "back") {
        return runUninstallWizard({ installed, prompter, onConfirm });
    }
    if (confirmAction !== "remove") {
        return { action: "cancel" };
    }
    await onConfirm(selectedPlugins);
    return {
        action: "remove",
        all: normalized.all,
        pluginIds: selectedPlugins,
    };
}
