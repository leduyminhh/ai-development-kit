export function resolveInstallContext({ scope, projectRoot, homeRoot, }: {
    scope?: string | undefined;
    projectRoot: any;
    homeRoot: any;
}): {
    scope: string;
    targetRoot: string;
    stateRoot: string;
    projectAssets: boolean;
};
