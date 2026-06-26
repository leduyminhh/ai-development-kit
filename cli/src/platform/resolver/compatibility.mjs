import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

export function isPlatformCompatible(range, version) {
  const major = Number(version.split(".")[0]);
  const minimum = range?.match(/>=([0-9]+)\./);
  const maximum = range?.match(/<([0-9]+)\./);
  return (
    (!minimum || major >= Number(minimum[1])) &&
    (!maximum || major < Number(maximum[1]))
  );
}

export function assertPluginCompatibility({ plugin, platformVersion, providers }) {
  assertCondition(
    isPlatformCompatible(plugin.compatibility?.platform, platformVersion),
    `plugin ${plugin.id} is incompatible with platform ${platformVersion}`,
    { code: PLATFORM_ERROR_CODES.INVALID_CONTRACT },
  );

  for (const provider of providers) {
    assertCondition(
      plugin.compatibility?.providers?.[provider] === "supported",
      `plugin ${plugin.id} does not support provider ${provider}`,
      { code: PLATFORM_ERROR_CODES.INVALID_CONTRACT },
    );
  }
}
