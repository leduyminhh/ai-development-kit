export function defineCommand(name) {
    return {
        name,
        execute(args, run) {
            return run([name, ...args]);
        },
    };
}
