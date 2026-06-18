import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  findCommandPath,
  generateCommandRegistry,
  loadCanonicalCommand,
  loadPlatform,
  loadPlugins,
  validateRepository,
} from "../src/contracts.mjs";
import { loadPluginCommands } from "../src/command-contracts.mjs";
import { repoRoot } from "./helpers.mjs";

async function withRepositoryCopy(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-contracts-"));
  try {
    for (const entry of [
      "ai-engineering.config.yaml",
      "plugins",
      "adapters",
      "cli",
      "core",
      "mcp-servers",
      "docs",
    ]) {
      await cp(path.join(repoRoot, entry), path.join(root, entry), {
        recursive: true,
      });
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withPluginsRepositoryCopy(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-plugins-"));
  try {
    for (const entry of [
      "ai-engineering.config.yaml",
      "adapters",
      "cli",
      "core",
      "mcp-servers",
      "docs",
    ]) {
      await cp(path.join(repoRoot, entry), path.join(root, entry), {
        recursive: true,
      });
    }
    await cp(path.join(repoRoot, "plugins"), path.join(root, "plugins"), {
      recursive: true,
    });
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("loads seven canonical plugin contracts", async () => {
  const platform = await loadPlatform(repoRoot);
  const plugins = await loadPlugins(repoRoot);
  const validation = await validateRepository(repoRoot);

  assert.equal(platform.product.name, "ai-engineering-platform");
  assert.deepEqual([...plugins.keys()], [
    "application",
    "architecture",
    "data",
    "knowledge",
    "platform",
    "quality",
    "security",
  ]);
  assert.equal(validation.pluginCount, 7);
  assert.equal(validation.providerCount, 3);
  assert.equal(validation.mcpServerCount, 7);

  for (const [pluginId, plugin] of plugins) {
    assert.equal(plugin.apiVersion, "ai-engineering.dev/v1alpha1");
    assert.equal(plugin.kind, "AiIdePlugin");
    assert.equal(plugin.metadata.id, pluginId);
    assert.ok(plugin.assets.skills.length > 0);
    assert.ok(plugin.assets.commands.length > 0);

    const command = await loadCanonicalCommand(
      await findCommandPath(repoRoot, plugin.assets.commands[0]),
    );
    assert.equal(
      command.slug,
      path.basename(plugin.assets.commands[0], ".md"),
    );
    assert.ok(
      command.requiredSkills.every((skill) => plugin.assets.skills.includes(skill)),
    );
  }
});

test("rejects unknown skills and missing commands", async () => {
  await withRepositoryCopy(async (root) => {
    const manifestPath = path.join(
      root,
      "plugins",
      "application",
      "plugin.yaml",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.assets.skills.push("missing-skill");
    manifest.assets.commands.push("missing-command");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    await assert.rejects(validateRepository(root), (error) => {
      assert.match(error.message, /unknown skill missing-skill/);
      assert.match(error.message, /missing command missing-command/);
      return true;
    });
  });
});

test("rejects skills that are not mapped in the central skill registry", async () => {
  await withRepositoryCopy(async (root) => {
    const skillRoot = path.join(
      root,
      "plugins",
      "application",
      "skills",
      "unmapped-skill",
    );
    await mkdir(skillRoot, { recursive: true });
    await writeFile(
      path.join(skillRoot, "SKILL.md"),
      "---\nname: unmapped-skill\ndescription: Test skill.\n---\n\n# Test\n",
    );

    await assert.rejects(validateRepository(root), /skill registry for plugin application/);
  });
});

test("loads canonical plugin contracts from plugins root", async () => {
  await withPluginsRepositoryCopy(async (root) => {
    const plugins = await loadPlugins(root);
    const validation = await validateRepository(root);

    assert.deepEqual([...plugins.keys()], [
      "application",
      "architecture",
      "data",
      "knowledge",
      "platform",
      "quality",
      "security",
    ]);
    assert.equal(validation.pluginCount, 7);
  });
});

test("application owns the full-stack orchestration skill set", async () => {
  const plugins = await loadPlugins(repoRoot);
  const application = plugins.get("application");
  const owned = application.skills.map((item) => path.basename(path.dirname(item.path)));

  assert.deepEqual(
    [
      "api-contract-design",
      "feature-delivery",
      "feature-fix",
      "feature-implement",
      "feature-integrate",
      "feature-plan",
      "feature-review",
      "feature-test",
    ].filter((skill) => !owned.includes(skill)),
    [],
  );
});

test("Java and React canonical skills expose implementation subagents", async () => {
  const java = await readFile(
    path.join(repoRoot, "plugins/application/skills/java-analyze/SKILL.md"),
    "utf8",
  );
  const react = await readFile(
    path.join(repoRoot, "plugins/application/skills/react-code-generate/SKILL.md"),
    "utf8",
  );

  assert.match(java, /subagents\/java-spring-implement[.]md/);
  assert.match(react, /subagents\/react-frontend-implement[.]md/);
});

test("application owns one Python backend skill with FastAPI and Django routing", async () => {
  const skill = await readFile(
    path.join(
      repoRoot,
      "plugins/application/skills/python-backend-engineer/SKILL.md",
    ),
    "utf8",
  );

  assert.match(skill, /fastapi-backend-implement[.]md/);
  assert.match(skill, /django-drf-backend-implement[.]md/);
  assert.match(skill, /python-backend-verification[.]md/);
});

test("application defines ten parseable deliverable command files", async () => {
  const commandIds = [
    "deliver-feature",
    "design-api-contract",
    "design-data-change",
    "fix-feature",
    "implement-backend",
    "implement-frontend",
    "integrate-feature",
    "plan-feature",
    "review-feature",
    "test-feature",
  ];

  for (const commandId of commandIds) {
    const command = await loadCanonicalCommand(
      path.join(repoRoot, "plugins/application/commands", `${commandId}.md`),
    );
    assert.equal(command.slug, commandId);
    assert.ok(command.intent.length > 0);
    assert.ok(command.inputs.length > 0);
    assert.ok(command.requiredSkills.length > 0);
    assert.ok(command.steps.length > 0);
    assert.ok(command.outputContract.length > 0);
  }
});

test("application exposes canonical command files with optional MCP tools", async () => {
  const plugins = await loadPlugins(repoRoot);
  const application = plugins.get("application");
  assert.deepEqual(application.assets.commands, [
    "commands/deliver-feature.md",
    "commands/design-api-contract.md",
    "commands/design-data-change.md",
    "commands/fix-feature.md",
    "commands/implement-backend.md",
    "commands/implement-frontend.md",
    "commands/integrate-feature.md",
    "commands/plan-feature.md",
    "commands/review-backend.md",
    "commands/review-feature.md",
    "commands/test-feature.md",
  ]);
  const commands = await loadPluginCommands({
    root: repoRoot,
    pluginId: "application",
    plugin: application,
  });
  assert.equal(commands.length, application.assets.commands.length);
  assert.ok(commands.every((command) => /^application[.]/.test(command.id)));
  assert.deepEqual(
    commands.filter((command) => command.mcpTool).map((command) => command.mcpTool),
    ["application.generate_service", "application.review_source_code"],
  );
});

test("all command files are canonical manifest assets", async () => {
  const plugins = await loadPlugins(repoRoot);
  for (const [pluginId, plugin] of plugins) {
    assert.equal(Object.hasOwn(plugin, "commands"), false);
    assert.ok(
      plugin.assets.commands.every((item) =>
        /^commands\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(item),
      ),
    );
    const commands = await loadPluginCommands({
      root: repoRoot,
      pluginId,
      plugin,
    });
    assert.equal(commands.length, plugin.assets.commands.length);
  }
});

test("committed command registry is deterministic schema version 2", async () => {
  const expected = await generateCommandRegistry({ root: repoRoot });
  const committed = JSON.parse(
    await readFile(
      path.join(repoRoot, "core/routing/command-registry.yaml"),
      "utf8",
    ),
  );
  assert.deepEqual(committed, expected);
  assert.equal(committed.schemaVersion, 2);
});

test("rejects provider-specific paths in canonical commands", async () => {
  await withRepositoryCopy(async (root) => {
    const commandPath = path.join(
      root,
      "plugins",
      "application",
      "commands",
      "review-backend.md",
    );
    const content = await readFile(commandPath, "utf8");
    await writeFile(commandPath, `${content}\nWrite .claude/commands/review.md\n`);

    await assert.rejects(validateRepository(root), /provider-specific path/);
  });
});

test("rejects unknown dependencies and required dependency cycles", async () => {
  await withRepositoryCopy(async (root) => {
    const backendPath = path.join(
      root,
      "plugins",
      "application",
      "plugin.yaml",
    );
    const backend = JSON.parse(await readFile(backendPath, "utf8"));
    backend.dependencies.required.push("missing-plugin");
    await writeFile(backendPath, `${JSON.stringify(backend, null, 2)}\n`);

    await assert.rejects(validateRepository(root), /unknown dependency missing-plugin/);
  });

  await withRepositoryCopy(async (root) => {
    const architecturePath = path.join(
      root,
      "plugins",
      "architecture",
      "plugin.yaml",
    );
    const architecture = JSON.parse(await readFile(architecturePath, "utf8"));
    architecture.dependencies.required.push("application");
    await writeFile(architecturePath, `${JSON.stringify(architecture, null, 2)}\n`);

    await assert.rejects(validateRepository(root), /dependency cycle/);
  });
});
