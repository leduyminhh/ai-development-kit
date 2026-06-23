export function readInstallSession({ target }: {
    target: any;
}): Promise<any>;
export function writeInstallSession({ target, currentStep, draft, detectedProviders, detectedPlugins, planHash, }: {
    target: any;
    currentStep: any;
    draft: any;
    detectedProviders?: never[] | undefined;
    detectedPlugins?: never[] | undefined;
    planHash?: string | undefined;
}): Promise<{
    schemaVersion: number;
    sessionId: any;
    status: string;
    currentStep: any;
    draft: any;
    detectedProviders: any[];
    detectedPlugins: any[];
    planHash: string;
    createdAt: any;
    updatedAt: string;
}>;
export function completeInstallSession({ target }: {
    target: any;
}): Promise<any>;
export function cancelInstallSession({ target }: {
    target: any;
}): Promise<any>;
