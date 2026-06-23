/**
 * Render uninstall selection screen with checklist UI
 */
export function renderUninstallStep({ title, plugins, selected, cursor, allowAll, all, }: {
    title: any;
    plugins?: never[] | undefined;
    selected?: never[] | undefined;
    cursor?: number | undefined;
    allowAll?: boolean | undefined;
    all?: boolean | undefined;
}): string;
/**
 * Parse keyboard input for checklist navigation
 */
export function parseChecklistKey(input: any): "cancel" | "back" | "toggle" | "submit" | "up" | "down" | "all" | "ignore";
/**
 * Apply checklist action and return new state
 */
export function applyChecklistAction({ action, plugins, selected, cursor, all, allowAll, }: {
    action: any;
    plugins: any;
    selected: any;
    cursor: any;
    all?: boolean | undefined;
    allowAll?: boolean | undefined;
}): {
    selected: any[];
    all: boolean;
    cursor: any;
};
/**
 * Create terminal prompter for uninstall wizard
 */
export function createUninstallTerminalPrompter({ input, output }: {
    input: any;
    output: any;
}): {
    ask(step: any, options: any): Promise<any>;
    close(): void;
};
/**
 * Run uninstall wizard workflow
 */
export function runUninstallWizard({ installed, prompter, onConfirm, }: {
    installed: any;
    prompter: any;
    onConfirm?: (() => Promise<void>) | undefined;
}): Promise<{
    action: string;
    reason: string;
    all?: undefined;
    pluginIds?: undefined;
} | {
    action: string;
    reason?: undefined;
    all?: undefined;
    pluginIds?: undefined;
} | {
    action: string;
    all: any;
    pluginIds: any;
    reason?: undefined;
}>;
