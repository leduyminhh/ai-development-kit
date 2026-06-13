#!/usr/bin/env node
import { run } from "./cli.mjs";
try {
    process.exitCode = await run(process.argv.slice(2));
}
catch (error) {
    const failure = error;
    process.stderr.write(`${failure.message}\n`);
    process.exitCode = failure.exitCode ?? 1;
}
