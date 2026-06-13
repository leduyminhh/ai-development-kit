export function preparePluginDistribution({ pluginId, version, artifactRoot, npmRoot, releaseRoot, }: {
    pluginId: any;
    version: any;
    artifactRoot: any;
    npmRoot: any;
    releaseRoot: any;
}): Promise<{
    npmPackageRoot: string;
    githubArchive: string;
}>;
