export interface Logger {
    info(message: string): void;
    error(message: string): void;
}
export declare const logger: Logger;
