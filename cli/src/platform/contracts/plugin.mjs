import { normalizeAssets } from "./asset.mjs";
import { assertCondition } from "../errors/platform-error.mjs";

export const SUPPORTED_PLUGIN_API_VERSIONS = Object.freeze([
  "ai-engineering.dev/v1alpha1",
]);

function normalizeDependencyList(value) {
  if (value === undefined || value === null) return [];
  assertCondition(Array.isArray(value), "plugin dependencies must be arrays");
  return [...value].sort((left, right) => String(left).localeCompare(String(right)));
}

function normalizeProviderCompatibility(providers = {}) {
  return Object.fromEntries(
    Object.entries(providers).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function normalizePluginManifest(manifest) {
  assertCondition(manifest && typeof manifest === "object" && !Array.isArray(manifest), "plugin manifest must be an object");
  assertCondition(SUPPORTED_PLUGIN_API_VERSIONS.includes(manifest.apiVersion), "unsupported plugin apiVersion");
  assertCondition(manifest.kind === "AiIdePlugin", "unsupported plugin kind");
  assertCondition(typeof manifest.metadata?.id === "string" && manifest.metadata.id.length > 0, "plugin metadata.id is required");
  assertCondition(typeof manifest.metadata?.name === "string" && manifest.metadata.name.length > 0, "plugin metadata.name is required");
  assertCondition(typeof manifest.metadata?.version === "string" && manifest.metadata.version.length > 0, "plugin metadata.version is required");

  const required = normalizeDependencyList(manifest.dependencies?.required);
  const optional = normalizeDependencyList(manifest.dependencies?.optional);
  const legacyDependsOn = normalizeDependencyList(manifest.depends_on?.plugins);
  const requiredSet = new Set([...required, ...legacyDependsOn]);

  return {
    apiVersion: manifest.apiVersion,
    kind: "PlatformPlugin",
    sourceKind: manifest.kind,
    id: manifest.metadata.id,
    name: manifest.metadata.name,
    version: manifest.metadata.version,
    description: manifest.metadata.description ?? "",
    metadata: { ...manifest.metadata },
    compatibility: {
      platform: manifest.compatibility?.platform ?? "",
      providers: normalizeProviderCompatibility(manifest.compatibility?.providers),
    },
    dependencies: {
      required: [...requiredSet].sort((left, right) => left.localeCompare(right)),
      optional,
    },
    assets: normalizeAssets(manifest.assets),
    install: manifest.install ?? {},
    category: manifest.category ?? "",
    displayName: manifest.displayName ?? manifest.metadata.name,
    developerName: manifest.developerName ?? "",
    triggers: manifest.triggers ?? {},
    source: manifest,
  };
}
