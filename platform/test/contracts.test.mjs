import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadCanonicalCommand,
  loadPlatform,
  loadPlugins,
  validateRepository,
} from "../src/contracts.mjs";
import { repoRoot } from "./helpers.mjs";

async function withRepositoryCopy(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-contracts-"));
  try {
    for (const entry of ["aidk.config.yaml", "packages", "skills", ".codex"]) {
      await cp(path.join(repoRoot, entry), path.join(root, entry), {
        recursive: true,
      });
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("loads six canonical plugin contracts", async () => {
  const platform = await loadPlatform(repoRoot);
  const plugins = await loadPlugins(repoRoot);
  const validation = await validateRepository(repoRoot);

  assert.equal(platform.product.name, "ai-engineering-platform");
  assert.equal(plugins.size, 6);
  assert.equal(validation.pluginCount, 6);
  assert.equal(validation.providerCount, 3);

  for (const [pluginId, plugin] of plugins) {
    assert.equal(plugin.apiVersion, "ai-engineering.dev/v1alpha1");
    assert.equal(plugin.kind, "Plugin");
    assert.ok(plugin.assets.skills.length > 0);
    assert.ok(plugin.assets.commands.length > 0);

    const command = await loadCanonicalCommand(
      path.join(repoRoot, "packages", pluginId, "commands", `${plugin.assets.commands[0]}.md`),
    );
    assert.equal(command.id, plugin.assets.commands[0]);
    assert.ok(
      command.requiredSkills.every((skill) => plugin.assets.skills.includes(skill)),
    );
  }
});

test("rejects unknown skills and missing commands", async () => {
  await withRepositoryCopy(async (root) => {
    const manifestPath = path.join(root, "packages", "backend", "package.yaml");
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

test("rejects provider-specific paths in canonical commands", async () => {
  await withRepositoryCopy(async (root) => {
    const commandPath = path.join(
      root,
      "packages",
      "backend",
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
    const backendPath = path.join(root, "packages", "backend", "package.yaml");
    const backend = JSON.parse(await readFile(backendPath, "utf8"));
    backend.dependencies.required.push("missing-plugin");
    await writeFile(backendPath, `${JSON.stringify(backend, null, 2)}\n`);

    await assert.rejects(validateRepository(root), /unknown dependency missing-plugin/);
  });

  await withRepositoryCopy(async (root) => {
    const architecturePath = path.join(
      root,
      "packages",
      "architecture",
      "package.yaml",
    );
    const architecture = JSON.parse(await readFile(architecturePath, "utf8"));
    architecture.dependencies.required.push("backend");
    await writeFile(architecturePath, `${JSON.stringify(architecture, null, 2)}\n`);

    await assert.rejects(validateRepository(root), /dependency cycle/);
  });
});
