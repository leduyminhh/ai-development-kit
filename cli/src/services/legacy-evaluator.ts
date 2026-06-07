import { loadRuntimeModule } from "./contracts.js";

export async function evaluateLegacyPaths(target: string): Promise<string[]> {
  const runtime = await loadRuntimeModule<{
    migrateProject(input: {
      target: string;
      dryRun: boolean;
      deleteLegacy: boolean;
    }): Promise<{ legacyPaths: string[] }>;
  }>("migration");
  return (
    await runtime.migrateProject({
      target,
      dryRun: true,
      deleteLegacy: false,
    })
  ).legacyPaths;
}
