import { AiepError } from "./errors.mjs";
import { validateRepository } from "./contracts.mjs";
import { buildAllPlugins, verifyPluginArtifact } from "./builder.mjs";
import { readdir } from "node:fs/promises";
import { generateRegistry } from "./registry.mjs";
import { installPlugins } from "./lifecycle.mjs";
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

function parseInstallArgs(args) {
  const plugins = [];
  let providers;
  let source;
  let skipNext = false;
  for (let index = 0; index < args.length; index += 1) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    const item = args[index];
    if (item === "--provider") {
      providers = args[index + 1]?.split(",").filter(Boolean);
      skipNext = true;
      continue;
    }
    if (item === "--source") {
      source = args[index + 1];
      skipNext = true;
      continue;
    }
    if (item.startsWith("--")) {
      continue;
    }
    plugins.push(item.split("@")[0]);
  }
  return { plugins, providers, source };
}

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

  if (args[0] === "registry" && args[1] === "generate") {
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
    );
    const result = await generateRegistry({
      root,
      artifactsRoot: path.join(root, "dist", "plugins"),
      registryRoot: path.join(root, "registry"),
    });
    const output = { status: "pass", pluginCount: result.plugins.length };
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(output)}\n`
        : `Generated registry for ${output.pluginCount} plugins.\n`,
    );
    return 0;
  }

  if (
    (args[0] === "plugin" && args[1] === "install") ||
    (args[0] === "install" && args.includes("--all"))
  ) {
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
    );
    const all = args[0] === "install" && args.includes("--all");
    const parsed = all ? { plugins: [], providers: undefined } : parseInstallArgs(args.slice(2));
    const result = await installPlugins({
      root,
      target: process.cwd(),
      pluginIds: parsed.plugins,
      all,
      providers: parsed.providers,
      force: args.includes("--force"),
    });
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : `Installed ${result.plugins.join(", ")}.\n`,
    );
    return 0;
  }

  throw new AiepError(`Unknown command: ${args.join(" ")}`, {
    code: "AIEP_UNKNOWN_COMMAND",
    exitCode: 2,
  });
}
