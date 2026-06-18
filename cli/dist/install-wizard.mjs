import { createInterface } from "node:readline/promises";
import { applyDetectedProviders, toInstallIntent, } from "./install-request.mjs";
function wizardField(value) {
    return { value, source: "wizard", locked: false };
}
function optionalCandidates(draft, availablePlugins) {
    const byId = new Map(availablePlugins.map((item) => [item.id, item]));
    return [
        ...new Set(draft.rootPlugins.value.flatMap((id) => byId.get(id)?.dependencies?.optional ?? [])),
    ].sort();
}
export async function runInstallWizard({ draft: originalDraft, availablePlugins, detectedProviders, preparePlan, prompter, }) {
    let draft = applyDetectedProviders(originalDraft, detectedProviders);
    if (!draft.rootPlugins.locked) {
        draft.rootPlugins = wizardField(await prompter.ask("rootPlugins", {
            choices: availablePlugins.map((item) => item.id),
            selected: draft.rootPlugins.value,
        }));
    }
    if (!draft.providers.locked) {
        draft.providers = wizardField(await prompter.ask("providers", {
            choices: ["codex", "claude", "cursor"],
            selected: draft.providers.value,
        }));
    }
    const candidates = optionalCandidates(draft, availablePlugins);
    if (!draft.optionalPlugins.locked && candidates.length > 0) {
        draft.optionalPlugins = wizardField(await prompter.ask("optionalPlugins", {
            choices: candidates,
            selected: draft.optionalPlugins.value,
        }));
    }
    if (!draft.scope.locked) {
        draft.scope = wizardField(await prompter.ask("scope", {
            choices: ["project", "global"],
            selected: draft.scope.value,
        }));
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
    if (!answer.trim())
        return selected;
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
            const multiple = ["rootPlugins", "providers", "optionalPlugins"].includes(step);
            const selected = options.selected ?? (multiple ? [] : choices[0]);
            const answer = await readline.question("> ");
            return parseSelection(answer, choices, selected, multiple);
        },
        close() {
            readline.close();
        },
    };
}
