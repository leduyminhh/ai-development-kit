export function runInstallWizard({ draft: originalDraft, availablePlugins, detectedProviders, preparePlan, prompter, }: {
    draft: any;
    availablePlugins: any;
    detectedProviders: any;
    preparePlan: any;
    prompter: any;
}): Promise<{
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
export function createTerminalPrompter({ input, output }: {
    input: any;
    output: any;
}): {
    ask(step: any, options: any): Promise<any>;
    close(): void;
};
