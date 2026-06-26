import { assertCondition } from "../errors/platform-error.mjs";

export const PLATFORM_ASSET_TYPES = Object.freeze([
  "skills",
  "prompts",
  "commands",
  "templates",
  "rules",
  "workflows",
  "snippets",
  "agents",
  "hooks",
  "schemas",
]);

export function normalizeAssetList(value) {
  if (value === undefined || value === null || value === "none") return [];
  assertCondition(Array.isArray(value), "asset declaration must be an array or \"none\"");
  return [...value].sort((left, right) => String(left).localeCompare(String(right)));
}

export function normalizeAssets(assets = {}) {
  const normalized = {};
  for (const type of PLATFORM_ASSET_TYPES) {
    normalized[type] = normalizeAssetList(assets[type]);
  }
  return normalized;
}

export function createAssetDescriptors({ pluginId, assets }) {
  const normalized = normalizeAssets(assets);
  const descriptors = [];
  for (const [type, values] of Object.entries(normalized)) {
    for (const value of values) {
      descriptors.push({
        id: `${pluginId}:${type}:${value}`,
        pluginId,
        type,
        path: value,
      });
    }
  }
  return descriptors.sort((left, right) => left.id.localeCompare(right.id));
}