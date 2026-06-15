import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  findCommandPath,
  loadCanonicalCommand,
  loadPlatform,
  loadPlugins,
  validateRepository,
} from "../src/contracts.mjs";
import { repoRoot } from "./helpers.mjs";

async function withRepositoryCopy(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-contracts-"));
  try {
    for (const entry of [
      "ai-engineering.config.yaml",
      "packs",
      "adapters",
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

test("loads seven canonical capability pack contracts", async () => {
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
    assert.equal(plugin.kind, "CapabilityPack");
    assert.equal(plugin.metadata.id, pluginId);
    assert.ok(plugin.assets.skills.length > 0);
    assert.ok(plugin.assets.commands.length > 0);

    const command = await loadCanonicalCommand(
      await findCommandPath(repoRoot, plugin.assets.commands[0]),
    );
    assert.equal(command.id, plugin.assets.commands[0]);
    assert.ok(
      command.requiredSkills.every((skill) => plugin.assets.skills.includes(skill)),
    );
  }
});

test("rejects unknown skills and missing commands", async () => {
  await withRepositoryCopy(async (root) => {
    const manifestPath = path.join(
      root,
      "packs",
      "application",
      "pack.yaml",
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
      "packs",
      "application",
      "skills",
      "unmapped-skill",
    );
    await mkdir(skillRoot, { recursive: true });
    await writeFile(
      path.join(skillRoot, "SKILL.md"),
      "---\nname: unmapped-skill\ndescription: Test skill.\n---\n\n# Test\n",
    );

    await assert.rejects(validateRepository(root), /skill registry for pack application/);
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
    path.join(repoRoot, "packs/application/skills/java-analyze/SKILL.md"),
    "utf8",
  );
  const react = await readFile(
    path.join(repoRoot, "packs/application/skills/react-code-generate/SKILL.md"),
    "utf8",
  );

  assert.match(java, /subagents\/java-spring-implement[.]md/);
  assert.match(react, /subagents\/react-frontend-implement[.]md/);
});

test("application owns one Python backend skill with FastAPI and Django routing", async () => {
  const skill = await readFile(
    path.join(
      repoRoot,
      "packs/application/skills/python-backend-engineer/SKILL.md",
    ),
    "utf8",
  );

  assert.match(skill, /fastapi-backend-implement[.]md/);
  assert.match(skill, /django-drf-backend-implement[.]md/);
  assert.match(skill, /python-backend-verification[.]md/);
});

test("rejects provider-specific paths in canonical commands", async () => {
  await withRepositoryCopy(async (root) => {
    const commandPath = path.join(
      root,
      "packs",
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
      "packs",
      "application",
      "pack.yaml",
    );
    const backend = JSON.parse(await readFile(backendPath, "utf8"));
    backend.dependencies.required.push("missing-plugin");
    await writeFile(backendPath, `${JSON.stringify(backend, null, 2)}\n`);

    await assert.rejects(validateRepository(root), /unknown dependency missing-plugin/);
  });

  await withRepositoryCopy(async (root) => {
    const architecturePath = path.join(
      root,
      "packs",
      "architecture",
      "pack.yaml",
    );
    const architecture = JSON.parse(await readFile(architecturePath, "utf8"));
    architecture.dependencies.required.push("application");
    await writeFile(architecturePath, `${JSON.stringify(architecture, null, 2)}\n`);

    await assert.rejects(validateRepository(root), /dependency cycle/);
  });
});
