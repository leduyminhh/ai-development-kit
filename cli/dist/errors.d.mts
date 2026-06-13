export class PlatformError extends Error {
    constructor(message: any, options?: {});
    code: any;
    exitCode: any;
    details: any;
}
