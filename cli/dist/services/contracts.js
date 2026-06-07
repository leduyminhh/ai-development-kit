export async function loadRuntimeModule(moduleName) {
    const runtimeModule = `../../../packs/platform/src/${moduleName}.mjs`;
    return (await import(runtimeModule));
}
