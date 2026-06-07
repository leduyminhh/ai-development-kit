import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { applyTransaction, planTransaction } from "../src/transaction.mjs";

test("writes managed files and state only after apply succeeds", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-transaction-"));
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
      JSON.parse(await readFile(path.join(target, ".aiep/install-state.json"), "utf8"))
        .status,
      "complete",
    );
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("stops on unmanaged conflicts unless force is explicit", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-conflict-"));
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
  const target = await mkdtemp(path.join(os.tmpdir(), "aiep-rollback-"));
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
