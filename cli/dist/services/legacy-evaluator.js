import { loadRuntimeModule } from "./contracts.js";
export async function evaluateLegacyPaths(target) {
    const runtime = await loadRuntimeModule("migration");
    return (await runtime.migrateProject({
        target,
        dryRun: true,
        deleteLegacy: false,
    })).legacyPaths;
}
