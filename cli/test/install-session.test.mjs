import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function withSession(prefix, callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("writes and reads running install session state", async () => {
  await withSession("aie-install-session-", async (root) => {
    const { writeInstallSession, readInstallSession } = await import("../src/install-session.mjs");

    const session = await writeInstallSession({
      target: root,
      currentStep: "plugins",
      draft: { rootPlugins: ["platform"], all: false, providers: ["codex"], optionalPlugins: [], scope: "project", force: false },
      detectedProviders: ["codex"],
      detectedPlugins: [{ pluginId: "platform", confidence: 0.9, reasons: ["baseline"] }],
      planHash: "hash-one",
    });

    const read = await readInstallSession({ target: root });

    assert.equal(read.status, "running");
    assert.equal(read.sessionId, session.sessionId);
    assert.equal(read.currentStep, "plugins");
    assert.deepEqual(read.draft.rootPlugins, ["platform"]);
  });
});

test("appends install session events and completes session", async () => {
  await withSession("aie-install-session-events-", async (root) => {
    const { writeInstallSession, completeInstallSession, readInstallSession } = await import("../src/install-session.mjs");

    await writeInstallSession({
      target: root,
      currentStep: "confirm",
      draft: { rootPlugins: ["quality"], all: false, providers: ["cursor"], optionalPlugins: [], scope: "project", force: false },
      detectedProviders: ["cursor"],
      detectedPlugins: [],
      planHash: "hash-two",
    });

    const completed = await completeInstallSession({ target: root });
    const read = await readInstallSession({ target: root });
    const events = await readFile(path.join(root, ".ai-engineering", "install", "events.jsonl"), "utf8");

    assert.equal(completed.status, "completed");
    assert.equal(read.status, "completed");
    assert.match(events, /session-written/);
    assert.match(events, /session-completed/);
  });
});
