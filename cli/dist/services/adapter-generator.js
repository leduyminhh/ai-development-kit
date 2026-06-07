import { loadRuntimeModule } from "./contracts.js";
export async function generateAdapter(input) {
    const runtime = await loadRuntimeModule("lifecycle");
    return runtime.installPlugins({
        root: input.root,
        target: input.target,
        pluginIds: input.packIds,
        providers: input.providers,
    });
}
