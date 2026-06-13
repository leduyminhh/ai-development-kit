import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
const LEGACY_ROOTS = [
    ".claude-plugin",
    ".codex-plugin",
    ".cursor-plugin",
    "skills",
    "platform",
    "registry",
    "schemas",
    "scripts",
    "reports",
    "references",
];
async function exists(pathname) {
    try {
        await access(pathname);
        return true;
    }
    catch {
        return false;
    }
}
export async function migrateProject({ target, dryRun = false, deleteLegacy = false, }) {
    const legacyPaths = [];
    for (const relativePath of LEGACY_ROOTS) {
        if (await exists(path.join(target, relativePath)))
            legacyPaths.push(relativePath);
    }
    if (deleteLegacy && !dryRun) {
        const backupRoot = path.join(target, ".ai-engineering", "backups", "migration");
        await mkdir(backupRoot, { recursive: true });
        for (const relativePath of legacyPaths) {
            await cp(path.join(target, relativePath), path.join(backupRoot, relativePath), {
                recursive: true,
            });
            await rm(path.join(target, relativePath), { recursive: true, force: true });
        }
    }
    return {
        status: "pass",
        dryRun,
        changed: deleteLegacy && !dryRun && legacyPaths.length > 0,
        legacyPaths,
        backupRoot: deleteLegacy && !dryRun
            ? ".ai-engineering/backups/migration"
            : undefined,
    };
}
