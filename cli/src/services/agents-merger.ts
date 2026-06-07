import { loadRuntimeModule } from "./contracts.js";

export async function mergeAgents(root: string, target: string): Promise<unknown> {
  const runtime = await loadRuntimeModule<{
    initializeProject(input: { root: string; target: string }): Promise<unknown>;
  }>("init");
  return runtime.initializeProject({ root, target });
}
