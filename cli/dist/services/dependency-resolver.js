import { loadRuntimeModule } from "./contracts.js";
export async function resolveDependencies(input) {
    const runtime = await loadRuntimeModule("resolver");
    return runtime.resolvePluginGraph(input);
}
