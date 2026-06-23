export function runInstallWizard({ draft: originalDraft, availablePlugins, detectedProviders, detectedPlugins, existingSession, onSession, preparePlan, prompter, }: {
    draft: any;
    availablePlugins: any;
    detectedProviders: any;
    detectedPlugins?: never[] | undefined;
    existingSession?: null | undefined;
    onSession?: (() => Promise<void>) | undefined;
    preparePlan: any;
    prompter: any;
}): Promise<{
    action: string;
    intent?: undefined;
    plan?: undefined;
} | {
    action: any;
    intent: {
        rootPlugins: any;
        all: any;
        providers: any;
        optionalPlugins: any;
        scope: any;
        force: any;
    };
    plan: any;
}>;
export function renderChecklistStep({ title, choices, selected, cursor, allowAll, all, detected, descriptions, stepType, }: {
    title: any;
    choices: any;
    selected?: never[] | undefined;
    cursor?: number | undefined;
    allowAll?: boolean | undefined;
    all?: boolean | undefined;
    detected?: never[] | undefined;
    descriptions?: {} | undefined;
    stepType?: string | undefined;
}): string;
export function parseChecklistKey(input: any): "cancel" | "back" | "toggle" | "submit" | "up" | "down" | "all" | "ignore";
export function applyChecklistAction({ action, choices, selected, cursor, all, allowAll, }: {
    action: any;
    choices: any;
    selected: any;
    cursor: any;
    all?: boolean | undefined;
    allowAll?: boolean | undefined;
}): {
    selected: any[];
    all: boolean;
    cursor: any;
};
export function createTerminalPrompter({ input, output }: {
    input: any;
    output: any;
}): {
    ask(step: any, options: any): Promise<any>;
    close(): void;
};
