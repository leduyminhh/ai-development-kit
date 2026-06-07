export const logger = {
    info(message) {
        process.stdout.write(`${message}\n`);
    },
    error(message) {
        process.stderr.write(`${message}\n`);
    },
};
