import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

export function validatePlatformLockfile(lockfile) {
  assertCondition(lockfile && typeof lockfile === "object" && !Array.isArray(lockfile), "platform lockfile must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(typeof lockfile.platformVersion === "string" && lockfile.platformVersion.length > 0, "lockfile platformVersion is required", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(Array.isArray(lockfile.plugins), "lockfile plugins must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(Array.isArray(lockfile.assets), "lockfile assets must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(Array.isArray(lockfile.adapters), "lockfile adapters must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(Array.isArray(lockfile.graph), "lockfile graph must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  return lockfile;
}
