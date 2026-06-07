#!/usr/bin/env node
const runtimeModule = "../../packs/platform/src/cli.mjs";
const { run } = (await import(runtimeModule));
try {
    process.exitCode = await run(process.argv.slice(2));
}
catch (error) {
    const failure = error;
    process.stderr.write(`${failure.message}\n`);
    process.exitCode = failure.exitCode ?? 1;
}
export {};
