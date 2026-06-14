export function installPlugins({ root, target, context, pluginIds, all, providers, force, }: {
    root: any;
    target: any;
    context: any;
    pluginIds?: never[] | undefined;
    all?: boolean | undefined;
    providers: any;
    force?: boolean | undefined;
}): Promise<{
    status: string;
    scope: any;
    plugins: any[];
    providers: any[];
}>;
export function listInstalled({ target }: {
    target: any;
}): Promise<{
    status: string;
    scope: any;
    plugins: any;
    rootPlugins: any;
    providers: any;
    platformVersion: any;
    managedMcpServers: any;
}>;
export function checkInstalled({ target }: {
    target: any;
}): Promise<{
    status: string;
    current: {
        state: string;
        scope: any;
        platformVersion: any;
        installState: any;
    };
    packs: {
        installed: any;
        roots: any;
    };
    providers: any;
    mcp: {
        servers: any[];
        byProvider: any;
    };
    skills: {
        installed: any[];
    };
    commands: {
        installed: any[];
    };
    agents: {
        installed: any[];
    };
}>;
export function findOutdated({ target, registry }: {
    target: any;
    registry?: {} | undefined;
}): Promise<{
    status: string;
    updates: {
        id: any;
        current: any;
        latest: any;
    }[];
}>;
export function updatePlugins({ root, target, context, pluginIds, all, registry, dryRun, force, }: {
    root: any;
    target: any;
    context: any;
    pluginIds?: never[] | undefined;
    all?: boolean | undefined;
    registry?: {} | undefined;
    dryRun?: boolean | undefined;
    force?: boolean | undefined;
}): Promise<{
    status: string;
    changed: boolean;
    updates: {
        id: any;
        current: any;
        latest: any;
    }[];
} | {
    changed: boolean;
    updates: {
        id: any;
        current: any;
        latest: any;
    }[];
    status: string;
    scope: any;
    plugins: any[];
    providers: any[];
}>;
export function removePlugins({ root, target, context, pluginIds, all, force, }: {
    root: any;
    target: any;
    context: any;
    pluginIds?: never[] | undefined;
    all?: boolean | undefined;
    force?: boolean | undefined;
}): Promise<{
    status: string;
    scope: any;
    plugins: any[];
    providers: any[];
}>;
