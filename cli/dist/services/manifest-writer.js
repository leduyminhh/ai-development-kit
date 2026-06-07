import { loadRuntimeModule } from "./contracts.js";
export async function writeManifest(pathname, value) {
    const runtime = await loadRuntimeModule("io");
    await runtime.writeJsonAtomic(pathname, value);
}
