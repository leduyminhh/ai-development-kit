import { loadRuntimeModule } from "./contracts.js";
export async function planMigration(target) {
    const runtime = await loadRuntimeModule("migration");
    return runtime.migrateProject({
        target,
        dryRun: true,
        deleteLegacy: false,
    });
}
