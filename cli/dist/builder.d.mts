export function buildPlugin({ root, pluginId, outputRoot }: {
    root: any;
    pluginId: any;
    outputRoot: any;
}): Promise<{
    id: any;
    version: any;
    path: string;
}>;
export function buildAllPlugins({ root, outputRoot }: {
    root: any;
    outputRoot: any;
}): Promise<{
    id: any;
    version: any;
    path: string;
}[]>;
export function buildAllDistributions({ root, outputRoot }: {
    root: any;
    outputRoot: any;
}): Promise<{
    pluginArtifacts: {
        id: any;
        version: any;
        path: string;
    }[];
    distributions: {
        npmPackageRoot: string;
        githubArchive: string;
    }[];
}>;
export function verifyPluginArtifact(artifactRoot: any): Promise<{
    status: string;
    fileCount: number;
}>;
