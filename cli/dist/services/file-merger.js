import { loadRuntimeModule } from "./contracts.js";
export async function planFileMerge(input) {
    const runtime = await loadRuntimeModule("transaction");
    return runtime.planTransaction(input);
}
