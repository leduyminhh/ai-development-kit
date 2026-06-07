import { AiepError } from "./errors.mjs";
import { validateRepository } from "./contracts.mjs";
import { buildAllPlugins, verifyPluginArtifact } from "./builder.mjs";
import { readdir } from "node:fs/promises";
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

  if (args[0] === "build" && args.includes("--all")) {
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
    );
    const results = await buildAllPlugins({
      root,
      outputRoot: path.join(root, "dist", "plugins"),
    });
    const result = { status: "pass", built: results };
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : `Built ${results.length} plugin artifacts.\n`,
    );
    return 0;
  }

  if (args[0] === "artifact" && args[1] === "verify" && args.includes("--all")) {
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
    );
    const pluginsRoot = path.join(root, "dist", "plugins");
    const verified = [];
    for (const pluginId of (await readdir(pluginsRoot)).sort()) {
      const versions = await readdir(path.join(pluginsRoot, pluginId));
      for (const version of versions.sort()) {
        await verifyPluginArtifact(path.join(pluginsRoot, pluginId, version));
        verified.push({ id: pluginId, version });
      }
    }
    const result = { status: "pass", verified };
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : `Verified ${verified.length} plugin artifacts.\n`,
    );
    return 0;
  }

  throw new AiepError(`Unknown command: ${args.join(" ")}`, {
    code: "AIEP_UNKNOWN_COMMAND",
    exitCode: 2,
  });
}
