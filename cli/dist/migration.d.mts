export function migrateProject({ target, dryRun, deleteLegacy, }: {
    target: any;
    dryRun?: boolean | undefined;
    deleteLegacy?: boolean | undefined;
}): Promise<{
    status: string;
    dryRun: boolean;
    changed: boolean;
    legacyPaths: string[];
    backupRoot: string | undefined;
}>;
