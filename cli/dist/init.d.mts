export function mergeManagedBlock(existing: any, baseline: any, relativePath: any): string;
export function prepareInstructionFileContent({ root, target, relativePath, }: {
    root: any;
    target: any;
    relativePath: any;
}): Promise<string>;
export function initializeInstructionFile({ root, target, relativePath, }: {
    root: any;
    target: any;
    relativePath: any;
}): Promise<void>;
export function initializeProject({ root, target }: {
    root: any;
    target: any;
}): Promise<{
    status: string;
    target: any;
}>;
