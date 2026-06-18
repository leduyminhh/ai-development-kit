export function validateCanonicalCommand(command: any, { knownSkills, knownMcpTools, validateReferences, }?: {
    knownSkills?: Set<any> | undefined;
    knownMcpTools?: Set<any> | undefined;
    validateReferences?: boolean | undefined;
}): string[];
export function loadCanonicalCommand(input: any): Promise<{
    intent: any;
    inputs: any[];
    requiredSkills: any[];
    steps: any[];
    outputContract: any[];
    sourcePath: any;
    absoluteSourcePath: any;
    pluginVersion: any;
    markdown: string;
    mcpTool?: any;
    id: any;
    pluginId: any;
    slug: any;
    description: any;
    version: any;
}>;
export function loadPluginCommands({ root, pluginId, plugin, knownSkills, knownMcpTools, validateReferences, }: {
    root: any;
    pluginId: any;
    plugin: any;
    knownSkills?: Set<any> | undefined;
    knownMcpTools?: Set<any> | undefined;
    validateReferences?: boolean | undefined;
}): Promise<{
    intent: any;
    inputs: any[];
    requiredSkills: any[];
    steps: any[];
    outputContract: any[];
    sourcePath: any;
    absoluteSourcePath: any;
    pluginVersion: any;
    markdown: string;
    mcpTool?: any;
    id: any;
    pluginId: any;
    slug: any;
    description: any;
    version: any;
}[]>;
