# Milestone 6c-1 Platform Uninstall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. User constraint: **no commit**; do not run `git commit`.

**Goal:** Route `remove`/`uninstall --platform` through the platform projector while preserving default uninstall behavior.

**Architecture:** Reuse the existing uninstall lifecycle and transaction path. Inject an optional projector into `removePlugins`, then select `platformProjector` only for top-level `remove`/`uninstall` commands that include `--platform`; do not change `plugin remove`, wizard logic, transaction planning, rollback, or lifecycle state writing.

**Tech Stack:** Node.js ESM, `node:test`, existing CLI `runCli` helper, existing `platformProjector` adapter-as-projector.

---

## File Structure

- Modify: `cli/src/lifecycle.mjs`
  - Add optional `project = projectProvider` parameter to `removePlugins`.
  - Pass `project` into the existing `buildDesiredState` call that projects remaining plugins.
- Modify: `cli/src/cli.mjs`
  - In the uninstall branch, compute a local `project` only when `args[0]` is `remove` or `uninstall` and `--platform` is present.
  - Pass `project` into both existing `removePlugins` call sites.
  - Keep `plugin remove` excluded because `args[0] === "plugin"` must not select `platformProjector`.
- Modify: `cli/test/platform-install-apply.test.mjs`
  - Add a `runCli` smoke test that installs `platform` with `--platform`, removes it with `--platform`, and verifies managed provider files and lifecycle state are removed/cleared.

### Task 1: Route Platform Uninstall

**Files:**
- Modify: `cli/src/lifecycle.mjs:684`
- Modify: `cli/src/cli.mjs:679`
- Test: `cli/test/platform-install-apply.test.mjs`

- [x] **Step 1: Write the failing CLI smoke test**

Add this test to `cli/test/platform-install-apply.test.mjs` after the existing install apply tests:

```js
test("remove --platform --yes removes provider files and clears lifecycle state", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "m6c-uninstall-"));
  try {
    const install = await runCli(APPLY_ARGS, { cwd: target });
    assert.equal(install.exitCode, 0);

    const ownershipPath = path.join(target, ".ai-engineering", "ownership.json");
    const ownership = JSON.parse(await readFile(ownershipPath, "utf8"));
    const managedPaths = Object.keys(ownership.files);
    assert.ok(managedPaths.length > 0);
    const managedFile = managedPaths.find((relativePath) => !relativePath.startsWith(".ai-engineering/"));
    assert.ok(managedFile, "expected at least one non-state managed provider file");

    const remove = await runCli(["remove", "platform", "--platform", "--yes"], { cwd: target });
    assert.equal(remove.exitCode, 0);

    await assert.rejects(readFile(path.join(target, managedFile), "utf8"));
    await assert.rejects(readFile(path.join(target, ".ai-engineering", "installed-plugins.yaml"), "utf8"));
    await assert.rejects(readFile(path.join(target, ".ai-engineering", "lockfile.yaml"), "utf8"));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [x] **Step 2: Run the focused test to verify the current failure**

Run:

```powershell
npm run build:cli
node --test cli/test/platform-install-apply.test.mjs
```

Expected before implementation: the new uninstall test fails because `remove --platform --yes` still uses the legacy projector and does not correctly remove the platform-projected provider files/state.

- [x] **Step 3: Thread the projector through `removePlugins`**

Change `cli/src/lifecycle.mjs` so the function signature and `buildDesiredState` call include `project`:

```js
export async function removePlugins({
  root,
  target,
  context,
  pluginIds = [],
  all = false,
  force = false,
  project = projectProvider,
}) {
```

and:

```js
  const desired = await buildDesiredState({
    root,
    target: installContext.targetRoot,
    context: installContext,
    pluginIds: remainingRoots,
    providers: installed.providers,
    optionalPlugins: installed.optionalPlugins.filter(
      (id) => !removeIds.has(id),
    ),
    rootPlugins: remainingRoots,
    force,
    project,
  });
```

- [x] **Step 4: Select the platform projector in top-level uninstall commands**

In `cli/src/cli.mjs`, inside the existing branch handling `plugin remove`, `remove`, and `uninstall`, add this after `const context = resolveContext(args);`:

```js
    const project =
      (args[0] === "remove" || args[0] === "uninstall") && args.includes("--platform")
        ? platformProjector
        : undefined;
```

Then pass `project` to both `removePlugins` calls:

```js
        force: args.includes("--force"),
        project,
```

and:

```js
        force: args.includes("--force"),
        project,
```

- [x] **Step 5: Run focused verification**

Run:

```powershell
npm run build:cli
node --test cli/test/platform-install-apply.test.mjs
```

Expected after implementation: all tests in `cli/test/platform-install-apply.test.mjs` pass.

- [x] **Step 6: Run default uninstall regression test**

Run:

```powershell
node --test cli/test/lifecycle.test.mjs
```

Expected: existing lifecycle uninstall tests remain green, proving default uninstall behavior remains unchanged.

- [x] **Step 7: Self-review scope guards**

Confirm with `git diff -- cli/src/lifecycle.mjs cli/src/cli.mjs cli/test/platform-install-apply.test.mjs` that:

```text
- only remove/uninstall routing changed
- plugin remove does not select platformProjector
- no upgrade/init/migrate code changed
- transaction, wizard, lifecycle state writer, and rollback code are unchanged
- no commit was created
```

