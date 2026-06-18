import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  workflowInit,
  workflowList,
  workflowValidate,
  workflowBuild,
  workflowRun,
  workflowStatus,
  workflowHistory,
  workflowLogs,
  workflowClean,
  workflowInstall,
} from "../src/workflow.mjs";
import { installPlugins } from "../src/lifecycle.mjs";
import { repoRoot } from "./helpers.mjs";

const sampleWorkflow = `id: test-workflow
description: "Test workflow for unit tests"
version: 1.0.0

steps:
  - id: step-one
    uses: application/python-backend-engineer
    input:
      task: "write hello world"

  - id: step-two
    uses: quality/test-qa-review
    depends: [step-one]
    input:
      source: "\$steps.step-one.output"
`;

const invalidWorkflow = `id: broken-workflow
version: 1.0.0
`;

const workflowWithCycle = `id: cycle-workflow
description: "Workflow with cycle"
version: 1.0.0
steps:
  - id: step-a
    uses: application/python-backend-engineer
    depends: [step-c]
  - id: step-b
    uses: quality/test-qa-review
    depends: [step-a]
  - id: step-c
    uses: security/security-code-review
    depends: [step-b]
`;

const workflowWithFallback = `id: fallback-workflow
description: "Workflow with fallback"
version: 1.0.0
steps:
  - id: primary
    uses: application/python-backend-engineer
    onError:
      policy: fallback
      fallbackStep: secondary
  - id: secondary
    uses: quality/test-qa-review
    depends: [primary]
`;

test("workflowInit creates directories", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-init-"));
  try {
    const result = await workflowInit({ target });
    assert.equal(result.status, "pass");

    const defsExists = await readFile(path.join(target, ".ai-engineering", "workflows", "definitions"), "utf8")
      .then(() => true).catch(() => false);
    const runsExists = await readFile(path.join(target, ".ai-engineering", "workflows", "runs"), "utf8")
      .then(() => true).catch(() => false);
    
    assert.ok(result.definitions.includes("definitions"));
    assert.ok(result.runs.includes("runs"));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowList returns empty when no definitions", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-list-"));
  try {
    await workflowInit({ target });
    const result = await workflowList({ target });
    assert.equal(result.status, "pass");
    assert.deepEqual(result.workflows, []);
    assert.equal(result.projectCount, 0);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowList returns project workflows", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-list-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"),
      sampleWorkflow, "utf8"
    );
    const result = await workflowList({ target });
    assert.equal(result.status, "pass");
    assert.equal(result.projectCount, 1);
    assert.equal(result.workflows[0].id, "test");
    assert.equal(result.workflows[0].source, "project");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowValidate passes valid workflow", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-validate-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"),
      sampleWorkflow, "utf8"
    );
    const result = await workflowValidate({ target });
    assert.equal(result.status, "pass");
    assert.deepEqual(result.errors, []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowValidate detects missing fields", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-validate-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "broken.yaml"),
      invalidWorkflow, "utf8"
    );
    const result = await workflowValidate({ target });
    assert.equal(result.status, "fail");
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes("description")));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowValidate detects dependency cycles", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-cycle-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "cycle.yaml"),
      workflowWithCycle, "utf8"
    );
    const result = await workflowValidate({ target });
    assert.equal(result.status, "fail");
    assert.ok(result.errors.some(e => e.includes("cycle")));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowBuild generates instructions", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-build-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"),
      sampleWorkflow, "utf8"
    );
    const result = await workflowBuild({ target, workflowId: "test" });
    assert.equal(result.status, "pass");
    assert.ok(result.instructions);
    assert.ok(result.instructions.includes("Workflow: test-workflow"));
    assert.ok(result.instructions.includes("step-one"));
    assert.ok(result.instructions.includes("step-two"));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowBuild fails for unknown workflow", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-build-"));
  try {
    await workflowInit({ target });
    await assert.rejects(() => workflowBuild({ target, workflowId: "nonexistent" }));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowRun creates run state", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-run-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"),
      sampleWorkflow, "utf8"
    );
    const result = await workflowRun({ target, workflowId: "test" });
    assert.equal(result.status, "pass");
    assert.ok(result.runId);
    assert.ok(result.instructions);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowStatus shows run status", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-status-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"),
      sampleWorkflow, "utf8"
    );
    const run = await workflowRun({ target, workflowId: "test" });
    const status = await workflowStatus({ target, workflowId: "test", runId: run.runId });
    assert.equal(status.status, "pass");
    assert.equal(status.state.status, "running");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowHistory lists runs", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-history-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"),
      sampleWorkflow, "utf8"
    );
    await workflowRun({ target, workflowId: "test" });
    const history = await workflowHistory({ target, workflowId: "test" });
    assert.equal(history.status, "pass");
    assert.equal(history.runs.length, 1);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowLogs returns events", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-logs-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"),
      sampleWorkflow, "utf8"
    );
    const run = await workflowRun({ target, workflowId: "test" });
    const logs = await workflowLogs({ target, workflowId: "test", runId: run.runId });
    assert.equal(logs.status, "pass");
    assert.equal(logs.events.length, 1);
    assert.equal(logs.events[0].type, "start");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowClean removes runs keeps definitions", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-clean-"));
  try {
    await workflowInit({ target });
    await writeFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"),
      sampleWorkflow, "utf8"
    );
    await workflowRun({ target, workflowId: "test" });
    const clean = await workflowClean({ target });
    assert.equal(clean.status, "pass");

    // Definitions should still exist
    const defsExists = await readFile(
      path.join(target, ".ai-engineering", "workflows", "definitions", "test.yaml"), "utf8"
    ).then(() => true).catch(() => false);
    assert.ok(defsExists);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowValidate validates core example workflows", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-core-"));
  try {
    await workflowInit({ target });
    const result = await workflowValidate({ target, core: repoRoot });
    assert.equal(result.status, "pass", `Validation errors: ${JSON.stringify(result.errors)}`);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowInstall copies workflow definitions from plugin", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-install-"));
  try {
    await workflowInit({ target });
    const result = await workflowInstall({ root: repoRoot, target, pluginId: "application" });
    assert.equal(result.status, "pass");
    assert.ok(result.installed.includes("fullstack-feature"));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("workflowList shows global workflows from core", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-global-"));
  try {
    await workflowInit({ target });
    const result = await workflowList({ target, core: repoRoot });
    // Should show at least 3 core example workflows
    assert.ok(result.globalCount >= 1);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("full lifecycle: init, install, list, run, status, history, clean", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "wf-lifecycle-"));
  try {
    // Init
    await workflowInit({ target });
    // Install a workflow from application plugin
    await workflowInstall({ root: repoRoot, target, pluginId: "application" });
    // List should show it
    const listResult = await workflowList({ target });
    assert.ok(listResult.projectCount >= 1);
    const wf = listResult.workflows[0];
    // Validate
    const validateResult = await workflowValidate({ target });
    assert.equal(validateResult.status, "pass");
    // Build
    const buildResult = await workflowBuild({ target, workflowId: wf.id });
    assert.equal(buildResult.status, "pass");
    // Run
    const runResult = await workflowRun({ target, workflowId: wf.id });
    assert.equal(runResult.status, "pass");
    // Status
    const statusResult = await workflowStatus({ target, workflowId: wf.id, runId: runResult.runId });
    assert.equal(statusResult.status, "pass");
    // History
    const historyResult = await workflowHistory({ target, workflowId: wf.id });
    assert.equal(historyResult.runs.length, 1);
    // Logs
    const logsResult = await workflowLogs({ target, workflowId: wf.id, runId: runResult.runId });
    assert.equal(logsResult.events.length, 1);
    // Clean
    const cleanResult = await workflowClean({ target });
    assert.equal(cleanResult.status, "pass");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
