import { loadRuntimeModule } from "./contracts.js";
export async function mergeAgents(root, target) {
    const runtime = await loadRuntimeModule("init");
    return runtime.initializeProject({ root, target });
}
