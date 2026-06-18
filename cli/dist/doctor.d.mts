export function doctorProject({ target, context }: {
    target: any;
    context: any;
}): Promise<{
    status: string;
    scope: any;
    plugins: any[];
    providers: never[];
    mcpServers: never[];
    nativeChecks: {
        provider: never;
        status: string;
        reason: string;
    }[];
}>;
