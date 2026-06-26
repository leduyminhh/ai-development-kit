import { validatePlatformLockfile } from "../contracts/lockfile.mjs";

export function generatePlatformLockfile(resolution) {
  const plugins = resolution.pluginIds.map((pluginId) => {
    const plugin = resolution.plugins.get(pluginId);
    return {
      id: plugin.id,
      version: plugin.version,
      dependencies: plugin.dependencies,
    };
  });

  const lockfile = {
    platformVersion: resolution.platformVersion,
    plugins,
    assets: resolution.assets,
    adapters: resolution.providers.map((provider) => ({
      id: provider,
      version: resolution.platformVersion,
    })),
    graph: resolution.graph,
  };

  return validatePlatformLockfile(lockfile);
}