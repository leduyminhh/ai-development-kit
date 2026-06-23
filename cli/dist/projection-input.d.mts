export function buildProjectionInput({ root, graph, plugins, scope, provider, mcpServers, }: {
    root: any;
    graph: any;
    plugins: any;
    scope: any;
    provider: any;
    mcpServers: any;
}): Promise<{
    schemaVersion: number;
    scope: any;
    provider: any;
    plugins: any;
    skills: {
        id: any;
        sourcePath: string;
        owners: any[];
    }[];
    commands: {
        id: any;
        pluginId: any;
        slug: any;
        description: any;
        version: any;
        intent: any;
        inputs: any[];
        requiredSkills: any[];
        steps: any[];
        outputContract: any[];
        outputSchema: any;
        sourcePath: any;
        markdown: string;
        owners: any[];
    }[];
    agents: {
        id: any;
        sourcePath: string;
        owners: any[];
        definition: {
            name: any;
            description: any;
            instructions: any;
        } | undefined;
    }[];
    hooks: any;
    workflows: any;
    mcpServers: any;
}>;
