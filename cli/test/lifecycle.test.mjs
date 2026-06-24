import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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

async function dirExists(root, relativePath) {
  try {
    return (await stat(path.join(root, relativePath))).isDirectory();
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

    const expectedPlugins = ["architecture", "data", "quality", "security", "application"];
    assert.deepEqual(result.plugins, expectedPlugins);
    assert.deepEqual(lock.plugins.map((item) => item.id), expectedPlugins);
    assert.deepEqual(
      installedPlugins.plugins.map((item) => item.id),
      expectedPlugins,
    );
    assert.equal(
      await exists(target, ".agents/skills/code-shared-design/SKILL.md"),
      true,
    );
    assert.equal(
      await exists(target, ".codex/skills/code-shared-design/SKILL.md"),
      false,
    );
    assert.equal(await exists(target, ".codex/agents/java-implement.toml"), true);
    assert.equal(await exists(target, "agents/java-implement.toml"), false);
    assert.equal(await exists(target, ".codex/agents/openai.yaml"), true);
    assert.equal(await exists(target, ".codex/config.toml"), false);
    assert.equal(await exists(target, ".mcp.json"), false);
    assert.equal(await exists(target, ".ai-engineering/mcp-servers/application/src/index.js"), false);
    assert.equal(await exists(target, ".ai-engineering/core/mcp/stdio-runtime.js"), false);
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
    assert.equal(await exists(home, ".codex/config.toml"), false);
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
    assert.equal(await exists(home, ".claude/commands/plan-deployment.md"), true);
    assert.equal(await exists(home, ".claude/CLAUDE.md"), true);
    assert.equal(await exists(home, ".claude.json"), false);
    assert.equal(await exists(home, ".cursor/mcp.json"), false);
    assert.equal(
      await exists(home, ".ai-engineering/mcp-servers/platform-mcp/src/index.js"),
      false,
    );
    assert.equal(await exists(home, ".ai-engineering/mcp-servers/platform/src/index.js"), false);
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

test("installs git workflow routing instructions only with platform", async () => {
  const applicationTarget = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-application-routing-"));
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-platform-routing-"));
  try {
    await installPlugins({
      root: repoRoot,
      target: applicationTarget,
      pluginIds: ["application"],
      providers: ["codex"],
    });
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["platform"],
      providers: ["codex"],
    });

    const applicationAgents = await readFile(
      path.join(applicationTarget, "AGENTS.md"),
      "utf8",
    );
    const agents = await readFile(path.join(target, "AGENTS.md"), "utf8");
    assert.doesNotMatch(applicationAgents, /platform[.]git_workflow_design/);
    assert.match(agents, /platform[.]git_workflow_design/);
    assert.match(agents, /commit|push|branch|PR|release|hotfix|changelog/i);
  } finally {
    await rm(applicationTarget, { recursive: true, force: true });
    await rm(target, { recursive: true, force: true });
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

    assert.deepEqual(result.plugins, ["architecture", "data", "quality", "security", "application"]);
    assert.equal(await exists(target, ".claude/skills/java-implement/SKILL.md"), true);
    assert.equal(await exists(target, ".claude/commands/review-backend.md"), true);
    assert.equal(await exists(target, "CLAUDE.md"), true);
    assert.equal(await exists(target, ".mcp.json"), false);
    assert.equal(await exists(target, "agents/java-implement.toml"), false);
    assert.equal(await exists(target, ".codex/agents/java-implement.toml"), false);
    assert.equal(await exists(target, "skills/java-implement/SKILL.md"), false);
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

    assert.deepEqual(result.plugins, ["architecture", "data", "quality", "security", "application"]);
    assert.equal(await exists(home, ".claude/skills/java-implement/SKILL.md"), true);
    assert.equal(await exists(home, ".claude/commands/review-backend.md"), true);
    assert.equal(await exists(home, ".claude.json"), false);
    assert.equal(await exists(project, ".claude/skills/java-implement/SKILL.md"), false);
    assert.equal(await exists(home, "skills/java-implement/SKILL.md"), false);
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
      ["plugin", "install", "application", "--provider", "codex", "--yes", "--json"],
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
      ["install", "platform", "--target", "codex", "-g", "--yes", "--json"],
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
    assert.equal(await exists(home, ".codex/config.toml"), false);
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
    assert.deepEqual(installed.plugins.map((item) => item.id), [
      "architecture",
      "data",
      "quality",
      "security",
      "application",
    ]);

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
      ["architecture", "data", "quality", "security", "application"],
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
    await runCli(["plugin", "install", "application", "--provider", "codex", "--yes"], { cwd: target });
    const list = await runCli(["plugin", "list", "--json"], { cwd: target });
    assert.equal(list.exitCode, 0);
    assert.deepEqual(
      JSON.parse(list.stdout).plugins.map((item) => item.id),
      ["architecture", "data", "quality", "security", "application"],
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
  assert.deepEqual(application.dependencies.required, [
    "architecture",
    "quality",
    "security",
    "data",
  ]);
  assert.ok(application.assets.skills.includes("react-implement"));
  assert.ok(
    application.assets.commands.includes("commands/review-backend.md"),
  );

  const cliCatalog = await runCli(["list", "--available", "--json"]);
  assert.equal(cliCatalog.exitCode, 0);
  assert.equal(JSON.parse(cliCatalog.stdout).plugins.available.length, 7);
});

test("checks installed skills, commands, agents, and no active MCP servers", async () => {
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
    assert.deepEqual(check.plugins.installed.map((item) => item.id), [
      "architecture",
      "data",
      "quality",
      "security",
      "application",
    ]);
    assert.deepEqual(check.providers, ["codex"]);
    assert.equal(check.mcp.count, 0);
    assert.deepEqual(check.mcp.servers, []);
    assert.equal(check.commands.count, 0);
    assert.equal(check.skills.count > 0, true);
    assert.equal(check.agents.count > 0, true);
    assert.ok(check.skills.installed.some((item) => item.id === "java-implement"));
    assert.ok(check.skills.installed.some((item) => item.id === "react-implement"));
    assert.ok(
      check.agents.installed.some(
        (item) =>
          item.id === "java-implement" &&
          item.path === ".codex/agents/java-implement.toml",
      ),
    );

    const cliCheck = await runCli(["check", "--json"], { cwd: target });
    assert.equal(cliCheck.exitCode, 0);
    assert.deepEqual(JSON.parse(cliCheck.stdout).mcp.servers, []);
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

test("remove prunes empty managed directories and leaves no orphans", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-remove-prune-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["platform"],
      providers: ["codex"],
    });
    assert.equal(
      await exists(target, ".agents/skills/git-workflow-design/SKILL.md"),
      true,
    );
    assert.equal(await dirExists(target, ".agents/skills"), true);

    await removePlugins({ root: repoRoot, target, all: true });

    assert.equal(
      await dirExists(target, ".agents/skills/git-workflow-design"),
      false,
    );
    assert.equal(await dirExists(target, ".agents/skills"), false);
    assert.equal(await dirExists(target, ".agents"), false);
    assert.equal(await dirExists(target, ".codex/agents"), false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli upgrade --dry-run previews without requiring confirmation", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-dry-run-"));
  try {
    await runCli(["install", "platform", "--target", "codex", "--yes"], {
      cwd: target,
    });

    const dryRun = await runCli(["upgrade", "--dry-run"], { cwd: target });
    assert.equal(dryRun.exitCode, 0);
    assert.doesNotMatch(dryRun.stdout, /requires confirmation/i);
    assert.match(dryRun.stdout, /up to date/i);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("cli removes an installed plugin", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-remove-"));
  try {
    await runCli(["plugin", "install", "application", "--provider", "codex", "--yes"], { cwd: target });
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

test("cli lifecycle reports scope and providers in human output", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-cli-report-"));
  try {
    const install = await runCli(
      ["install", "platform", "--target", "codex,cursor", "--yes"],
      { cwd: target },
    );
    assert.equal(install.exitCode, 0);
    assert.match(install.stdout, /Scope: project/);
    assert.match(install.stdout, /Providers: codex, cursor/);
    assert.match(install.stdout, /Installed plugins: platform/);

    const check = await runCli(["check"], { cwd: target });
    assert.equal(check.exitCode, 0);
    assert.match(check.stdout, /Current: installed/);
    assert.match(check.stdout, /Scope: project/);
    assert.match(check.stdout, /Providers: codex, cursor/);

    const remove = await runCli(["remove", "platform", "--yes"], { cwd: target });
    assert.equal(remove.exitCode, 0);
    assert.match(remove.stdout, /Scope: project/);
    assert.match(remove.stdout, /Providers: codex, cursor/);
    assert.match(remove.stdout, /Remaining plugins: none/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
