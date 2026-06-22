import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "./helpers.mjs";

test("prints the platform version", async () => {
  const result = await runCli(["--version"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^1\.0\.0\s*$/);
  assert.equal(result.stderr, "");
});

test("prints lifecycle commands in help", async () => {
  const result = await runCli(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Alias:\s+aie/);
  assert.match(result.stdout, /Quick start:/);
  assert.match(result.stdout, /aie init/);
  assert.match(result.stdout, /aie install --all --target codex,claude,cursor,antigravity/);
  assert.match(result.stdout, /Plugin lifecycle:/);
  assert.match(result.stdout, /aie install <plugin\.\.\.> --target <provider\[,provider\.\.\.\]>/);
  assert.match(result.stdout, /aie install --all --target <provider\[,provider\.\.\.\]>/);
  assert.match(result.stdout, /aie update <plugin\.\.\.> \[--dry-run\]/);
  assert.match(result.stdout, /aie remove --all/);
  assert.match(result.stdout, /Status and discovery:/);
  assert.match(result.stdout, /aie available/);
  assert.match(result.stdout, /aie installed \[--scope <project\|global>\|-g\]/);
  assert.match(result.stdout, /Maintainer commands:/);
  assert.match(result.stdout, /aie validate/);
  assert.match(result.stdout, /Legacy aliases: plugin, uninstall, upgrade/);
  assert.doesNotMatch(result.stdout, /Compatibility aliases:/);
  assert.doesNotMatch(result.stdout, /Native install paths:/);
  assert.doesNotMatch(result.stdout, /Codex project:/);
  assert.doesNotMatch(result.stdout, /Claude global:/);
  assert.match(result.stdout, /--target <providers>\s+codex, claude, cursor, antigravity/);
  assert.match(result.stdout, /--provider <providers>\s+Alias for --target/);
  assert.match(result.stdout, /--json\s+Print machine-readable output/);
  assert.match(result.stdout, /Default scope: project/);
  assert.match(result.stdout, /-g, --global\s+Install to global AI IDE settings/);
  assert.equal(result.stderr, "");
});

test("supports direct plugin install with target adapter", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-direct-install-"));
  try {
    const result = await runCli(
      ["install", "quality", "--target", "cursor", "--yes", "--json"],
      { cwd: target },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.match(
      await readFile(path.join(target, ".cursor", "rules", "provider.json"), "utf8"),
      /"provider": "cursor"/,
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("non-TTY install requires --yes", async () => {
  const result = await runCli([
    "install",
    "application",
    "--target",
    "codex",
  ]);
  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /Pass --yes/);
});

test("--yes requires an explicit provider", async () => {
  const result = await runCli([
    "install",
    "application",
    "--yes",
  ]);
  assert.equal(result.exitCode, 2);
  assert.match(
    result.stderr,
    /Missing install choices in non-interactive mode: providers/,
  );
});

test("respects target adapter when installing all plugins", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-all-target-"));
  try {
    const result = await runCli(
      ["install", "--all", "--target", "codex", "--yes", "--json"],
      { cwd: target },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).status, "pass");
    assert.match(
      await readFile(path.join(target, ".codex", "agents", "openai.yaml"), "utf8"),
      /"provider": "codex"/,
    );
    await assert.rejects(
      readFile(path.join(target, ".cursor", "rules", "provider.json"), "utf8"),
      { code: "ENOENT" },
    );
    await assert.rejects(
      readFile(path.join(target, ".claude-plugin", "plugin.json"), "utf8"),
      { code: "ENOENT" },
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("rejects unsupported install scope", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-invalid-scope-"));
  try {
    const result = await runCli(
      ["install", "platform", "--target", "codex", "--scope", "team"],
      { cwd: target },
    );

    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /scope must be project or global/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("plans legacy cleanup without changing files in dry-run mode", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-migrate-"));
  try {
    await mkdir(path.join(target, "skills"));
    const result = await runCli(["migrate", "--dry-run", "--json"], { cwd: target });
    const output = JSON.parse(result.stdout);
    assert.equal(result.exitCode, 0);
    assert.deepEqual(output.legacyPaths, ["skills"]);
    assert.equal(output.changed, false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("supports direct installed and update commands", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-list-"));
  try {
    const available = await runCli(["available", "--json"], { cwd: target });
    assert.equal(available.exitCode, 0);
    assert.equal(JSON.parse(available.stdout).plugins.available.length, 7);

    const list = await runCli(["installed", "--json"], { cwd: target });
    assert.equal(list.exitCode, 0);
    assert.deepEqual(JSON.parse(list.stdout).plugins, []);

    const upgrade = await runCli(["update", "--all", "--json"], { cwd: target });
    assert.equal(upgrade.exitCode, 0);
    assert.equal(JSON.parse(upgrade.stdout).changed, false);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("prints scope-aware installed output", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-installed-scope-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-installed-home-"));
  try {
    const emptyProject = await runCli(["installed"], { cwd: target });
    assert.equal(emptyProject.exitCode, 0);
    assert.match(emptyProject.stdout, /No plugins installed in project scope/);
    assert.match(emptyProject.stdout, /Use `aie installed -g`/);

    const installGlobal = await runCli(
      ["install", "--all", "--target", "codex", "-g", "--yes"],
      { cwd: target, env: { USERPROFILE: home } },
    );
    assert.equal(installGlobal.exitCode, 0);
    assert.match(installGlobal.stdout, /Installed .* to global scope/);

    const globalList = await runCli(
      ["installed", "-g"],
      { cwd: target, env: { USERPROFILE: home } },
    );
    assert.equal(globalList.exitCode, 0);
    assert.match(globalList.stdout, /architecture@1\.0\.0/);
  } finally {
    await rm(target, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
});

test("backs up legacy paths before explicit migration cleanup", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-clean-"));
  try {
    await mkdir(path.join(target, "skills"));
    await writeFile(path.join(target, "skills", "legacy.txt"), "legacy\n");

    const result = await runCli(
      ["migrate", "--delete-legacy", "--json"],
      { cwd: target },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(result.stdout).changed, true);
    assert.equal(
      await readFile(
        path.join(
          target,
          ".ai-engineering",
          "backups",
          "migration",
          "skills",
          "legacy.txt",
        ),
        "utf8",
      ),
      "legacy\n",
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
