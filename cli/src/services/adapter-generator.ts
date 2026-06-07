import { loadRuntimeModule } from "./contracts.js";

export interface AdapterGenerationInput {
  root: string;
  target: string;
  packIds: string[];
  providers: string[];
}

export async function generateAdapter(input: AdapterGenerationInput): Promise<unknown> {
  const runtime = await loadRuntimeModule<{
    installPlugins(input: {
      root: string;
      target: string;
      pluginIds: string[];
      providers: string[];
    }): Promise<unknown>;
  }>("lifecycle");
  return runtime.installPlugins({
    root: input.root,
    target: input.target,
    pluginIds: input.packIds,
    providers: input.providers,
  });
}
