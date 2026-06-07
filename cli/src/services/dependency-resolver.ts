import { loadRuntimeModule } from "./contracts.js";

export async function resolveDependencies(input: unknown): Promise<unknown> {
  const runtime = await loadRuntimeModule<{
    resolvePluginGraph(input: unknown): unknown;
  }>("resolver");
  return runtime.resolvePluginGraph(input);
}
