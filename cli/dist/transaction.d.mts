export function planTransaction({ target, desiredFiles, lock, ownership, force, validateApplied, }: {
    target: any;
    desiredFiles: any;
    lock: any;
    ownership: any;
    force?: boolean | undefined;
    validateApplied: any;
}): Promise<{
    target: any;
    actions: {
        action: string;
        relativePath: any;
        destination: string;
        content: any;
    }[];
    lock: any;
    ownership: {
        schemaVersion: any;
        files: {};
    };
    validateApplied: any;
    transactionId: `${string}-${string}-${string}-${string}-${string}`;
    backupRelativePaths: any[];
}>;
export function applyTransaction(plan: any): Promise<{
    status: string;
    written: any;
}>;
