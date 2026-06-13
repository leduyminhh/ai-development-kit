import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { applyTransaction, planTransaction } from "../src/transaction.mjs";

test("writes managed files and state only after apply succeeds", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-transaction-"));
  try {
    const plan = await planTransaction({
      target,
      desiredFiles: new Map([["skills/java-analyze/SKILL.md", "skill\n"]]),
      lock: {
        schemaVersion: 1,
        platformVersion: "1.0.0",
        providers: ["codex"],
        rootPlugins: ["backend"],
        plugins: [{ id: "backend", version: "1.0.0" }],
      },
      ownership: {
        schemaVersion: 1,
        files: {
          "skills/java-analyze/SKILL.md": {
            owners: ["backend"],
            source: "java-analyze",
            checksum: "",
            shared: true,
          },
        },
      },
    });
    await applyTransaction(plan);
    assert.equal(
      await readFile(path.join(target, "skills/java-analyze/SKILL.md"), "utf8"),
      "skill\n",
    );
    assert.equal(
      JSON.parse(await readFile(path.join(target, ".ai-engineering/install-state.json"), "utf8"))
        .status,
      "complete",
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("stops on unmanaged conflicts unless force is explicit", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-conflict-"));
  try {
    await writeFile(path.join(target, "owned.txt"), "user\n");
    await assert.rejects(
      planTransaction({
        target,
        desiredFiles: new Map([["owned.txt", "managed\n"]]),
        lock: {},
        ownership: { schemaVersion: 1, files: {} },
      }),
      /conflict/,
    );
    const forced = await planTransaction({
      target,
      desiredFiles: new Map([["owned.txt", "managed\n"]]),
      lock: {},
      ownership: { schemaVersion: 1, files: {} },
      force: true,
    });
    await applyTransaction(forced);
    assert.equal(await readFile(path.join(target, "owned.txt"), "utf8"), "managed\n");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("rolls back files when apply validation fails", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-rollback-"));
  try {
    await writeFile(path.join(target, "managed.txt"), "before\n");
    const plan = await planTransaction({
      target,
      desiredFiles: new Map([["managed.txt", "after\n"]]),
      lock: {},
      ownership: {
        schemaVersion: 1,
        files: {
          "managed.txt": {
            owners: ["backend"],
            source: "test",
            checksum: "",
            shared: false,
          },
        },
      },
      force: true,
      validateApplied: async () => {
        throw new Error("injected failure");
      },
    });
    await assert.rejects(applyTransaction(plan), /injected failure/);
    assert.equal(await readFile(path.join(target, "managed.txt"), "utf8"), "before\n");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("merge-managed config accepts user content and creates a backup", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-merge-config-"));
  try {
    const configPath = path.join(target, ".codex", "config.toml");
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, 'model = "gpt-5"\n');

    const plan = await planTransaction({
      target,
      desiredFiles: new Map([
        [
          ".codex/config.toml",
          'model = "gpt-5"\n\n[mcp_servers.platform]\ncommand = "node"\n',
        ],
      ]),
      lock: {
        plugins: [{ id: "platform", version: "1.0.0" }],
        providers: ["codex"],
      },
      ownership: {
        schemaVersion: 1,
        files: {
          ".codex/config.toml": {
            owners: ["platform"],
            source: "codex-mcp-config",
            checksum: "",
            shared: true,
            mergeStrategy: "mcp-config",
          },
        },
      },
    });
    await applyTransaction(plan);

    assert.match(await readFile(configPath, "utf8"), /mcp_servers\.platform/);
    const backupRoot = path.join(
      target,
      ".ai-engineering",
      "backups",
      "provider-config",
      plan.transactionId,
      ".codex",
    );
    assert.deepEqual(await readdir(backupRoot), ["config.toml"]);
    assert.equal(
      await readFile(path.join(backupRoot, "config.toml"), "utf8"),
      'model = "gpt-5"\n',
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
