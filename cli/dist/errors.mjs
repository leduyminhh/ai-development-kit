export class PlatformError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = "PlatformError";
        this.code = options.code ?? "AI_ENGINEERING_ERROR";
        this.exitCode = options.exitCode ?? 1;
        this.details = options.details ?? null;
    }
}
