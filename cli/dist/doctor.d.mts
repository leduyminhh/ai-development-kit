export function doctorProject({ target, context }: {
    target: any;
    context: any;
}): Promise<{
    status: string;
    scope: any;
    packs: any[];
    providers: never[];
    mcpServers: any[];
    nativeChecks: {
        provider: never;
        status: string;
        reason: string;
    }[];
}>;
