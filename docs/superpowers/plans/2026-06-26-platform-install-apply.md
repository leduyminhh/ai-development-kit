# Platform Install Apply (Milestone 6b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 6b of the Safe Greenfield refactor: enable `install --platform` to actually apply (write provider files and state) through the existing transaction layer and the full interactive wizard, by injecting a flag-selected projector into the existing install branch.

**Architecture:** Select the projector by flag in the existing `install` branch (`const project = args.includes("--platform") ? platformProjector : undefined`) and thread it into both `prepareInstallation` calls (the wizard's `preparePlan` closure and the final apply). Narrow the Milestone 6a dry-run branch to require `--dry-run`. Everything else — wizard, `--yes` path, session, `applyPreparedInstallation` (atomic write + backup + rollback), and the summary — is reused unchanged. When `--platform` is absent, `project` is `undefined`, the `project = projectProvider` default applies, and default behavior is byte-identical.

**Tech Stack:** Node.js 20+ ESM (`.mjs`), built-in `node:test`, `node:assert/strict`, `node:fs/promises`, `node:os`, the existing TypeScript build (`npm run build:cli`), and the existing `runCli` test helper.

## Global Constraints

- Implements only Milestone 6b from `docs/superpowers/specs/2026-06-26-platform-safe-greenfield-refactor-design.md` ("Milestone 6b Platform Install Apply — Resolved Design Decisions").
- **Reuse, do not duplicate.** No new apply path. Inject the projector into the existing install branch's two `prepareInstallation` calls. Do not modify `runInstallWizard`, `applyPreparedInstallation`, `planTransaction`, `applyTransaction`, the install session, or `initializeProject`.
- **Default behavior unchanged.** When `--platform` is absent, `project` is `undefined` so `prepareInstallation`/`buildDesiredState` use the `projectProvider` default. Legacy install (interactive and `--yes`) must stay byte-identical.
- **No weakened safety gate.** Apply still requires `--yes` (non-interactive) or interactive wizard confirmation, exactly as legacy. The conflict detection in `planTransaction` (unmanaged file exists / managed drift) and the rollback in `applyTransaction` are reused as-is.
- Touch only the `install` command. Do not route `upgrade`, `uninstall`, `migrate`, or `init`.
- New `.mjs` files: plain UTF-8 (no BOM).
- Do not commit changes unless the user explicitly asks for a commit.
- Stop after the checkpoint report (Task 2) and wait for explicit user approval before Milestone 6c.

---

## Files

- Modify: `cli/src/cli.mjs` — narrow the Milestone 6a dry-run branch; add the flag-selected `project` in the install branch and thread it into both `prepareInstallation` calls.
- Create: `cli/test/platform-install-apply.test.mjs` — apply / idempotency / conflict smoke tests via `runCli` (require a build first).

Existing, unchanged modules consumed (all already imported in `cli.mjs`): `parseInstallRequest`, `finalizeNonInteractiveDraft`, `resolveInstallContext`, `prepareInstallation`, `buildInstallPlan`, `renderInstallPlan`, `applyPreparedInstallation`, `runInstallWizard`, `initializeProject`, `platformProjector`. The `runCli` helper is in `cli/test/helpers.mjs`.

---

### Task 1: Wire platform apply through the existing install branch

**Files:**
- Modify: `cli/src/cli.mjs`
- Test: `cli/test/platform-install-apply.test.mjs`

**Interfaces:**
- Consumes: the already-imported `platformProjector` and the existing install flow.
- Produces: `install --platform` (without `--dry-run`) applies through the new adapters; `install --platform --dry-run` stays the Milestone 6a dry-run.

- [ ] **Step 1: Write the failing test**

Create `cli/test/platform-install-apply.test.mjs` with this content:

```js
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "./helpers.mjs";

const APPLY_ARGS = ["install", "platform", "--target", "codex", "--platform", "--yes"];

test("install --platform --yes writes provider files and ownership state", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6b-apply-"));
  try {
    const { exitCode } = await runCli(APPLY_ARGS, { cwd: target });
    assert.equal(exitCode, 0);
    const ownership = JSON.parse(
      await readFile(path.join(target, ".ai-engineering", "ownership.json"), "utf8"),
    );
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
```

- [ ] **Step 2: Build and run the test to verify it fails**

Run: `npm run build:cli` then `node --test cli/test/platform-install-apply.test.mjs`
Expected: FAIL — `install --platform --yes` (no `--dry-run`) currently hits the Milestone 6a branch, which writes "platform install apply is not available yet" to stderr and returns exit 1, so the apply assertions (exit 0, ownership written) fail.

- [ ] **Step 3: Narrow the Milestone 6a dry-run branch**

In `cli/src/cli.mjs`, find this block:

```js
  if (args[0] === "install" && args.includes("--platform")) {
    const draft = parseInstallRequest(args.slice(1));
    if (!args.includes("--dry-run")) {
      streams.stderr.write(
        "platform install apply is not available yet (Milestone 6b); re-run with --dry-run.\n",
      );
      return 1;
    }
    const intent = finalizeNonInteractiveDraft(draft);
```

Replace it with:

```js
  if (
    args[0] === "install" &&
    args.includes("--platform") &&
    args.includes("--dry-run")
  ) {
    const draft = parseInstallRequest(args.slice(1));
    const intent = finalizeNonInteractiveDraft(draft);
```

(The rest of the dry-run block — `resolveInstallContext`, `prepareInstallation({ ..., project: platformProjector })`, `buildInstallPlan`, the output, and `return 0;` — is unchanged.)

- [ ] **Step 4: Select the projector in the install branch**

Find this line in the main install branch (the block that begins `(args[0] === "plugin" && args[1] === "install") || args[0] === "install" || ...`):

```js
    const draft = parseInstallRequest(args.slice(offset));
    const interactive = Boolean(
```

Replace it with:

```js
    const draft = parseInstallRequest(args.slice(offset));
    const project = args.includes("--platform") ? platformProjector : undefined;
    const interactive = Boolean(
```

- [ ] **Step 5: Thread `project` into the wizard's `preparePlan` prepareInstallation**

Find this block (inside the `preparePlan` closure):

```js
            const candidatePrepared = await prepareInstallation({
              root,
              context: candidateContext,
              rootPlugins: candidate.rootPlugins,
              optionalPlugins: candidate.optionalPlugins,
              all: candidate.all,
              providers: candidate.providers,
              force: candidate.force,
            });
```

Replace it with:

```js
            const candidatePrepared = await prepareInstallation({
              root,
              context: candidateContext,
              rootPlugins: candidate.rootPlugins,
              optionalPlugins: candidate.optionalPlugins,
              all: candidate.all,
              providers: candidate.providers,
              force: candidate.force,
              project,
            });
```

- [ ] **Step 6: Thread `project` into the final apply prepareInstallation**

Find this block (the final prepare before `buildInstallPlan` + `applyPreparedInstallation`):

```js
    const prepared = await prepareInstallation({
      root,
      context,
      rootPlugins: intent.rootPlugins,
      optionalPlugins: intent.optionalPlugins,
      all: intent.all,
      providers: intent.providers,
      force: intent.force,
    });
    const plan = await buildInstallPlan({
```

Replace it with:

```js
    const prepared = await prepareInstallation({
      root,
      context,
      rootPlugins: intent.rootPlugins,
      optionalPlugins: intent.optionalPlugins,
      all: intent.all,
      providers: intent.providers,
      force: intent.force,
      project,
    });
    const plan = await buildInstallPlan({
```

- [ ] **Step 7: Build and run the test to verify it passes**

Run: `npm run build:cli` then `node --test cli/test/platform-install-apply.test.mjs`
Expected: PASS — 4 tests pass.

---

### Task 2: Verification and Checkpoint Report

**Files:**
- None changed. This task runs validation and produces the milestone checkpoint.

- [ ] **Step 1: Build the CLI**

Run: `npm run build:cli`
Expected: PASS — exits 0 with no type errors.

- [ ] **Step 2: Run the platform test suite**

Run: `node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs cli/test/platform-build.test.mjs cli/test/platform-adapters.test.mjs cli/test/platform-cli-routing.test.mjs cli/test/platform-cli-commands.test.mjs cli/test/platform-install-dryrun.test.mjs cli/test/platform-install-dryrun-cli.test.mjs cli/test/platform-install-apply.test.mjs`
Expected: PASS — the prior 46 platform tests plus the 4 new apply tests all pass.

- [ ] **Step 3: Run the repository validation commands and confirm no regression**

Run each and record the exact result:
- `npm test`
- `npm run validate`
- `npm run doctor`

Expected: `npm test` continues to fail only on the same pre-existing deleted-docs baseline. The new apply tests pass and the existing legacy install/lifecycle/wizard tests stay green — this is the proof that the flag-selected projector did not change default behavior. Any failure that references the install branch change or platform projector is a real regression and must be fixed before the checkpoint.

- [ ] **Step 4: Spot-check apply and the preserved dry-run, both against temp dirs**

From two separate empty temporary directories (not the repo root):
- `node <repo>/cli/dist/index.js install platform --target codex --platform --yes` → exits 0; the temp dir now contains `.ai-engineering/ownership.json` and provider files.
- `node <repo>/cli/dist/index.js install platform --target codex --platform --dry-run` → exits 0; prints the plan; the temp dir stays empty.

- [ ] **Step 5: Write the checkpoint report in chat and stop**

Use this report format:

```markdown
**Phase Summary**
- Goal: Milestone 6b platform install apply (first real mutation, wizard wired).
- Completed: flag-selected projector threaded into the existing install branch's two prepareInstallation calls; Milestone 6a dry-run branch narrowed to require --dry-run.
- Changed files: cli/src/cli.mjs, cli/test/platform-install-apply.test.mjs.
- Unchanged: runInstallWizard, applyPreparedInstallation, planTransaction/applyTransaction, install session, initializeProject; default install behavior (project defaults to projectProvider).

**Validation Evidence**
- npm run build:cli: PASS or FAIL with exact error.
- node --test (9 platform test files): PASS or FAIL with counts.
- npm test: report counts; deleted-docs baseline failures accepted and listed; legacy install/lifecycle/wizard tests green.
- npm run validate / npm run doctor: FAIL only on the deleted-docs baseline (accepted), or note any new failure.
- Manual: apply writes provider files + state; dry-run still writes nothing.

**Spec Coverage Report**
| # | Spec Area | Status | Evidence |
| --- | --- | --- | --- |
| 11 | CLI | Implemented | install --platform applies via wizard / --yes; default unchanged. |
| 12 | Migration strategy | In Progress | First mutating slice landed, reusing the proven transaction layer. |
| 13 | Versioning | Verified | Lock/state written by the unchanged lifecycle path. |
| 14 | Compatibility | Verified | Default install byte-identical; apply equals legacy (projector parity). |
| 15 | Security and extensibility | Verified | Conflict detection + rollback reused; unmanaged files preserved. |

**Risk and Rollback**
- Residual risk: apply mutates the target, but only through the existing, tested transaction layer (atomic write + backup + rollback); conflict on unmanaged files aborts before writing.
- Rollback path: delete cli/test/platform-install-apply.test.mjs; revert the install-branch projector selection, the two prepareInstallation project args, and the dry-run branch condition in cli.mjs.
- Affected users: only those who opt in with install --platform.

**Decision Request**
- Option 1: approve Milestone 6b and proceed to Milestone 6c (route upgrade/uninstall/migrate/init) planning.
- Option 2: revise the apply UX or safety gate before continuing.
- Option 3: pause and commit Milestones 1-6b before continuing.
```

- [ ] **Step 6: Stop and wait for approval**

Do not start Milestone 6c until the user explicitly approves the checkpoint.

---

## Self-Review

- **Spec coverage:** Decision 1 (inject projector into existing branch, both prepareInstallation calls) → Task 1 Steps 4-6. Decision 2 (narrow dry-run branch) → Task 1 Step 3. Decision 3 (reuse wizard/transaction, no weakened gate) → Steps 4-6 add only `project`; the no-confirmation test proves the gate holds. Decision 4 (apply/idempotency/conflict tests; dry-run still writes nothing; default green) → Task 1 test + Task 2 Steps 2-4. Decision 5 (scope guards) → Global Constraints + the "Unchanged" checkpoint line.
- **Placeholder scan:** No `TBD`/`TODO`/"similar to Task N". Every edit is an exact old→new block; every run step shows the command and expected result. The conflict test discovers a managed file path at runtime rather than hardcoding one.
- **Type consistency:** `project` is `platformProjector | undefined`; passing `project: undefined` triggers the `project = projectProvider` default added in Milestone 6a, so both call sites are safe. `platformProjector` returns the same projection-plan shape `projectProvider` returns (Milestone 4 parity). `buildInstallPlan` returns `{ managedFiles: [{ path, operation, ... }], ... }`, which the conflict test reads via `plan.managedFiles[].path`. `runCli(args, { cwd })` → `{ exitCode, stdout, stderr }` is used consistently.
