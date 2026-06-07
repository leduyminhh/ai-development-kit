import { loadRuntimeModule } from "./contracts.js";

export async function writeManifest(pathname: string, value: unknown): Promise<void> {
  const runtime = await loadRuntimeModule<{
    writeJsonAtomic(pathname: string, value: unknown): Promise<void>;
  }>("io");
  await runtime.writeJsonAtomic(pathname, value);
}
