import { loadRuntimeModule } from "./contracts.js";

export async function planFileMerge(input: unknown): Promise<unknown> {
  const runtime = await loadRuntimeModule<{
    planTransaction(input: unknown): Promise<unknown>;
  }>("transaction");
  return runtime.planTransaction(input);
}
