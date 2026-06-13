export function generateRegistry({ root, artifactsRoot, registryRoot }: {
    root: any;
    artifactsRoot: any;
    registryRoot: any;
}): Promise<{
    apiVersion: string;
    platformVersion: any;
    plugins: never[];
}>;
export function loadRegistry(registryRoot: any): Promise<any>;
export function resolveArtifactSource(entry: any, fetchSource: any): Promise<any>;
