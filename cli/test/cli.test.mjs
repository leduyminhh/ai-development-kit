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
  assert.match(result.stdout, /ai-engineering plugin install/);
  assert.match(result.stdout, /ai-engineering check/);
  assert.match(result.stdout, /ai-engineering update --all/);
  assert.match(result.stdout, /ai-engineering migrate --dry-run/);
  assert.match(result.stdout, /ai-engineering generate-adapter/);
  assert.equal(result.stderr, "");
});

test("supports direct pack install with target adapter", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-direct-install-"));
  try {
    const result = await runCli(
      ["install", "quality", "--target", "cursor", "--json"],
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

test("supports direct list and upgrade commands", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-list-"));
  try {
    const list = await runCli(["list", "--json"], { cwd: target });
    assert.equal(list.exitCode, 0);
    assert.deepEqual(JSON.parse(list.stdout).plugins, []);

    const upgrade = await runCli(["upgrade", "--json"], { cwd: target });
    assert.equal(upgrade.exitCode, 0);
    assert.equal(JSON.parse(upgrade.stdout).changed, false);
  } finally {
    await rm(target, { recursive: true, force: true });
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
