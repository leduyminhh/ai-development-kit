export function buildInstallPlan({ prepared, context, force, }: {
    prepared: any;
    context: any;
    force?: boolean | undefined;
}): Promise<{
    rootPlugins: any;
    requiredPlugins: any;
    optionalPlugins: any;
    providers: any;
    scope: any;
    targetRoot: any;
    runtime: {
        mcpServers: string[];
    };
    managedFiles: {
        provider: string;
        path: string;
        operation: string;
        assetType: any;
        assetId: any;
    }[];
    managedMerges: {
        provider: string;
        path: string;
        kind: any;
    }[];
    conflicts: never[];
    backups: any[];
}>;
export function renderInstallPlan(plan: any): string;
