export function loadWorkflow(target: any, workflowId: any): Promise<unknown>;
export function workflowInit({ target }: {
    target: any;
}): Promise<{
    status: string;
    definitions: string;
    runs: string;
}>;
export function workflowList({ target, core }: {
    target: any;
    core: any;
}): Promise<{
    status: string;
    workflows: {
        description: string;
        id: string;
        source: string;
    }[];
    projectCount: number;
    globalCount: number;
}>;
export function workflowValidate({ target, core }: {
    target: any;
    core: any;
}): Promise<{
    status: string;
    errors: string[];
}>;
export function workflowBuild({ target, core, workflowId }: {
    target: any;
    core: any;
    workflowId: any;
}): Promise<{
    status: string;
    workflowId: any;
    errors: string[];
    instructions: null;
} | {
    status: string;
    workflowId: any;
    errors: never[];
    instructions: string;
}>;
export function workflowRun({ target, workflowId, context }: {
    target: any;
    workflowId: any;
    context?: {} | undefined;
}): Promise<{
    status: string;
    workflowId: any;
    errors: string[];
    instructions: null;
    runId?: undefined;
    runDir?: undefined;
} | {
    status: string;
    workflowId: any;
    runId: string;
    runDir: string;
    instructions: string;
    errors?: undefined;
}>;
export function workflowStatus({ target, workflowId, runId }: {
    target: any;
    workflowId: any;
    runId: any;
}): Promise<{
    status: string;
    workflowId: any;
    runId?: undefined;
    state?: undefined;
} | {
    status: string;
    workflowId: any;
    runId: any;
    state?: undefined;
} | {
    status: string;
    workflowId: any;
    runId: any;
    state: any;
}>;
export function workflowHistory({ target, workflowId }: {
    target: any;
    workflowId: any;
}): Promise<{
    status: string;
    workflowId: any;
    runs: ({
        runId: string;
        status: any;
        startTime: any;
        error: any;
    } | {
        runId: string;
        status: string;
        startTime?: undefined;
        error?: undefined;
    })[];
}>;
export function workflowLogs({ target, workflowId, runId }: {
    target: any;
    workflowId: any;
    runId: any;
}): Promise<{
    status: string;
    workflowId: any;
    runId: any;
    events?: undefined;
} | {
    status: string;
    workflowId: any;
    runId: any;
    events: any[];
}>;
export function workflowClean({ target }: {
    target: any;
}): Promise<{
    status: string;
}>;
export function workflowInstall({ root, target, pluginId }: {
    root: any;
    target: any;
    pluginId: any;
}): Promise<{
    status: string;
    pluginId: any;
    installed: string[];
}>;
export const WORKFLOW_HELP: "Workflow commands:\n\n  aie workflow init                        Create workflow directory structure\n  aie workflow list                        List workflow definitions (project + global)\n  aie workflow validate                    Validate workflow definitions\n  aie workflow build <id>                  Generate deterministic step instructions\n  aie workflow run <id>                    Start workflow execution\n  aie workflow status <id> [run]           Show run status\n  aie workflow history <id>                Show run history\n  aie workflow logs <id> <run>             Show run log events\n  aie workflow clean                       Remove all run data (keeps definitions)\n  aie workflow install <plugin>            Install workflow definitions from plugin\n";
