import { loadRuntimeModule } from "./contracts.js";

export async function cleanLegacyPaths(target: string): Promise<unknown> {
  const runtime = await loadRuntimeModule<{
    migrateProject(input: {
      target: string;
      dryRun: boolean;
      deleteLegacy: boolean;
    }): Promise<unknown>;
  }>("migration");
  return runtime.migrateProject({
    target,
    dryRun: false,
    deleteLegacy: true,
  });
}
