import { loadRuntimeModule } from "./contracts.js";
export async function loadPacks(root) {
    const runtime = await loadRuntimeModule("contracts");
    return runtime.loadPlugins(root);
}
