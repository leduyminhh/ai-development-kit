import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

export function validateBuildArtifactManifest(artifact) {
  assertCondition(artifact && typeof artifact === "object" && !Array.isArray(artifact), "build artifact manifest must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(typeof artifact.apiVersion === "string" && artifact.apiVersion.length > 0, "artifact apiVersion is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(artifact.kind === "PlatformBuildArtifact", "artifact kind must be PlatformBuildArtifact", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(typeof artifact.id === "string" && artifact.id.length > 0, "artifact id is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(typeof artifact.version === "string" && artifact.version.length > 0, "artifact version is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(Array.isArray(artifact.files), "artifact files must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(typeof artifact.platformVersion === "string" && artifact.platformVersion.length > 0, "artifact platformVersion is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(Array.isArray(artifact.plugins), "artifact plugins must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(artifact.checksums && typeof artifact.checksums === "object" && !Array.isArray(artifact.checksums), "artifact checksums must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(artifact.checksums.algorithm === "sha256", "artifact checksums algorithm must be sha256", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(artifact.checksums.files && typeof artifact.checksums.files === "object" && !Array.isArray(artifact.checksums.files), "artifact checksum files must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  return artifact;
}

