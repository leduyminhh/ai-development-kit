export function installPlugins({ root, target, pluginIds, all, providers, force, }: {
    root: any;
    target: any;
    pluginIds?: never[] | undefined;
    all?: boolean | undefined;
    providers: any;
    force?: boolean | undefined;
}): Promise<{
    status: string;
    plugins: any[];
    providers: any[];
}>;
export function listInstalled({ target }: {
    target: any;
}): Promise<{
    status: string;
    plugins: any;
    rootPlugins: any;
    providers: any;
    platformVersion: any;
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
export function updatePlugins({ root, target, pluginIds, all, registry, dryRun, force, }: {
    root: any;
    target: any;
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
    plugins: any[];
    providers: any[];
}>;
export function removePlugins({ root, target, pluginIds, all, force, }: {
    root: any;
    target: any;
    pluginIds?: never[] | undefined;
    all?: boolean | undefined;
    force?: boolean | undefined;
}): Promise<{
    status: string;
    plugins: any[];
    providers: any[];
}>;
