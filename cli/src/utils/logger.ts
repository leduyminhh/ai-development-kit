export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

export const logger: Logger = {
  info(message) {
    process.stdout.write(`${message}\n`);
  },
  error(message) {
    process.stderr.write(`${message}\n`);
  },
};
