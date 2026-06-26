# Platform Install Dry-Run (Milestone 6a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 6a of the Safe Greenfield refactor: a non-mutating `install --platform --dry-run` that drives the project-mutation projection through the Milestone 4 adapter layer and prints a transaction plan, without ever applying it.

**Architecture:** Add one tiny module `cli/src/platform/install/platform-projector.mjs` (the adapter-as-projector). Thread an optional `project = projectProvider` parameter through the existing `prepareInstallation` and internal `buildDesiredState` so the platform path can swap the projector while reusing all the battle-tested desired-state assembly. Add a short-circuited `install --platform --dry-run` branch in `cli.mjs` that reuses the existing `buildInstallPlan` (non-mutating) + `renderInstallPlan`. No apply, no state writes.

**Tech Stack:** Node.js 20+ ESM (`.mjs`), built-in `node:test`, `node:assert/strict`, `node:fs/promises`, `node:os`, the existing TypeScript build (`npm run build:cli`), and the existing `runCli` test helper (`cli/test/helpers.mjs`).

## Global Constraints

- Implements only Milestone 6a from `docs/superpowers/specs/2026-06-26-platform-safe-greenfield-refactor-design.md` ("Milestone 6 Project Mutation Migration — Decomposition and Milestone 6a Decisions").
- **Non-mutating.** Never call `applyTransaction` and never write lifecycle state. Only `prepareInstallation` (reads source + target) and `buildInstallPlan`/`planTransaction` (reads target for conflict detection) run. No project file may be created or modified by this milestone.
- **Inject, do not duplicate.** The platform path reuses `buildDesiredState` via an optional `project = projectProvider` parameter (default preserves legacy behavior exactly). The platform projector is `(input) => selectAdapter(input.provider).transform({ input })`, which Milestone 4 proved equals `projectProvider`.
- The `install --platform` branch activates only when both `--platform` and `--dry-run` are present; `--platform` without `--dry-run` prints a notice and returns exit code 1 (so M6a can never mutate). It is inserted before the existing install branch.
- Do not route `upgrade`, `uninstall`, `migrate`, or `init`. Do not call `applyTransaction`. The only legacy modification is the backward-compatible `project` parameter on `prepareInstallation` and `buildDesiredState`, plus the new `cli.mjs` branch.
- New `.mjs` files: plain UTF-8 (no BOM).
- Do not commit changes unless the user explicitly asks for a commit.
- Stop after the checkpoint report (Task 3) and wait for explicit user approval before Milestone 6b.

---

## Files

- Create: `cli/src/platform/install/platform-projector.mjs` — `platformProjector(input)` (adapter-as-projector).
- Modify: `cli/src/lifecycle.mjs` — add optional `project = projectProvider` to `buildDesiredState` and `prepareInstallation`; use it at the single projector call site.
- Modify: `cli/src/cli.mjs` — import `platformProjector`; add the `install --platform --dry-run` branch before the existing install branch.
- Create: `cli/test/platform-install-dryrun.test.mjs` — parity + non-mutation unit tests (no build).
- Create: `cli/test/platform-install-dryrun-cli.test.mjs` — integration tests through `runCli` (require a build first).

Existing, unchanged modules consumed:
- `cli/src/lifecycle.mjs` — `prepareInstallation({ root, context, rootPlugins, optionalPlugins, providers, force, all, project })`.
- `cli/src/install-plan.mjs` — `buildInstallPlan({ prepared, context, force })` (calls `planTransaction`, non-mutating) and `renderInstallPlan(plan)`.
- `cli/src/install-request.mjs` — `parseInstallRequest(args)` → draft; `finalizeNonInteractiveDraft(draft)` → `{ rootPlugins, all, providers, optionalPlugins, scope, force }` (requires explicit plugins + providers, not `--yes`).
- `cli/src/install-scope.mjs` — `resolveInstallContext({ scope, projectRoot, homeRoot })` → `{ targetRoot, scope, ... }`.
- `cli/src/platform/adapters/registry.mjs` — `selectAdapter(provider)`.

---

### Task 1: Platform projector + injectable desired-state

**Files:**
- Create: `cli/src/platform/install/platform-projector.mjs`
- Modify: `cli/src/lifecycle.mjs`
- Test: `cli/test/platform-install-dryrun.test.mjs`

**Interfaces:**
- Consumes: `selectAdapter` from `cli/src/platform/adapters/registry.mjs`; `prepareInstallation`, `resolveInstallContext`.
- Produces: `platformProjector(input)` → the validated projection plan for `input.provider`; and a `prepareInstallation`/`buildDesiredState` that accept `project` (default `projectProvider`).

- [ ] **Step 1: Write the failing test**

Create `cli/test/platform-install-dryrun.test.mjs` with this content:

```js
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { prepareInstallation } from "../src/lifecycle.mjs";
import { resolveInstallContext } from "../src/install-scope.mjs";
import { platformProjector } from "../src/platform/install/platform-projector.mjs";
import { repoRoot } from "./helpers.mjs";

function prepareWith(project, target) {
  const context = resolveInstallContext({
    scope: "project",
    projectRoot: target,
    homeRoot: os.homedir(),
  });
  return prepareInstallation({
    root: repoRoot,
    context,
    rootPlugins: ["platform"],
    optionalPlugins: [],
    providers: ["codex"],
    force: false,
    ...(project ? { project } : {}),
  });
}

const sortEntries = (map) =>
  [...map.entries()].sort((left, right) => left[0].localeCompare(right[0]));

test("platform projector yields the same desired state as the legacy projector", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-parity-"));
  try {
    const legacy = await prepareWith(undefined, target);
    const platform = await prepareWith(platformProjector, target);
    assert.deepEqual(sortEntries(platform.desiredFiles), sortEntries(legacy.desiredFiles));
    assert.deepEqual(platform.ownership, legacy.ownership);
    assert.deepEqual(platform.providers, legacy.providers);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("preparing the platform desired state writes nothing to the target", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-nomutate-"));
  try {
    await prepareWith(platformProjector, target);
    assert.deepEqual(await readdir(target), []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test cli/test/platform-install-dryrun.test.mjs`
Expected: FAIL — `Cannot find module` for `../src/platform/install/platform-projector.mjs`.

- [ ] **Step 3: Create the platform projector module**

Create `cli/src/platform/install/platform-projector.mjs` with this content:

```js
import { selectAdapter } from "../adapters/registry.mjs";

export function platformProjector(input) {
  return selectAdapter(input.provider).transform({ input });
}
```

- [ ] **Step 4: Thread the `project` parameter through `cli/src/lifecycle.mjs`**

Edit 4a — `buildDesiredState` signature. Find:

```js
async function buildDesiredState({
  root,
  target,
  context,
  pluginIds = [],
  all = false,
  providers,
  rootPlugins,
  optionalPlugins = [],
}) {
```

Replace with:

```js
async function buildDesiredState({
  root,
  target,
  context,
  pluginIds = [],
  all = false,
  providers,
  rootPlugins,
  optionalPlugins = [],
  project = projectProvider,
}) {
```

Edit 4b — the single projector call site. Find:

```js
    const projection = projectProvider(projectionInput);
```

Replace with:

```js
    const projection = project(projectionInput);
```

Edit 4c — `prepareInstallation` signature and its `buildDesiredState` call. Find:

```js
export async function prepareInstallation({
  root,
  context,
  rootPlugins = [],
  optionalPlugins = [],
  providers,
  force = false,
  all = false,
}) {
  return buildDesiredState({
    root,
    target: context.targetRoot,
    context,
    pluginIds: rootPlugins,
    rootPlugins,
    optionalPlugins,
    providers,
    force,
    all,
  });
}
```

Replace with:

```js
export async function prepareInstallation({
  root,
  context,
  rootPlugins = [],
  optionalPlugins = [],
  providers,
  force = false,
  all = false,
  project = projectProvider,
}) {
  return buildDesiredState({
    root,
    target: context.targetRoot,
    context,
    pluginIds: rootPlugins,
    rootPlugins,
    optionalPlugins,
    providers,
    force,
    all,
    project,
  });
}
```

(`projectProvider` is already imported at the top of `cli/src/lifecycle.mjs`, so the default values resolve. The other `buildDesiredState` callers — `installPlugins` and `removePlugins` — omit `project` and therefore keep using `projectProvider` unchanged.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test cli/test/platform-install-dryrun.test.mjs`
Expected: PASS — 2 tests pass. (Parity holds because Milestone 4 proved `adapter.transform` equals `projectProvider` for the same input; non-mutation holds because `prepareInstallation` only reads.)

---

### Task 2: `install --platform --dry-run` command branch

**Files:**
- Modify: `cli/src/cli.mjs`
- Test: `cli/test/platform-install-dryrun-cli.test.mjs`

**Interfaces:**
- Consumes: `platformProjector` (Task 1); the already-imported `parseInstallRequest`, `finalizeNonInteractiveDraft`, `resolveInstallContext`, `prepareInstallation`, `buildInstallPlan`, `renderInstallPlan`, `os`; `runCli` from `cli/test/helpers.mjs`.
- Produces: CLI behavior for `install --platform --dry-run`.

- [ ] **Step 1: Write the failing test**

Create `cli/test/platform-install-dryrun-cli.test.mjs` with this content:

```js
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "./helpers.mjs";

test("install --platform --dry-run prints a plan and writes nothing", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-cli-"));
  try {
    const { exitCode, stdout } = await runCli(
      ["install", "platform", "--target", "codex", "--platform", "--dry-run"],
      { cwd: target },
    );
    assert.equal(exitCode, 0);
    assert.match(stdout, /Managed files:/);
    assert.match(stdout, /Providers: codex/);
    assert.deepEqual(await readdir(target), []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("install --platform --dry-run --json emits a structured plan", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-cli-json-"));
  try {
    const { exitCode, stdout } = await runCli(
      ["install", "platform", "--target", "codex", "--platform", "--dry-run", "--json"],
      { cwd: target },
    );
    assert.equal(exitCode, 0);
    const plan = JSON.parse(stdout);
    assert.ok(Array.isArray(plan.managedFiles));
    assert.deepEqual(plan.providers, ["codex"]);
    assert.deepEqual(await readdir(target), []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("install --platform without --dry-run is rejected and writes nothing", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6a-cli-guard-"));
  try {
    const { exitCode, stderr } = await runCli(
      ["install", "platform", "--target", "codex", "--platform"],
      { cwd: target },
    );
    assert.equal(exitCode, 1);
    assert.match(stderr, /--dry-run/);
    assert.deepEqual(await readdir(target), []);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Build and run the test to verify it fails**

Run: `npm run build:cli` then `node --test cli/test/platform-install-dryrun-cli.test.mjs`
Expected: FAIL — with no platform branch, `install --platform` falls into the normal install flow, which in a non-interactive spawn throws the "Install requires confirmation" error (exit code 2), so the assertions on exit code 0/1 fail.

- [ ] **Step 3: Add the `platformProjector` import to `cli/src/cli.mjs`**

Add this import alongside the other local imports (for example after the `import { checkCommandOutput } from "./schema-validate.mjs";` line):

```js
import { platformProjector } from "./platform/install/platform-projector.mjs";
```

- [ ] **Step 4: Add the `install --platform --dry-run` branch**

Insert this new block immediately before the existing install block (the one beginning `if (\n    (args[0] === "plugin" && args[1] === "install") ||\n    args[0] === "install" ||\n    args[0] === "generate-adapter"\n  ) {`):

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
    const context = resolveInstallContext({
      scope: intent.scope,
      projectRoot: process.cwd(),
      homeRoot: os.homedir(),
    });
    const prepared = await prepareInstallation({
      root: REPOSITORY_ROOT,
      context,
      rootPlugins: intent.rootPlugins,
      optionalPlugins: intent.optionalPlugins,
      all: intent.all,
      providers: intent.providers,
      force: intent.force,
      project: platformProjector,
    });
    const plan = await buildInstallPlan({ prepared, context, force: intent.force });
    streams.stdout.write(
      draft.json ? `${JSON.stringify(plan)}\n` : renderInstallPlan(plan),
    );
    return 0;
  }
```

- [ ] **Step 5: Build and run the test to verify it passes**

Run: `npm run build:cli` then `node --test cli/test/platform-install-dryrun-cli.test.mjs`
Expected: PASS — 3 tests pass.

---

### Task 3: Verification and Checkpoint Report

**Files:**
- None changed. This task runs validation and produces the milestone checkpoint.

- [ ] **Step 1: Build the CLI**

Run: `npm run build:cli`
Expected: PASS — exits 0 with no type errors.

- [ ] **Step 2: Run the platform test suite**

Run: `node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs cli/test/platform-build.test.mjs cli/test/platform-adapters.test.mjs cli/test/platform-cli-routing.test.mjs cli/test/platform-cli-commands.test.mjs cli/test/platform-install-dryrun.test.mjs cli/test/platform-install-dryrun-cli.test.mjs`
Expected: PASS — the prior 41 platform tests plus 2 parity/non-mutation tests plus 3 dry-run CLI tests all pass.

- [ ] **Step 3: Run the repository validation commands and confirm no regression**

Run each and record the exact result:
- `npm test`
- `npm run validate`
- `npm run doctor`

Expected: `npm test` continues to fail only on the same pre-existing deleted-docs baseline (the `validateRepository` "docs is missing README.md/README_VI.md" / migration-artifact failures). The new platform/install tests must all pass and the previously-passing legacy install/lifecycle tests must remain green (this is the proof that the injected `project` parameter did not change default behavior). Any failure referencing `cli/src/platform/install/` or the new `cli.mjs` branch is a real regression and must be fixed before the checkpoint.

- [ ] **Step 4: Spot-check the dry-run is non-mutating**

Run from an empty temporary directory (not the repo root):
- `node <repo>/cli/dist/index.js install platform --target codex --platform --dry-run`

Expected: prints the plan summary (`Providers: codex`, `Managed files: N`), exits 0, and creates no files in the temporary directory.

- [ ] **Step 5: Write the checkpoint report in chat and stop**

Use this report format:

```markdown
**Phase Summary**
- Goal: Milestone 6a platform install dry-run (non-mutating).
- Completed: platform-projector module; injectable project parameter on prepareInstallation/buildDesiredState; install --platform --dry-run branch reusing buildInstallPlan/renderInstallPlan.
- Changed files: cli/src/platform/install/platform-projector.mjs, cli/src/lifecycle.mjs, cli/src/cli.mjs, cli/test/platform-install-dryrun.test.mjs, cli/test/platform-install-dryrun-cli.test.mjs.
- Unchanged: applyTransaction path; lifecycle state writes; upgrade/uninstall/migrate/init; default install behavior (project defaults to projectProvider).

**Validation Evidence**
- npm run build:cli: PASS or FAIL with exact error.
- node --test (8 platform test files): PASS or FAIL with counts.
- npm test: report counts; the deleted-docs baseline failures are accepted and listed; legacy install/lifecycle tests remain green.
- npm run validate / npm run doctor: FAIL only on the deleted-docs baseline (accepted), or note any new failure.
- Manual: install --platform --dry-run prints a plan, exits 0, writes nothing to a temp dir.

**Spec Coverage Report**
| # | Spec Area | Status | Evidence |
| --- | --- | --- | --- |
| 8 | Build pipeline | Verified | Adapter layer drives a real install plan via planTransaction. |
| 10 | Adapter contract | Verified | platformProjector uses adapter.transform; parity with legacy. |
| 11 | CLI | Implemented | install --platform --dry-run added; default install unchanged. |
| 12 | Migration strategy | In Progress | First mutation slice landed non-mutating (dry-run only). |

**Risk and Rollback**
- Residual risk: dry-run only; no apply, no state writes; the injected project parameter defaults to legacy behavior.
- Rollback path: delete cli/src/platform/install/ + the two new test files; revert the cli.mjs branch/import and the lifecycle.mjs project parameter.
- Affected users: none by default; the new path is opt-in and non-mutating.

**Decision Request**
- Option 1: approve Milestone 6a and proceed to Milestone 6b (platform apply behind a flag) planning.
- Option 2: revise the dry-run output or command surface before continuing.
- Option 3: pause and commit Milestones 1-6a before continuing.
```

- [ ] **Step 6: Stop and wait for approval**

Do not start Milestone 6b until the user explicitly approves the checkpoint.

---

## Self-Review

- **Spec coverage:** Decision 1 (inject projector) → Task 1 Edits 4a-4c + `platformProjector`. Decision 2 (non-mutating) → Task 1 uses `prepareInstallation` only; Task 2 uses `buildInstallPlan` (which only calls `planTransaction`); the non-mutation assertions in both test files. Decision 3 (additive surface, `--platform`+`--dry-run`, guard without `--dry-run`) → Task 2 Step 4 branch + the guard test. Decision 4 (platform module + reuse buildInstallPlan/renderInstallPlan + parseInstallRequest/finalizeNonInteractiveDraft/resolveInstallContext) → Task 1 module + Task 2 branch. Decision 5 (safety proof) → the parity test and the writes-nothing assertions. Decision 6 (scope guards) → Global Constraints and the "Unchanged" checkpoint line. Exit criteria (non-mutating dry-run, equivalence to legacy projection) → Task 1 parity test + Task 3 Steps 2-4.
- **Placeholder scan:** No `TBD`/`TODO`/"add error handling"/"similar to Task N". Every code step shows complete code or an exact old→new edit; every run step shows the command and expected result.
- **Type consistency:** `platformProjector(input)` returns a projection plan (same shape `projectProvider` returns) and is passed as `project` to `prepareInstallation`, which forwards it to `buildDesiredState`, which calls `project(projectionInput)` at the single call site. `prepareInstallation` returns `{ desiredFiles (Map), ownership, lock, projections, graph, mcpServers, plugins, providers }`, consumed by `buildInstallPlan({ prepared, context, force })` → plan with `managedFiles`/`providers`, rendered by `renderInstallPlan`. `finalizeNonInteractiveDraft` returns `{ rootPlugins, all, providers, optionalPlugins, scope, force }`, used consistently in the `cli.mjs` branch.
