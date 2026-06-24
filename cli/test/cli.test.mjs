import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "./helpers.mjs";

test("displays wizard-first install help text", async () => {
  const result = await runCli(["--help"]);
  const shortResult = await runCli(["-h"]);
  assert.equal(result.exitCode, 0);
  assert.equal(shortResult.exitCode, 0);
  assert.equal(shortResult.stdout, result.stdout);
  assert.match(result.stdout, /aie install \[plugin\.\.\.\] \[options\]/);
  assert.match(result.stdout, /aie -h \| --help/);
  assert.doesNotMatch(result.stdout, /Interactive CLI wizards/);
  assert.match(result.stdout, /Install options:/);
  assert.match(result.stdout, /--target <providers>\s+antigravity, codex, claude, cursor/);
  assert.doesNotMatch(result.stdout, /examples:/i);
  assert.doesNotMatch(result.stdout, /aie install application --target codex --yes/);
  assert.doesNotMatch(result.stdout, /aie install --all --target antigravity --yes/);
  assert.doesNotMatch(result.stdout, /Step 1: Install/);
  assert.match(result.stdout, /aie check \[--scope <project\|global>\|-g\]/);
  assert.match(result.stdout, /aie remove|uninstall/);
  assert.match(result.stdout, /antigravity/);
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

test("doctor validates the source repository when run from repo root", async () => {
  const result = await runCli(["doctor"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Doctor passed for source repository/);
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
