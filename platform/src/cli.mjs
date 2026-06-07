import { AiepError } from "./errors.mjs";
import { validateRepository } from "./contracts.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "1.0.0";

const HELP = `AI Engineering Platform

Usage:
  aiep --help
  aiep --version
  aiep plugin install <plugin...>
  aiep install --all
  aiep plugin update <plugin>
  aiep update --all
  aiep plugin remove <plugin>
  aiep remove --all
`;

export async function run(args, streams = process) {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    streams.stdout.write(HELP);
    return 0;
  }

  if (args.includes("--version") || args.includes("-v")) {
    streams.stdout.write(`${VERSION}\n`);
    return 0;
  }

  if (args[0] === "validate") {
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
    );
    const result = await validateRepository(root);
    if (args.includes("--json")) {
      streams.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      streams.stdout.write(
        `Validated ${result.pluginCount} plugins for ${result.providerCount} providers.\n`,
      );
    }
    return 0;
  }

  throw new AiepError(`Unknown command: ${args.join(" ")}`, {
    code: "AIEP_UNKNOWN_COMMAND",
    exitCode: 2,
  });
}
