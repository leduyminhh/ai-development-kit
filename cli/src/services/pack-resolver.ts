import { loadRuntimeModule } from "./contracts.js";

export async function loadPacks(root: string): Promise<Map<string, unknown>> {
  const runtime = await loadRuntimeModule<{
    loadPlugins(root: string): Promise<Map<string, unknown>>;
  }>("contracts");
  return runtime.loadPlugins(root);
}
