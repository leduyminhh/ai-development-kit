import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli, repoRoot } from "./helpers.mjs";

test("displays help text with available commands", async () => {
  const result = await runCli(["--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /aie install --all --target codex,claude,cursor,antigravity/);
  assert.match(result.stdout, /aie install <plugin\.\.\.> --target <provider\[,provider\.\.\.\]>/);
  assert.match(result.stdout, /aie install --all --target <provider\[,provider\.\.\.\]>/);
});

test("prints scope-aware installed output", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-installed-scope-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-installed-home-"));
  try {
    const emptyProject = await runCli(["installed"], { cwd: target });
    assert.equal(emptyProject.exitCode, 0);
    assert.match(emptyProject.stdout, /No plugins installed in project scope/);
    assert.match(emptyProject.stdout, /Use `aie installed -g`/);
  } finally {
    await rm(target, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  }
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

test("non-TTY install without yes still requires interactive terminal", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-install-nontty-"));
  try {
    const result = await runCli(["install"], { cwd: target });
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /Install requires confirmation in non-interactive mode/);
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
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
