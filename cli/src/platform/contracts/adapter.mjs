import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

export const ADAPTER_METHODS = Object.freeze([
  "validate",
  "transform",
  "package",
  "publish",
]);

export function validateAdapterContract(adapter) {
  assertCondition(adapter && typeof adapter === "object", "adapter contract must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  assertCondition(typeof adapter.id === "string" && adapter.id.length > 0, "adapter id is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  assertCondition(typeof adapter.version === "string" && adapter.version.length > 0, "adapter version is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  for (const method of ADAPTER_METHODS) {
    assertCondition(typeof adapter[method] === "function", `adapter ${adapter.id} must implement ${method}()`, {
      code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
    });
  }
  return adapter;
}
