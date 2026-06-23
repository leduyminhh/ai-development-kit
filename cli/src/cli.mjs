import { PlatformError } from "./errors.mjs";
import { validateRepository } from "./contracts.mjs";
import { buildAllPlugins, verifyPluginArtifact } from "./builder.mjs";
import { readdir } from "node:fs/promises";
import os from "node:os";
import { generateRegistry } from "./registry.mjs";
import {
  checkInstalled,
  findOutdated,
  applyPreparedInstallation,
  listAvailable,
  listInstalled,
  prepareInstallation,
  removePlugins,
  updatePlugins,
} from "./lifecycle.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeProject } from "./init.mjs";
import { doctorProject } from "./doctor.mjs";
import { migrateProject } from "./migration.mjs";
import {
  workflowInit,
  workflowList,
  workflowValidate,
  workflowBuild,
  workflowRun,
  workflowStatus,
  workflowHistory,
  workflowLogs,
  workflowClean,
  workflowInstall,
  workflowStepNext,
  workflowStepComplete,
  workflowStepFail,
  WORKFLOW_HELP,
} from "./workflow.mjs";
import { resolveInstallContext } from "./install-scope.mjs";
import {
  finalizeNonInteractiveDraft,
  parseInstallRequest,
} from "./install-request.mjs";
import { detectProviders } from "./provider-detection.mjs";
import { buildInstallPlan, renderInstallPlan } from "./install-plan.mjs";
import {
  createTerminalPrompter,
  runInstallWizard,
} from "./install-wizard.mjs";
import {
  createUpgradeTerminalPrompter,
  runUpgradeWizard,
} from "./upgrade-wizard.mjs";
import {
  createUninstallTerminalPrompter,
  runUninstallWizard,
} from "./uninstall-wizard.mjs";

const COLORS = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  bold: "\u001b[1m",
};

function color(value, code) {
  return `${code}${value}${COLORS.reset}`;
}

import { detectInstallRecommendations } from "./install-detection.mjs";
import {
  cancelInstallSession,
  completeInstallSession,
  readInstallSession,
  writeInstallSession,
} from "./install-session.mjs";

export const VERSION = "1.0.0";
const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const HELP = `AI Engineering Platform

Alias:
  aie = ai-engineering

Usage:
  aie install [plugin...] [options]
  aie <command> [options]
  aie -h | --help

Quick start:
  aie init
  aie install
  aie check

Install options:
  --target <providers>      antigravity, codex, claude, cursor
  --provider <providers>    Alias for --target
  --scope <project|global>  Installation scope (default: project)
  -g, --global              Install to global AI IDE settings
  --all                     Select every installed or available plugin
  --with <plugins>          Select optional dependencies
  --yes                     Skip wizard confirmation with explicit choices
  --force                   Replace managed drift or unmanaged conflicts
  --json                    Print machine-readable output

Discovery and status:
  aie available
  aie installed [--scope <project|global>|-g]
  aie check [--scope <project|global>|-g]
  aie doctor [--scope <project|global>|-g]

Other command groups:
  aie workflow <subcommand>            Workflow definitions and runs
  aie update|remove <plugin...>        Plugin lifecycle maintenance
  aie validate|build|migrate           Maintainer commands

Legacy aliases: plugin, uninstall, upgrade
`;

function formatAvailable(result) {
  const lines = ["Installable plugins:"];
  for (const plugin of result.plugins.available) {
    lines.push(`- ${plugin.id}@${plugin.version}: ${plugin.description}`);
    lines.push(`  required: ${plugin.dependencies.required.join(", ") || "none"}`);
    lines.push(`  optional: ${plugin.dependencies.optional.join(", ") || "none"}`);
    lines.push(`  skills: ${plugin.assets.skills.join(", ") || "none"}`);
    lines.push(`  commands: ${plugin.assets.commands.join(", ") || "none"}`);
  }
  return `${lines.join("\n")}\n`;
}

function formatInstalled(result, scope) {
  if (result.plugins.length === 0) {
    const alternate = scope === "global" ? "project" : "global";
    const hint = scope === "global" ? "aie installed" : "aie installed -g";
    return `No plugins installed in ${scope} scope. Use \`${hint}\` to check ${alternate} scope.\n`;
  }
  return `${result.plugins.map((item) => `${item.id}@${item.version}`).join("\n")}\n`;
}

function formatProviders(providers) {
  return providers?.length ? providers.join(", ") : "none";
}

function formatLifecycleSummary({ scope, providers, pluginsLine }) {
  return [
    `Scope: ${scope}`,
    `Providers: ${formatProviders(providers)}`,
    pluginsLine,
  ].join("\n") + "\n";
}

function formatCheck(result) {
  const formatItems = (items) =>
    items.length > 0
      ? items.map((item) => {
        const owners = item.owners?.length ? ` owners=${item.owners.join(",")}` : "";
        const providers = item.providers?.length ? ` providers=${item.providers.join(",")}` : "";
        const pathInfo = item.path ? ` path=${item.path}` : "";
        return `- ${item.id ?? item.name}${owners}${providers}${pathInfo}`;
      })
      : ["- none"];
  const lines = [
    `Current: ${result.current.state}`,
    `Scope: ${result.current.scope}`,
    `Providers: ${formatProviders(result.providers)}`,
    `Platform: ${result.current.platformVersion ?? "unknown"}`,
    `Install state: ${result.current.installState}`,
    "",
    `Plugins (${result.plugins.installed.length}):`,
    ...(result.plugins.installed.length > 0
      ? result.plugins.installed.map((item) => `- ${item.id}@${item.version}`)
      : ["- none"]),
    "",
    `MCP (${result.mcp.count}):`,
    ...formatItems(result.mcp.servers),
    "",
    `Skills (${result.skills.count}):`,
    ...formatItems(result.skills.installed),
    "",
    `Commands (${result.commands.count}):`,
    ...formatItems(result.commands.installed),
    "",
    `Agents (${result.agents.count}):`,
    ...formatItems(result.agents.installed),
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
    if (item === "-g" || item === "--global") {
      scope = "global";
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
  if (args.includes("-g") || args.includes("--global")) {
    return resolveInstallContext({
      scope: "global",
      projectRoot: process.cwd(),
      homeRoot: os.homedir(),
    });
  }
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
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : `Initialized AI Engineering in ${result.target}.\n`,
    );
    return 0;
  }

  if (args[0] === "doctor") {
    const context = resolveContext(args);
    const result = await doctorProject({
      target: context.targetRoot,
      context,
    });
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : `Doctor passed for ${result.plugins.length} installed plugins.\n`,
    );
    return 0;
  }

  if (args[0] === "check") {
    const context = resolveContext(args);
    const result = await checkInstalled({ target: context.targetRoot, context });
    streams.stdout.write(
      args.includes("--json") ? `${JSON.stringify(result)}\n` : formatCheck(result),
    );
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
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : `Migration plan contains ${result.legacyPaths.length} legacy paths.\n`,
    );
    return 0;
  }

  if (args[0] === "validate") {
    const root = REPOSITORY_ROOT;
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
    const root = REPOSITORY_ROOT;
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
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : `Verified ${verified.length} plugin artifacts.\n`,
    );
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
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(output)}\n`
        : `Generated registry for ${output.pluginCount} plugins.\n`,
    );
    return 0;
  }

  if (
    (args[0] === "plugin" && args[1] === "install") ||
    args[0] === "install" ||
    args[0] === "generate-adapter"
  ) {
    const root = REPOSITORY_ROOT;
    const offset = args[0] === "plugin" ? 2 : 1;
    const draft = parseInstallRequest(args.slice(offset));
    const interactive = Boolean(
      streams.stdin?.isTTY && streams.stdout?.isTTY,
    );
    let intent;
    if (draft.confirm.value) {
      intent = finalizeNonInteractiveDraft(draft);
    } else if (!interactive) {
      throw new PlatformError(
        "Install requires confirmation in non-interactive mode. Pass --yes with explicit root plugins and --target, or run in an interactive terminal.",
        {
          code: "AI_ENGINEERING_MISSING_INSTALL_CHOICES",
          exitCode: 2,
        },
      );
    } else {
      const projectRoot = process.cwd();
      const detectedProvidersForWizard = await detectProviders({ projectRoot });
      const detectedRecommendations = await detectInstallRecommendations({ projectRoot });
      const sessionContext = resolveInstallContext({
        scope: draft.scope.value,
        projectRoot,
        homeRoot: os.homedir(),
      });
      const existingSession = await readInstallSession({ target: sessionContext.targetRoot });
      const catalog = await listAvailable({ root });
      const prompter = createTerminalPrompter({
        input: streams.stdin,
        output: streams.stdout,
      });
      try {
        const wizard = await runInstallWizard({
          draft,
          availablePlugins: catalog.plugins.available,
          detectedPlugins: detectedRecommendations.plugins,
          existingSession,
          onSession: async (sessionDraft, currentStep, planHash) => writeInstallSession({
            target: sessionContext.targetRoot,
            currentStep,
            draft: sessionDraft,
            detectedProviders: detectedProvidersForWizard,
            detectedPlugins: detectedRecommendations.plugins,
            planHash: planHash || "",
          }),
          availablePlugins: catalog.plugins.available,
          detectedProviders: detectedProvidersForWizard,
          preparePlan: async (candidate) => {
            const candidateContext = resolveInstallContext({
              scope: candidate.scope,
              projectRoot: process.cwd(),
              homeRoot: os.homedir(),
            });
            const candidatePrepared = await prepareInstallation({
              root,
              context: candidateContext,
              rootPlugins: candidate.rootPlugins,
              optionalPlugins: candidate.optionalPlugins,
              all: candidate.all,
              providers: candidate.providers,
              force: candidate.force,
            });
            return buildInstallPlan({
              prepared: candidatePrepared,
              context: candidateContext,
              force: candidate.force,
            });
          },
          prompter,
        });
        if (wizard.action === "cancel") {
          streams.stdout.write("Installation cancelled.\n");
          await cancelInstallSession({ target: sessionContext.targetRoot });
          return 0;
        }
        intent = wizard.intent;
      } finally {
        prompter.close();
      }
    }
    const context = resolveInstallContext({
      scope: intent.scope,
      projectRoot: process.cwd(),
      homeRoot: os.homedir(),
    });
    const prepared = await prepareInstallation({
      root,
      context,
      rootPlugins: intent.rootPlugins,
      optionalPlugins: intent.optionalPlugins,
      all: intent.all,
      providers: intent.providers,
      force: intent.force,
    });
    const plan = await buildInstallPlan({
      prepared,
      context,
      force: intent.force,
    });
    if (!draft.confirm.value && !draft.json) {
      streams.stdout.write(renderInstallPlan(plan));
    }
    if (context.projectAssets) {
      await initializeProject({ root, target: context.targetRoot });
    }
    const result = await applyPreparedInstallation({
      prepared,
      context,
      force: intent.force,
    });
    await completeInstallSession({ target: context.targetRoot });
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : formatLifecycleSummary({
          scope: result.scope,
          providers: result.providers,
          pluginsLine: `Installed plugins: ${result.plugins.join(", ") || "none"}`,
        }),
    );
    return 0;
  }

  if (
    (args[0] === "plugin" && args[1] === "remove") ||
    args[0] === "remove" ||
    args[0] === "uninstall"
  ) {
    const root = REPOSITORY_ROOT;
    const offset = args[0] === "plugin" ? 2 : 1;
    const context = resolveContext(args);

    // Non-interactive mode with explicit choices
    if (args.includes("--yes") || args.includes("--all") || args.slice(offset).some(arg => !arg.startsWith("--"))) {
      const all = args[0] === "remove" && args.includes("--all");
      const parsed = all
        ? { plugins: [], scope: context.scope }
        : parseInstallArgs(args.slice(offset));

      const result = await removePlugins({
        root,
        target: context.targetRoot,
        context,
        pluginIds: parsed.plugins,
        all,
        force: args.includes("--force"),
      });
      streams.stdout.write(
        args.includes("--json")
          ? `${JSON.stringify(result)}\n`
          : formatLifecycleSummary({
            scope: result.scope,
            providers: result.providers,
            pluginsLine: `Remaining plugins: ${result.plugins.join(", ") || "none"}`,
          }),
      );
      return 0;
    }

    // Interactive wizard mode
    const interactive = Boolean(
      streams.stdin?.isTTY && streams.stdout?.isTTY,
    );

    if (!interactive) {
      throw new PlatformError(
        "Remove requires confirmation in non-interactive mode. Pass --yes with plugin names, --all, or run in an interactive terminal.",
        {
          code: "AI_ENGINEERING_MISSING_REMOVE_CHOICES",
          exitCode: 2,
        },
      );
    }

    const installed = await listInstalled({ target: context.targetRoot, context });
    const prompter = createUninstallTerminalPrompter({
      input: streams.stdin,
      output: streams.stdout,
    });

    try {
      const wizard = await runUninstallWizard({
        installed,
        prompter,
        onConfirm: async (selectedPlugins) => {
          streams.stdout.write(color("\nPreparing removal...\n", COLORS.dim));
        },
      });

      if (wizard.action === "cancel") {
        streams.stdout.write("Removal cancelled.\n");
        return 0;
      }

      if (wizard.action === "noop") {
        const message = wizard.reason === "no-plugins"
          ? "No plugins installed.\n"
          : "No plugins selected for removal.\n";
        streams.stdout.write(message);
        return 0;
      }

      // Execute the removal
      const result = await removePlugins({
        root,
        target: context.targetRoot,
        context,
        pluginIds: wizard.pluginIds,
        all: wizard.all,
        force: args.includes("--force"),
      });

      streams.stdout.write(
        args.includes("--json")
          ? `${JSON.stringify(result)}\n`
          : formatLifecycleSummary({
            scope: result.scope,
            providers: result.providers,
            pluginsLine: `Removed plugins: ${wizard.pluginIds.join(", ") || "none"}; remaining plugins: ${result.plugins.join(", ") || "none"}`,
          }),
      );
    } finally {
      prompter.close();
    }

    return 0;
  }

  if (
    (args[0] === "plugin" && args[1] === "list") ||
    args[0] === "available" ||
    args[0] === "installed" ||
    args[0] === "list"
  ) {
    if (args[0] === "available" || args.includes("--available")) {
      const result = await listAvailable({ root: REPOSITORY_ROOT });
      streams.stdout.write(
        args.includes("--json") ? `${JSON.stringify(result)}\n` : formatAvailable(result),
      );
      return 0;
    }
    const context = resolveContext(args);
    const result = await listInstalled({ target: context.targetRoot, context });
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : formatInstalled(result, context.scope),
    );
    return 0;
  }

  if (args[0] === "plugin" && args[1] === "outdated") {
    const context = resolveContext(args);
    const result = await findOutdated({
      root: REPOSITORY_ROOT,
      target: context.targetRoot,
      context,
    });
    streams.stdout.write(
      args.includes("--json")
        ? `${JSON.stringify(result)}\n`
        : `${result.updates.map((item) => `${item.id} ${item.current} -> ${item.latest}`).join("\n")}\n`,
    );
    return 0;
  }

  if (
    (args[0] === "plugin" && args[1] === "update") ||
    args[0] === "update" ||
    args[0] === "upgrade"
  ) {
    const root = REPOSITORY_ROOT;
    const offset = args[0] === "plugin" ? 2 : 1;
    const context = resolveContext(args);

    // Check for outdated plugins first
    const outdated = await findOutdated({
      root,
      target: context.targetRoot,
      context,
    });

    // Non-interactive mode with explicit choices
    if (args.includes("--yes") || args.includes("--all") || args.slice(offset).some(arg => !arg.startsWith("--"))) {
      const all = args[0] === "upgrade" || args.includes("--all");
      const parsed = all
        ? { plugins: [], scope: context.scope }
        : parseInstallArgs(args.slice(offset));

      const result = await updatePlugins({
        root,
        target: context.targetRoot,
        context,
        pluginIds: parsed.plugins,
        all,
        dryRun: args.includes("--dry-run"),
        force: args.includes("--force"),
      });
      streams.stdout.write(
        args.includes("--json")
          ? `${JSON.stringify(result)}\n`
          : `${result.changed ? "Updated" : "No updates"}.\n`,
      );
      return 0;
    }

    // Interactive wizard mode
    const interactive = Boolean(
      streams.stdin?.isTTY && streams.stdout?.isTTY,
    );

    if (!interactive) {
      throw new PlatformError(
        "Upgrade requires confirmation in non-interactive mode. Pass --yes with plugin names, --all, or run in an interactive terminal.",
        {
          code: "AI_ENGINEERING_MISSING_UPGRADE_CHOICES",
          exitCode: 2,
        },
      );
    }

    const prompter = createUpgradeTerminalPrompter({
      input: streams.stdin,
      output: streams.stdout,
    });

    try {
      const wizard = await runUpgradeWizard({
        outdated,
        prompter,
        onConfirm: async (selectedPlugins) => {
          streams.stdout.write(color("\nPreparing upgrade...\n", COLORS.dim));
        },
      });

      if (wizard.action === "cancel") {
        streams.stdout.write("Upgrade cancelled.\n");
        return 0;
      }

      if (wizard.action === "noop") {
        const message = wizard.reason === "no-updates"
          ? "All plugins are up to date.\n"
          : "No plugins selected for upgrade.\n";
        streams.stdout.write(message);
        return 0;
      }

      // Execute the upgrade
      const result = await updatePlugins({
        root,
        target: context.targetRoot,
        context,
        pluginIds: wizard.pluginIds,
        all: wizard.all,
        dryRun: args.includes("--dry-run"),
        force: args.includes("--force"),
      });

      streams.stdout.write(
        args.includes("--json")
          ? `${JSON.stringify(result)}\n`
          : `${result.changed ? `Upgraded ${wizard.pluginIds.length} plugin(s) successfully.\n` : "No updates applied.\n"}`,
      );
    } finally {
      prompter.close();
    }

    return 0;
  }

  if (args[0] === "workflow") {
    const sub = args[1];
    const subargs = args.slice(2);
    const target = process.cwd();

    if (sub === "init") {
      const result = await workflowInit({ target });
      streams.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
    if (sub === "list") {
      const result = await workflowList({ target, core: REPOSITORY_ROOT });
      if (subargs.includes("--json")) {
        streams.stdout.write(JSON.stringify(result) + "\n");
      } else {
        for (const wf of result.workflows) {
          streams.stdout.write(`- ${wf.id} (${wf.source})\n`);
        }
      }
      return 0;
    }
    if (sub === "validate") {
      const result = await workflowValidate({ target, core: REPOSITORY_ROOT });
      streams.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
    if (sub === "build") {
      if (!subargs[0]) {
        streams.stdout.write("Usage: aie workflow build <workflow-id>\n");
        return 1;
      }
      const result = await workflowBuild({ target, core: REPOSITORY_ROOT, workflowId: subargs[0] });
      if (result.instructions) {
        streams.stdout.write(result.instructions + "\n");
      } else {
        streams.stdout.write(JSON.stringify(result) + "\n");
      }
      return 0;
    }
    if (sub === "run") {
      if (!subargs[0]) {
        streams.stdout.write("Usage: aie workflow run <workflow-id>\n");
        return 1;
      }
      const result = await workflowRun({ target, workflowId: subargs[0] });
      streams.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return 0;
    }
    if (sub === "status") {
      if (!subargs[0]) {
        streams.stdout.write("Usage: aie workflow status <workflow-id> [run-id]\n");
        return 1;
      }
      const result = await workflowStatus({ target, workflowId: subargs[0], runId: subargs[1] });
      streams.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return 0;
    }
    if (sub === "history") {
      if (!subargs[0]) {
        streams.stdout.write("Usage: aie workflow history <workflow-id>\n");
        return 1;
      }
      const result = await workflowHistory({ target, workflowId: subargs[0] });
      streams.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return 0;
    }
    if (sub === "logs") {
      if (!subargs[0] || !subargs[1]) {
        streams.stdout.write("Usage: aie workflow logs <workflow-id> <run-id>\n");
        return 1;
      }
      const result = await workflowLogs({ target, workflowId: subargs[0], runId: subargs[1] });
      streams.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return 0;
    }
    if (sub === "clean") {
      const result = await workflowClean({ target });
      streams.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
    if (sub === "install") {
      if (!subargs[0]) {
        streams.stdout.write("Usage: aie workflow install <plugin>\n");
        return 1;
      }
      const result = await workflowInstall({ root: REPOSITORY_ROOT, target, pluginId: subargs[0] });
      streams.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }


    if (sub === "step-next") {
      if (!subargs[0]) {
        streams.stdout.write("Usage: aie workflow step-next <workflow-id> [run-id]\n");
        return 1;
      }
      const result = await workflowStepNext({ target, workflowId: subargs[0], runId: subargs[1] });
      streams.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return 0;
    }
    if (sub === "step-complete") {
      if (!subargs[0] || !subargs[1] || !subargs[2]) {
        streams.stdout.write("Usage: aie workflow step-complete <workflow-id> <run-id> <step-id>\n");
        return 1;
      }
      const result = await workflowStepComplete({ target, workflowId: subargs[0], runId: subargs[1], stepId: subargs[2] });
      streams.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return 0;
    }
    if (sub === "step-fail") {
      if (!subargs[0] || !subargs[1] || !subargs[2]) {
        streams.stdout.write("Usage: aie workflow step-fail <workflow-id> <run-id> <step-id>\n");
        return 1;
      }
      const result = await workflowStepFail({ target, workflowId: subargs[0], runId: subargs[1], stepId: subargs[2] });
      streams.stdout.write(JSON.stringify(result, null, 2) + "\n");
      return 0;
    }
    streams.stdout.write(WORKFLOW_HELP);
    return 0;
  }

  throw new PlatformError(`Unknown command: ${args.join(" ")}`, {
    code: "AI_ENGINEERING_UNKNOWN_COMMAND",
    exitCode: 2,
  });
}
