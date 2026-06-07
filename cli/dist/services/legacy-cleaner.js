import { loadRuntimeModule } from "./contracts.js";
export async function cleanLegacyPaths(target) {
    const runtime = await loadRuntimeModule("migration");
    return runtime.migrateProject({
        target,
        dryRun: false,
        deleteLegacy: true,
    });
}
