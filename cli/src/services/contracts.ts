export async function loadRuntimeModule<T>(moduleName: string): Promise<T> {
  const runtimeModule = `../../../packs/platform/src/${moduleName}.mjs`;
  return (await import(runtimeModule)) as T;
}
