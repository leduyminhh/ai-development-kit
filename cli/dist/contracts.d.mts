export function loadPlatform(root: any): Promise<any>;
export function loadPlugins(root: any): Promise<Map<any, any>>;
export function findSkillPath(root: any, skillId: any): Promise<string | undefined>;
export function findCommandPath(root: any, commandId: any): Promise<string | undefined>;
export function loadCanonicalCommand(pathname: any): Promise<{
    intent: any;
    inputs: any[];
    requiredSkills: any[];
    steps: any[];
    outputContract: any[];
    markdown: string;
}>;
export function loadSkillRegistry(root: any): Promise<any>;
export function validateStructuredToolContract(tool: any): string[];
export function validateRepository(root: any): Promise<{
    status: string;
    pluginCount: number;
    providerCount: number;
    mcpServerCount: number;
}>;
export function validateArtifactManifest(value: any): Promise<any>;
