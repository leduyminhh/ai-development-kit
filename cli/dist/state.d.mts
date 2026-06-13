export function readPlatformState(root: any): Promise<{
    lock: any;
    ownership: any;
    installState: any;
}>;
export function createPlatformLock(input: any): {
    schemaVersion: number;
    platformVersion: any;
    providers: any[];
    plugins: any[];
};
export function createOwnership(input: any): {
    schemaVersion: number;
    files: any;
};
export function createInstallState(input: any): {
    schemaVersion: number;
    transactionId: any;
    status: string;
    completedAt: any;
};
export function validatePlatformState(root: any): Promise<{
    lock: any;
    ownership: any;
    installState: any;
}>;
export const STATE_DIR: ".ai-engineering";
export const LOCK_PATH: ".ai-engineering/platform.lock";
export const OWNERSHIP_PATH: ".ai-engineering/ownership.json";
export const INSTALL_STATE_PATH: ".ai-engineering/install-state.json";
