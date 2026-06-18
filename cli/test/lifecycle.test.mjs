import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as TOML from "@iarna/toml";

import {
  checkInstalled,
  findOutdated,
  installPlugins,
  listAvailable,
  listInstalled,
  removePlugins,
  updatePlugins,
} from "../src/lifecycle.mjs";
import { resolveInstallContext } from "../src/install-scope.mjs";
import { repoRoot, runCli } from "./helpers.mjs";

async function exists(root, relativePath) {
  try {
    await readFile(path.join(root, relativePath));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

test("installs application project-locally with required dependencies", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-install-"));
  try {
    const result = await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex"],
    });
    const lock = JSON.parse(await readFile(path.join(target, ".ai-engineering/platform.lock"), "utf8"));
    const installedPlugins = JSON.parse(
      await readFile(
        path.join(target, ".ai-engineering/installed-plugins.yaml"),
        "utf8",
      ),
    );
    const codexConfig = TOML.parse(
      await readFile(path.join(target, ".codex/config.toml"), "utf8"),
    );
    const applicationMcpEntrypoint =
      codexConfig.mcp_servers.application.args[0];

    assert.deepEqual(result.plugins, ["architecture", "application"]);
    assert.deepEqual(lock.plugins.map((item) => item.id), ["architecture", "application"]);
    assert.deepEqual(
      installedPlugins.plugins.map((item) => item.id),
      ["architecture", "application"],
    );
    assert.equal(
      await exists(target, ".agents/skills/code-shared-design/SKILL.md"),
      true,
    );
    assert.equal(
      await exists(target, ".codex/skills/code-shared-design/SKILL.md"),
      false,
    );
    assert.equal(await exists(target, ".codex/agents/java-analyze.toml"), true);
    assert.equal(await exists(target, "agents/java-analyze.toml"), false);
    assert.equal(await exists(target, ".codex/agents/openai.yaml"), true);
    assert.equal(await exists(target, ".codex/config.toml"), true);
    assert.equal(await exists(target, ".mcp.json"), false);
    assert.equal(applicationMcpEntrypoint.startsWith(target), true);
    assert.equal(applicationMcpEntrypoint.includes(`${path.sep}mcp-servers${path.sep}`), true);
    assert.equal(await exists(target, ".ai-engineering/mcp-servers/application-mcp/src/index.js"), true);
    assert.equal(await exists(target, ".ai-engineering/core/mcp/stdio-runtime.js"), true);
    assert.equal(await exists(target, ".ai-engineering/core/agents/AGENTS.baseline.md"), true);
    assert.equal(await exists(target, ".ai-engineering/core/routing/command-registry.yaml"), true);
    assert.equal(await exists(target, ".ai-engineering/core/schemas/ownership.schema.json"), true);
    assert.equal(await exists(target, ".ai-engineering/core/standards/skill-authoring-standard.md"), true);
    assert.equal(await exists(target, ".ai-engineering/core/templates/SKILL_TEMPLATE.md"), true);
    assert.equal(await exists(target, "AGENTS.md"), true);
    assert.equal(await exists(target, ".codex-plugin/plugin.json"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("installs globally with provider-native assets", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-project-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-home-"));
  try {
    const context = resolveInstallContext({
      scope: "global",
      projectRoot: project,
      homeRoot: home,
    });
    const result = await installPlugins({
      root: repoRoot,
      target: context.targetRoot,
      context,
      pluginIds: ["platform"],
      providers: ["codex", "claude", "cursor"],
    });

    assert.deepEqual(result.plugins, ["platform"]);
    assert.equal(await exists(home, ".codex/config.toml"), true);
    assert.equal(await exists(home, ".codex/AGENTS.md"), true);
    assert.equal(await exists(home, ".agents/skills/git-workflow-design/SKILL.md"), true);
    assert.equal(await exists(home, ".codex/skills/git-workflow-design/SKILL.md"), false);
    assert.equal(await exists(home, ".codex/workflows/commands.md"), true);
    assert.equal(await exists(home, ".codex/agents/openai.yaml"), true);
    assert.equal(
      await exists(home, ".codex/agents/git-workflow-design.toml"),
      true,
    );
    assert.equal(await exists(home, ".claude/skills/git-workflow-design/SKILL.md"), true);
    assert.equal(await exists(home, ".claude/commands/deployment-plan.md"), true);
    assert.equal(await exists(home, ".claude/CLAUDE.md"), true);
    assert.equal(await exists(home, ".claude.json"), true);
    assert.equal(await exists(home, ".cursor/mcp.json"), true);
    assert.equal(
      await exists(home, ".ai-engineering/mcp-servers/platform-mcp/src/index.js"),
      true,
    );
    assert.equal(await exists(home, "AGENTS.md"), false);
    assert.equal(await exists(home, "commands"), false);
    assert.equal(await exists(home, "skills"), false);
    assert.equal(await exists(home, ".cursor/rules/provider.json"), false);
    assert.equal(await exists(home, ".claude-plugin/plugin.json"), false);
    assert.equal(await exists(project, ".ai-engineering/platform.lock"), false);
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});

test("installs Claude project-native skills and commands", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-claude-project-"));
  try {
    const result = await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["claude"],
    });

    assert.deepEqual(result.plugins, ["architecture", "application"]);
    assert.equal(await exists(target, ".claude/skills/java-analyze/SKILL.md"), true);
    assert.equal(await exists(target, ".claude/commands/review-backend.md"), true);
    assert.equal(await exists(target, "CLAUDE.md"), true);
    assert.equal(await exists(target, ".mcp.json"), true);
    assert.equal(await exists(target, "agents/java-analyze.toml"), false);
    assert.equal(await exists(target, ".codex/agents/java-analyze.toml"), false);
    assert.equal(await exists(target, "skills/java-analyze/SKILL.md"), false);
    assert.equal(await exists(target, "commands/review-backend.md"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("materializes adapter projections with typed ownership", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "projection-ownership-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["claude"],
    });
    const ownership = JSON.parse(
      await readFile(
        path.join(target, ".ai-engineering/ownership.json"),
        "utf8",
      ),
    );
    const command =
      ownership.files[".claude/commands/review-backend.md"];
    assert.equal(ownership.schemaVersion, 2);
    assert.equal(command.assetType, "command");
    assert.equal(command.assetId, "application.review_backend");
    assert.deepEqual(command.owners, ["application"]);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("lifecycle does not own provider destination paths", async () => {
  const lifecycleSource = await readFile(
    path.join(repoRoot, "cli/src/lifecycle.mjs"),
    "utf8",
  );
  assert.doesNotMatch(
    lifecycleSource,
    /["'`]\.(?:agents\/skills|claude\/skills|cursor\/rules|codex\/agents)/,
  );
});

test("installs Claude global-native skills and commands", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-claude-global-project-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-claude-global-home-"));
  try {
    const context = resolveInstallContext({
      scope: "global",
      projectRoot: project,
      homeRoot: home,
    });
    const result = await installPlugins({
      root: repoRoot,
      target: context.targetRoot,
      context,
      pluginIds: ["application"],
      providers: ["claude"],
    });

    assert.deepEqual(result.plugins, ["architecture", "application"]);
    assert.equal(await exists(home, ".claude/skills/java-analyze/SKILL.md"), true);
    assert.equal(await exists(home, ".claude/commands/review-backend.md"), true);
    assert.equal(await exists(home, ".claude.json"), true);
    assert.equal(await exists(project, ".claude/skills/java-analyze/SKILL.md"), false);
    assert.equal(await exists(home, "skills/java-analyze/SKILL.md"), false);
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});

test("reinstall removes old managed provider skill paths after native migration", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-native-migration-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["platform"],
      providers: ["codex"],
    });
    await mkdir(path.join(target, ".codex/skills/git-workflow-design"), {
      recursive: true,
    });
    await writeFile(
      path.join(target, ".codex/skills/git-workflow-design/SKILL.md"),
      "old managed skill\n",
    );
    const ownership = JSON.parse(
      await readFile(path.join(target, ".ai-engineering/ownership.json"), "utf8"),
    );
    ownership.files[".codex/skills/git-workflow-design/SKILL.md"] = {
      owners: ["platform"],
      source: "git-workflow-design",
      checksum: "",
      shared: false,
    };
    await writeFile(
      path.join(target, ".ai-engineering/ownership.json"),
      JSON.stringify(ownership),
    );

    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["platform"],
      providers: ["codex"],
    });

    assert.equal(await exists(target, ".agents/skills/git-workflow-design/SKILL.md"), true);
    assert.equal(await exists(target, ".codex/skills/git-workflow-design/SKILL.md"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("installs all plugins and stops on unmanaged conflicts", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-install-all-"));
  try {
    const all = await installPlugins({
      root: repoRoot,
      target,
      all: true,
      providers: ["codex", "claude", "cursor"],
    });
    assert.equal(all.plugins.length, 7);

    await writeFile(path.join(target, ".cursor/rules/provider.json"), "user\n", {
      flag: "a",
    });
    await assert.rejects(
      installPlugins({
        root: repoRoot,
        target,
        all: true,
        providers: ["cursor"],
      }),
      /conflict/,
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli installs a plugin into the current project", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-install-"));
  try {
    const result = await runCli(
      ["plugin", "install", "application", "--provider", "codex", "--json"],
      { cwd: target },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.equal(await exists(target, ".codex/agents/openai.yaml"), true);
    assert.equal(await exists(target, ".codex-plugin/plugin.json"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli -g installs into global AI IDE settings", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-global-project-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-global-home-"));
  try {
    const result = await runCli(
      ["install", "platform", "--target", "codex", "-g", "--json"],
      {
        cwd: project,
        env: {
          HOME: home,
          USERPROFILE: home,
        },
      },
    );

    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.equal(await exists(home, ".codex/config.toml"), true);
    assert.equal(await exists(project, ".ai-engineering/platform.lock"), false);
    assert.equal(await exists(project, "AGENTS.md"), false);
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});

test("lists, detects outdated plugins, and supports dry-run updates", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-update-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex"],
    });
    const installed = await listInstalled({ target });
    assert.deepEqual(installed.plugins.map((item) => item.id), ["architecture", "application"]);

    const registry = {
      application: { latest: "1.1.0" },
      architecture: { latest: "1.0.0" },
    };
    const outdated = await findOutdated({ target, registry });
    assert.equal(outdated.updates[0].id, "application");
    assert.equal(outdated.updates[0].latest, "1.1.0");

    const dryRun = await updatePlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      registry,
      dryRun: true,
    });
    assert.equal(dryRun.changed, false);
    const lockAfterDryRun = JSON.parse(
      await readFile(path.join(target, ".ai-engineering/platform.lock"), "utf8"),
    );
    assert.equal(
      lockAfterDryRun.plugins.find((item) => item.id === "application").version,
      "1.0.0",
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("updates from canonical source and preserves unrelated root plugins", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-update-source-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application", "quality"],
      providers: ["codex"],
    });
    const lockPath = path.join(target, ".ai-engineering/platform.lock");
    const installedPath = path.join(
      target,
      ".ai-engineering/installed-plugins.yaml",
    );
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    const installed = JSON.parse(await readFile(installedPath, "utf8"));
    lock.plugins.find((item) => item.id === "application").version = "0.9.0";
    installed.plugins.find((item) => item.id === "application").version = "0.9.0";
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    await writeFile(installedPath, `${JSON.stringify(installed, null, 2)}\n`);

    const result = await updatePlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
    });
    const updated = await listInstalled({ target });

    assert.equal(result.changed, true);
    assert.deepEqual(result.updates, [
      { id: "application", current: "0.9.0", latest: "1.0.0" },
    ]);
    assert.deepEqual(updated.rootPlugins, ["application", "quality"]);
    assert.deepEqual(
      updated.plugins.map((item) => item.id),
      ["architecture", "application", "quality"],
    );
    assert.equal(
      updated.plugins.find((item) => item.id === "application").version,
      "1.0.0",
    );
    assert.equal(
      await exists(target, ".agents/skills/test-automation-validate/SKILL.md"),
      true,
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli lists installed plugins and reports outdated plugins", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-update-"));
  try {
    await runCli(["plugin", "install", "application", "--provider", "codex"], { cwd: target });
    const list = await runCli(["plugin", "list", "--json"], { cwd: target });
    assert.equal(list.exitCode, 0);
    assert.deepEqual(
      JSON.parse(list.stdout).plugins.map((item) => item.id),
      ["architecture", "application"],
    );

    const outdated = await runCli(["plugin", "outdated", "--json"], { cwd: target });
    assert.equal(outdated.exitCode, 0);
    assert.deepEqual(JSON.parse(outdated.stdout).updates, []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("lists installable plugins with their commands and skills", async () => {
  const catalog = await listAvailable({ root: repoRoot });
  assert.equal(catalog.status, "pass");
  assert.equal(catalog.plugins.count, 7);
  const application = catalog.plugins.available.find((item) => item.id === "application");
  assert.equal(application.name, "Application Engineering");
  assert.equal(application.install.defaultScope, "project");
  assert.deepEqual(application.dependencies.required, ["architecture"]);
  assert.ok(application.assets.skills.includes("react-code-generate"));
  assert.ok(
    application.assets.commands.includes("commands/review-backend.md"),
  );

  const cliCatalog = await runCli(["list", "--available", "--json"]);
  assert.equal(cliCatalog.exitCode, 0);
  assert.equal(JSON.parse(cliCatalog.stdout).plugins.available.length, 7);
});

test("checks installed MCP servers, skills, commands, and current state", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-check-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex"],
    });

    const check = await checkInstalled({ target });
    assert.equal(check.status, "pass");
    assert.equal(check.current.state, "installed");
    assert.deepEqual(check.plugins.installed.map((item) => item.id), ["architecture", "application"]);
    assert.deepEqual(check.providers, ["codex"]);
    assert.equal(check.mcp.count, 2);
    assert.deepEqual(
      check.mcp.servers.map((item) => item.name),
      ["architecture", "application"],
    );
    assert.equal(check.commands.count, 0);
    assert.equal(check.skills.count > 0, true);
    assert.equal(check.agents.count > 0, true);
    assert.ok(check.skills.installed.some((item) => item.id === "java-analyze"));
    assert.ok(check.skills.installed.some((item) => item.id === "react-code-generate"));
    assert.ok(
      check.agents.installed.some(
        (item) =>
          item.id === "java-analyze" &&
          item.path === ".codex/agents/java-analyze.toml",
      ),
    );

    const cliCheck = await runCli(["check", "--json"], { cwd: target });
    assert.equal(cliCheck.exitCode, 0);
    assert.deepEqual(
      JSON.parse(cliCheck.stdout).mcp.servers.map((item) => item.name),
      ["architecture", "application"],
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("check reports not-installed for an empty target", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-check-empty-"));
  try {
    const result = await checkInstalled({ target });
    assert.equal(result.current.state, "not-installed");
    assert.deepEqual(result.mcp.servers, []);
    assert.deepEqual(result.skills.installed, []);
    assert.deepEqual(result.commands.installed, []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("removes plugins by ownership and preserves user-owned files", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-remove-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application", "quality"],
      providers: ["codex"],
    });
    await writeFile(path.join(target, "user-owned.txt"), "keep\n");

    await removePlugins({ root: repoRoot, target, pluginIds: ["application"] });
    assert.equal(
      await exists(target, ".agents/skills/test-automation-validate/SKILL.md"),
      true,
    );
    assert.equal(
      await exists(target, ".agents/skills/java-analyze/SKILL.md"),
      false,
    );
    assert.equal(await exists(target, "user-owned.txt"), true);

    await removePlugins({ root: repoRoot, target, all: true });
    assert.equal(await exists(target, ".ai-engineering/install-state.json"), false);
    assert.equal(await exists(target, "user-owned.txt"), true);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli removes an installed plugin", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-remove-"));
  try {
    await runCli(["plugin", "install", "application", "--provider", "codex"], { cwd: target });
    const result = await runCli(["plugin", "remove", "application", "--json"], { cwd: target });
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.equal(
      await exists(target, ".agents/skills/java-analyze/SKILL.md"),
      false,
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
