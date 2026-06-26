import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "./helpers.mjs";

const APPLY_ARGS = ["install", "platform", "--target", "codex", "--platform", "--yes"];

async function readOwnership(target) {
  return JSON.parse(
    await readFile(path.join(target, ".ai-engineering", "ownership.json"), "utf8"),
  );
}

function findManagedProviderFile(ownership) {
  return Object.keys(ownership.files).find(
    (file) => !file.startsWith(".ai-engineering/") && file.startsWith("."),
  );
}

async function assertPlatformStateCleared(target) {
  await assert.rejects(
    readFile(path.join(target, ".ai-engineering", "ownership.json"), "utf8"),
  );
  await assert.rejects(
    readFile(path.join(target, ".ai-engineering", "installed-plugins.yaml"), "utf8"),
  );
  await assert.rejects(
    readFile(path.join(target, ".ai-engineering", "lockfile.yaml"), "utf8"),
  );
}

test("install --platform --yes writes provider files and ownership state", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6b-apply-"));
  try {
    const { exitCode } = await runCli(APPLY_ARGS, { cwd: target });
    assert.equal(exitCode, 0);
    const ownership = await readOwnership(target);
    assert.ok(Object.keys(ownership.files).length > 0);
    assert.ok((await readdir(target)).length > 0);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("install --platform --yes is idempotent on a second run", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6b-idem-"));
  try {
    const first = await runCli(APPLY_ARGS, { cwd: target });
    assert.equal(first.exitCode, 0);
    const second = await runCli(APPLY_ARGS, { cwd: target });
    assert.equal(second.exitCode, 0);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("remove platform --platform --yes removes managed provider files and clears state", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6c-uninstall-"));
  try {
    const install = await runCli(APPLY_ARGS, { cwd: target });
    assert.equal(install.exitCode, 0);

    const ownership = await readOwnership(target);
    const managedProviderFile = findManagedProviderFile(ownership);
    assert.ok(managedProviderFile, "expected a managed non-state provider file");
    await stat(path.join(target, managedProviderFile));

    const uninstall = await runCli(["remove", "platform", "--platform", "--yes"], { cwd: target });
    assert.equal(uninstall.exitCode, 0);
    await assert.rejects(stat(path.join(target, managedProviderFile)));
    await assertPlatformStateCleared(target);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("uninstall platform --platform --yes removes managed provider files and clears state", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6c-uninstall-alias-"));
  try {
    const install = await runCli(APPLY_ARGS, { cwd: target });
    assert.equal(install.exitCode, 0);

    const ownership = await readOwnership(target);
    const managedProviderFile = findManagedProviderFile(ownership);
    assert.ok(managedProviderFile, "expected a managed non-state provider file");
    await stat(path.join(target, managedProviderFile));

    const uninstall = await runCli(["uninstall", "platform", "--platform", "--yes"], { cwd: target });
    assert.equal(uninstall.exitCode, 0);
    await assert.rejects(stat(path.join(target, managedProviderFile)));
    await assertPlatformStateCleared(target);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("install --platform without confirmation does not apply", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6b-noconfirm-"));
  try {
    // Non-TTY spawn without --yes: the existing branch refuses to apply.
    const { exitCode } = await runCli(
      ["install", "platform", "--target", "codex", "--platform"],
      { cwd: target },
    );
    assert.notEqual(exitCode, 0);
    await assert.rejects(
      readFile(path.join(target, ".ai-engineering", "ownership.json"), "utf8"),
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("install --platform --yes aborts on an unmanaged-file conflict without clobbering it", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6b-conflict-"));
  try {
    // Learn a managed file destination from the dry-run plan.
    const dry = await runCli(
      ["install", "platform", "--target", "codex", "--platform", "--dry-run", "--json"],
      { cwd: target },
    );
    assert.equal(dry.exitCode, 0);
    const plan = JSON.parse(dry.stdout);
    const fileEntry = plan.managedFiles.find((entry) => /\.[a-z]+$/.test(entry.path));
    assert.ok(fileEntry, "expected at least one managed file with an extension");
    const conflictPath = fileEntry.path;

    // Pre-create an unmanaged file at that destination.
    const full = path.join(target, conflictPath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, "USER CONTENT\n", "utf8");

    const { exitCode } = await runCli(APPLY_ARGS, { cwd: target });
    assert.notEqual(exitCode, 0);
    // The unmanaged file is preserved (conflict aborts before any write).
    assert.equal(await readFile(full, "utf8"), "USER CONTENT\n");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
