import { loadRuntimeModule } from "./contracts.js";

export async function planMigration(target: string): Promise<unknown> {
  const runtime = await loadRuntimeModule<{
    migrateProject(input: {
      target: string;
      dryRun: boolean;
      deleteLegacy: boolean;
    }): Promise<unknown>;
  }>("migration");
  return runtime.migrateProject({
    target,
    dryRun: true,
    deleteLegacy: false,
  });
}
