export class AiepError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AiepError";
    this.code = options.code ?? "AIEP_ERROR";
    this.exitCode = options.exitCode ?? 1;
    this.details = options.details ?? null;
  }
}
