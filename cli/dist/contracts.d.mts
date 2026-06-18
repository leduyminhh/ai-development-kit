export function loadPlatform(root: any): Promise<any>;
export function loadPlugins(root: any): Promise<Map<any, any>>;
export function generateCommandRegistry({ root }: {
    root: any;
}): Promise<{
    schemaVersion: number;
    commands: {
        id: any;
        plugin: any;
        slug: any;
        file: string;
    }[];
}>;
export function findSkillPath(root: any, skillId: any): Promise<string | undefined>;
export function findCommandPath(root: any, commandId: any): Promise<string | undefined>;
export function loadSkillRegistry(root: any): Promise<any>;
export function validateStructuredToolContract(tool: any): string[];
export function validateRepository(root: any): Promise<{
    status: string;
    pluginCount: number;
    providerCount: number;
    mcpProviderExampleCount: number;
}>;
export function validateArtifactManifest(value: any): Promise<any>;
export { loadCanonicalCommand } from "./command-contracts.mjs";
