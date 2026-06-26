import { readFile } from "node:fs/promises";
import path from "node:path";

export function selectValidationEngine(args) {
  return args.includes("--platform") ? "platform" : "legacy";
}

export async function loadPlatformConfigDefaults(root) {
  const configPath = path.join(root, "ai-engineering.config.yaml");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  return {
    platformVersion: config.product?.version ?? "1.0.0",
    providers: config.providers?.enabled ?? [],
    plugins: config.plugins?.enabled ?? [],
  };
}

const FLAGS_WITH_VALUE = new Set([
  "--provider",
  "--optional",
  "--platform-version",
  "--write-lock",
]);

function flagValues(args, flag) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && index + 1 < args.length) {
      values.push(args[index + 1]);
    }
  }
  return values;
}

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : undefined;
}

export function parseResolveArgs(args, defaults) {
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token.startsWith("--")) {
      if (FLAGS_WITH_VALUE.has(token)) {
        index += 1;
      }
      continue;
    }
    positional.push(token);
  }

  const providers = flagValues(args, "--provider");
  const platformVersion = flagValue(args, "--platform-version") ?? defaults.platformVersion;
  const writeLockRequested = args.includes("--write-lock");
  const writeLockNext = flagValue(args, "--write-lock");
  const writeLockPath =
    writeLockRequested && writeLockNext && !writeLockNext.startsWith("--")
      ? writeLockNext
      : undefined;

  return {
    requested: positional.length > 0 ? positional : defaults.plugins,
    providers: providers.length > 0 ? providers : defaults.providers,
    optional: flagValues(args, "--optional"),
    platformVersion,
    writeLockRequested,
    writeLockPath,
    json: args.includes("--json"),
  };
}

export function resolutionToJson(resolution) {
  return {
    platformVersion: resolution.platformVersion,
    providers: resolution.providers,
    pluginIds: resolution.pluginIds,
    graph: resolution.graph,
    assets: resolution.assets,
    ownership: resolution.ownership,
  };
}

export function formatResolution(resolution) {
  return [
    `Resolved ${resolution.pluginIds.length} plugins for ${resolution.providers.length} providers (platform ${resolution.platformVersion}).`,
    `Plugins: ${resolution.pluginIds.join(", ")}`,
    `Assets: ${resolution.assets.length}; dependency edges: ${resolution.graph.length}`,
    "",
  ].join("\n");
}
