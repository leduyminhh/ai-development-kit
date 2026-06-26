export const PLATFORM_ERROR_CODES = Object.freeze({
  INVALID_CONTRACT: "PLATFORM_INVALID_CONTRACT",
  INVALID_ADAPTER: "PLATFORM_INVALID_ADAPTER",
  INVALID_LOCKFILE: "PLATFORM_INVALID_LOCKFILE",
  INVALID_ARTIFACT: "PLATFORM_INVALID_ARTIFACT",
});

export class PlatformContractError extends Error {
  constructor(message, { code = PLATFORM_ERROR_CODES.INVALID_CONTRACT, details = [] } = {}) {
    super(message);
    this.name = "PlatformContractError";
    this.code = code;
    this.details = details;
  }
}

export function assertCondition(condition, message, options = {}) {
  if (!condition) {
    throw new PlatformContractError(message, options);
  }
}