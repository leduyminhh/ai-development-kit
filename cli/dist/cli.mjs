import { PlatformError } from "./errors.mjs";
import { validateRepository } from "./contracts.mjs";
import { buildAllPlugins, verifyPluginArtifact } from "./builder.mjs";
import { readdir } from "node:fs/promises";
import os from "node:os";
import { generateRegistry } from "./registry.mjs";
import { checkInstalled, findOutdated, installPlugins, listInstalled, removePlugins, updatePlugins, } from "./lifecycle.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeProject } from "./init.mjs";
import { doctorProject } from "./doctor.mjs";
import { migrateProject } from "./migration.mjs";
import { resolveInstallContext } from "./install-scope.mjs";
export const VERSION = "1.0.0";
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELP = `AI Engineering Platform

Usage:
  ai-engineering --help
  ai-engineering --version
  ai-engineering init
  ai-engineering doctor
  ai-engineering check
  ai-engineering install <pack...> --target <agent>
  ai-engineering uninstall <pack...>
  ai-engineering list
  ai-engineering update <pack...>
  ai-engineering upgrade
  ai-engineering generate-adapter <pack...> --target <agent>
  ai-engineering migrate --dry-run
  ai-engineering migrate --delete-legacy
  ai-engineering plugin install <plugin...>
  ai-engineering install --all
  ai-engineering plugin update <plugin>
  ai-engineering update --all
  ai-engineering plugin remove <plugin>
  ai-engineering remove --all

Options:
  --scope <project|global>  Installation scope (default: project)
`;
function formatCheck(result) {
    const lines = [
        `Current: ${result.current.state}`,
        `Scope: ${result.current.scope}`,
        `Platform: ${result.current.platformVersion ?? "unknown"}`,
        "",
        "Packs:",
        ...(result.packs.installed.length > 0
            ? result.packs.installed.map((item) => `- ${item.id}@${item.version}`)
            : ["- none"]),
        "",
        "MCP:",
        ...(result.mcp.servers.length > 0
            ? result.mcp.servers.map((item) => `- ${item}`)
            : ["- none"]),
        "",
        "Skills:",
        ...(result.skills.installed.length > 0
            ? result.skills.installed.map((item) => `- ${item}`)
            : ["- none"]),
        "",
        "Commands:",
        ...(result.commands.installed.length > 0
            ? result.commands.installed.map((item) => `- ${item}`)
            : ["- none"]),
    ];
    return `${lines.join("\n")}\n`;
}
function parseInstallArgs(args) {
    const plugins = [];
    let providers;
    let source;
    let scope = "project";
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
        if (item === "--target") {
            providers = args[index + 1]?.split(",").filter(Boolean);
            skipNext = true;
            continue;
        }
        if (item === "--source") {
            source = args[index + 1];
            skipNext = true;
            continue;
        }
        if (item === "--scope") {
            scope = args[index + 1];
            skipNext = true;
            continue;
        }
        if (item.startsWith("--")) {
            continue;
        }
        plugins.push(item.split("@")[0]);
    }
    return { plugins, providers, source, scope };
}
function resolveContext(args) {
    const scopeIndex = args.indexOf("--scope");
    return resolveInstallContext({
        scope: scopeIndex === -1 ? "project" : args[scopeIndex + 1],
        projectRoot: process.cwd(),
        homeRoot: os.homedir(),
    });
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
    if (args[0] === "init") {
        const result = await initializeProject({
            root: REPOSITORY_ROOT,
            target: process.cwd(),
        });
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `Initialized AI Engineering in ${result.target}.\n`);
        return 0;
    }
    if (args[0] === "doctor") {
        const context = resolveContext(args);
        const result = await doctorProject({
            target: context.targetRoot,
            context,
        });
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `Doctor passed for ${result.packs.length} installed packs.\n`);
        return 0;
    }
    if (args[0] === "check") {
        const context = resolveContext(args);
        const result = await checkInstalled({ target: context.targetRoot, context });
        streams.stdout.write(args.includes("--json") ? `${JSON.stringify(result)}\n` : formatCheck(result));
        return 0;
    }
    if (args[0] === "migrate") {
        if (!args.includes("--dry-run")) {
            await initializeProject({
                root: REPOSITORY_ROOT,
                target: process.cwd(),
            });
        }
        const result = await migrateProject({
            target: process.cwd(),
            dryRun: args.includes("--dry-run"),
            deleteLegacy: args.includes("--delete-legacy"),
        });
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `Migration plan contains ${result.legacyPaths.length} legacy paths.\n`);
        return 0;
    }
    if (args[0] === "validate") {
        const root = REPOSITORY_ROOT;
        const result = await validateRepository(root);
        if (args.includes("--json")) {
            streams.stdout.write(`${JSON.stringify(result)}\n`);
        }
        else {
            streams.stdout.write(`Validated ${result.pluginCount} plugins for ${result.providerCount} providers.\n`);
        }
        return 0;
    }
    if (args[0] === "build" && args.includes("--all")) {
        const root = REPOSITORY_ROOT;
        const results = await buildAllPlugins({
            root,
            outputRoot: path.join(root, "dist", "plugins"),
        });
        const result = { status: "pass", built: results };
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `Built ${results.length} plugin artifacts.\n`);
        return 0;
    }
    if (args[0] === "artifact" && args[1] === "verify" && args.includes("--all")) {
        const root = REPOSITORY_ROOT;
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
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `Verified ${verified.length} plugin artifacts.\n`);
        return 0;
    }
    if (args[0] === "registry" && args[1] === "generate") {
        const root = REPOSITORY_ROOT;
        const result = await generateRegistry({
            root,
            artifactsRoot: path.join(root, "dist", "plugins"),
            registryRoot: path.join(root, "registry"),
        });
        const output = { status: "pass", pluginCount: result.plugins.length };
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(output)}\n`
            : `Generated registry for ${output.pluginCount} plugins.\n`);
        return 0;
    }
    if ((args[0] === "plugin" && args[1] === "install") ||
        args[0] === "install" ||
        args[0] === "generate-adapter") {
        const root = REPOSITORY_ROOT;
        const all = args[0] === "install" && args.includes("--all");
        const offset = args[0] === "plugin" ? 2 : 1;
        const parsed = all
            ? {
                plugins: [],
                providers: undefined,
                scope: resolveContext(args).scope,
            }
            : parseInstallArgs(args.slice(offset));
        const context = resolveInstallContext({
            scope: parsed.scope,
            projectRoot: process.cwd(),
            homeRoot: os.homedir(),
        });
        const result = await installPlugins({
            root,
            target: context.targetRoot,
            context,
            pluginIds: parsed.plugins,
            all,
            providers: parsed.providers,
            force: args.includes("--force"),
        });
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `Installed ${result.plugins.join(", ")}.\n`);
        return 0;
    }
    if ((args[0] === "plugin" && args[1] === "remove") ||
        (args[0] === "remove" && args.includes("--all")) ||
        args[0] === "uninstall") {
        const root = REPOSITORY_ROOT;
        const all = args[0] === "remove" && args.includes("--all");
        const offset = args[0] === "plugin" ? 2 : 1;
        const parsed = all
            ? { plugins: [], scope: resolveContext(args).scope }
            : parseInstallArgs(args.slice(offset));
        const context = resolveInstallContext({
            scope: parsed.scope,
            projectRoot: process.cwd(),
            homeRoot: os.homedir(),
        });
        const result = await removePlugins({
            root,
            target: context.targetRoot,
            context,
            pluginIds: parsed.plugins,
            all,
            force: args.includes("--force"),
        });
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `Remaining plugins: ${result.plugins.join(", ")}.\n`);
        return 0;
    }
    if ((args[0] === "plugin" && args[1] === "list") ||
        args[0] === "list") {
        const context = resolveContext(args);
        const result = await listInstalled({ target: context.targetRoot, context });
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `${result.plugins.map((item) => `${item.id}@${item.version}`).join("\n")}\n`);
        return 0;
    }
    if (args[0] === "plugin" && args[1] === "outdated") {
        const context = resolveContext(args);
        const result = await findOutdated({ target: context.targetRoot, context });
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `${result.updates.map((item) => `${item.id} ${item.current} -> ${item.latest}`).join("\n")}\n`);
        return 0;
    }
    if ((args[0] === "plugin" && args[1] === "update") ||
        args[0] === "update" ||
        args[0] === "upgrade") {
        const root = REPOSITORY_ROOT;
        const all = args[0] === "upgrade" || args.includes("--all");
        const offset = args[0] === "plugin" ? 2 : 1;
        const parsed = all
            ? { plugins: [], scope: resolveContext(args).scope }
            : parseInstallArgs(args.slice(offset));
        const context = resolveInstallContext({
            scope: parsed.scope,
            projectRoot: process.cwd(),
            homeRoot: os.homedir(),
        });
        const result = await updatePlugins({
            root,
            target: context.targetRoot,
            context,
            pluginIds: parsed.plugins,
            all,
            dryRun: args.includes("--dry-run"),
            force: args.includes("--force"),
        });
        streams.stdout.write(args.includes("--json")
            ? `${JSON.stringify(result)}\n`
            : `${result.changed ? "Updated" : "No updates"}.\n`);
        return 0;
    }
    throw new PlatformError(`Unknown command: ${args.join(" ")}`, {
        code: "AI_ENGINEERING_UNKNOWN_COMMAND",
        exitCode: 2,
    });
}
