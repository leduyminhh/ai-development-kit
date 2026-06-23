export function validateCanonicalCommand(command: any, { knownSkills, validateReferences, }?: {
    knownSkills?: Set<any> | undefined;
    validateReferences?: boolean | undefined;
}): string[];
export function loadCanonicalCommand(input: any): Promise<{
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
    absoluteSourcePath: any;
    pluginVersion: any;
    markdown: string;
}>;
export function loadPluginCommands({ root, pluginId, plugin, knownSkills, validateReferences, }: {
    root: any;
    pluginId: any;
    plugin: any;
    knownSkills?: Set<any> | undefined;
    validateReferences?: boolean | undefined;
}): Promise<{
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
    absoluteSourcePath: any;
    pluginVersion: any;
    markdown: string;
}[]>;
