# Platform CLI Routing (Wave 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 5 (Wave 1) of the Safe Greenfield refactor: an additive `resolve` command and a `--platform` flag that routes the read-only `validate` and `doctor` commands to the new platform runtime, without changing any default command behavior.

**Architecture:** Add one pure module `cli/src/platform/cli-routing.mjs` that holds all argument/engine/projection logic (unit-testable in isolation), then add thin branches in `cli/src/cli.mjs` that call it plus the existing platform runtime (`resolvePlatform`, `validatePlatformContracts`, `generatePlatformLockfile`). Legacy command behavior stays the default; the new runtime is reached only through the new command or the opt-in flag.

**Tech Stack:** Node.js 20+ ESM (`.mjs`), built-in `node:test`, `node:assert/strict`, `node:fs/promises`, the existing TypeScript build (`npm run build:cli`), and the existing `runCli` test helper (`cli/test/helpers.mjs`) that spawns the compiled `cli/dist/index.js`.

## Global Constraints

- Implements only Milestone 5 from `docs/superpowers/specs/2026-06-26-platform-safe-greenfield-refactor-design.md` ("Milestone 5 CLI Routing Migration — Resolved Design Decisions").
- **Additive plus flag-gated.** Do not change the default behavior of `validate` or `doctor` (no flag → existing `validateRepository` / `doctorProject` path, unchanged).
- Routing strategy resolves Open Questions 2 and 4: `--write-lock <path>` requires an explicit path and is opt-in (resolve writes nothing by default); a `--platform` flag selects the new runtime, with legacy as the default and fallback.
- Do not route Wave 2/3 commands (`build`, `install`, `upgrade`, `remove`, `migrate`). Do not introduce `cli/src/commands/`. Do not modify the legacy projectors, `cli/src/contracts.mjs`, or the platform runtime modules.
- The config file `ai-engineering.config.yaml` is JSON content; read it with `JSON.parse` (the same convention `cli/src/platform/validation/validate-platform-contracts.mjs` uses for `plugin.yaml`).
- `resolvePlatform` returns `plugins` as a `Map`; any JSON output must use the `resolutionToJson` projection so the Map is not silently dropped.
- New `.mjs` files: plain UTF-8 (no BOM).
- Do not commit changes unless the user explicitly asks for a commit.
- Stop after the checkpoint report (Task 3) and wait for explicit user approval before Milestone 6.

---

## Files

- Create: `cli/src/platform/cli-routing.mjs` — pure helpers: `selectValidationEngine`, `loadPlatformConfigDefaults`, `parseResolveArgs`, `resolutionToJson`, `formatResolution`.
- Create: `cli/test/platform-cli-routing.test.mjs` — unit tests for the pure helpers (no build, no spawn).
- Modify: `cli/src/cli.mjs` — add platform imports + `writeFile`; add a `resolve` branch; add `--platform` routing to the `validate` and `doctor` branches.
- Create: `cli/test/platform-cli-commands.test.mjs` — integration tests through `runCli` (require a build first).

Existing, unchanged modules consumed:
- `cli/src/platform/resolver/resolve-platform.mjs` — `resolvePlatform({ root, requested, optional, platformVersion, providers })` → `{ platformVersion, providers, plugins(Map), pluginIds, graph, assets, ownership }`.
- `cli/src/platform/validation/validate-platform-contracts.mjs` — `validatePlatformContracts({ root })` → `{ status, pluginCount, assetCount, pluginIds, assetIds }`.
- `cli/src/platform/lockfile/generate-lockfile.mjs` — `generatePlatformLockfile(resolution)` → validated lockfile object.
- `cli/test/helpers.mjs` — `runCli(args, options?)` → `{ exitCode, stdout, stderr }`; `repoRoot`.

---

### Task 1: Pure CLI-routing module

**Files:**
- Create: `cli/src/platform/cli-routing.mjs`
- Test: `cli/test/platform-cli-routing.test.mjs`

**Interfaces:**
- Consumes: `node:fs/promises` `readFile`, `node:path`.
- Produces:
  - `selectValidationEngine(args)` → `"platform"` if `args` includes `--platform`, else `"legacy"`.
  - `loadPlatformConfigDefaults(root)` → `Promise<{ platformVersion, providers, plugins }>` read from `<root>/ai-engineering.config.yaml`.
  - `parseResolveArgs(args, defaults)` → `{ requested, providers, optional, platformVersion, writeLockRequested, writeLockPath, json }`.
  - `resolutionToJson(resolution)` → JSON-safe object `{ platformVersion, providers, pluginIds, graph, assets, ownership }` (no `plugins` Map).
  - `formatResolution(resolution)` → human-readable summary string.

- [ ] **Step 1: Write the failing test**

Create `cli/test/platform-cli-routing.test.mjs` with this content:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  selectValidationEngine,
  loadPlatformConfigDefaults,
  parseResolveArgs,
  resolutionToJson,
  formatResolution,
} from "../src/platform/cli-routing.mjs";
import { repoRoot } from "./helpers.mjs";

test("selectValidationEngine picks platform only when --platform is present", () => {
  assert.equal(selectValidationEngine(["validate", "--platform"]), "platform");
  assert.equal(selectValidationEngine(["validate", "--json"]), "legacy");
  assert.equal(selectValidationEngine(["doctor"]), "legacy");
});

test("loadPlatformConfigDefaults reads platformVersion, providers, and plugins", async () => {
  const defaults = await loadPlatformConfigDefaults(repoRoot);
  assert.equal(defaults.platformVersion, "1.0.0");
  assert.deepEqual([...defaults.providers].sort(), ["antigravity", "claude", "codex", "cursor"]);
  assert.ok(defaults.plugins.includes("platform"));
});

test("parseResolveArgs applies config defaults and flag overrides", () => {
  const defaults = {
    platformVersion: "1.0.0",
    providers: ["codex", "claude"],
    plugins: ["platform", "security"],
  };

  const fromDefaults = parseResolveArgs([], defaults);
  assert.deepEqual(fromDefaults.requested, ["platform", "security"]);
  assert.deepEqual(fromDefaults.providers, ["codex", "claude"]);
  assert.equal(fromDefaults.platformVersion, "1.0.0");
  assert.deepEqual(fromDefaults.optional, []);
  assert.equal(fromDefaults.writeLockRequested, false);
  assert.equal(fromDefaults.writeLockPath, undefined);
  assert.equal(fromDefaults.json, false);

  const overridden = parseResolveArgs(
    [
      "platform",
      "--provider",
      "codex",
      "--platform-version",
      "2.0.0",
      "--optional",
      "data",
      "--write-lock",
      "./out.lock",
      "--json",
    ],
    defaults,
  );
  assert.deepEqual(overridden.requested, ["platform"]);
  assert.deepEqual(overridden.providers, ["codex"]);
  assert.equal(overridden.platformVersion, "2.0.0");
  assert.deepEqual(overridden.optional, ["data"]);
  assert.equal(overridden.writeLockRequested, true);
  assert.equal(overridden.writeLockPath, "./out.lock");
  assert.equal(overridden.json, true);
});

test("parseResolveArgs flags --write-lock without a path", () => {
  const defaults = { platformVersion: "1.0.0", providers: [], plugins: [] };
  const parsed = parseResolveArgs(["platform", "--write-lock", "--json"], defaults);
  assert.equal(parsed.writeLockRequested, true);
  assert.equal(parsed.writeLockPath, undefined);
});

test("resolutionToJson drops the plugins Map and stays JSON-safe", () => {
  const resolution = {
    platformVersion: "1.0.0",
    providers: ["codex"],
    plugins: new Map([["platform", { id: "platform" }]]),
    pluginIds: ["platform"],
    graph: [],
    assets: [{ id: "platform.skill" }],
    ownership: { "platform.skill": ["platform"] },
  };
  const json = resolutionToJson(resolution);
  assert.equal(Object.hasOwn(json, "plugins"), false);
  assert.deepEqual(json, {
    platformVersion: "1.0.0",
    providers: ["codex"],
    pluginIds: ["platform"],
    graph: [],
    assets: [{ id: "platform.skill" }],
    ownership: { "platform.skill": ["platform"] },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(json)), json);
});

test("formatResolution summarizes plugins, providers, assets, and edges", () => {
  const text = formatResolution({
    platformVersion: "1.0.0",
    providers: ["codex", "cursor"],
    pluginIds: ["platform", "security"],
    graph: [{ from: "security", to: "platform" }],
    assets: [{ id: "a" }, { id: "b" }],
    ownership: {},
  });
  assert.match(text, /Resolved 2 plugins for 2 providers/);
  assert.match(text, /platform, security/);
  assert.match(text, /Assets: 2; dependency edges: 1/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test cli/test/platform-cli-routing.test.mjs`
Expected: FAIL — `Cannot find module` for `../src/platform/cli-routing.mjs`.

- [ ] **Step 3: Write the module implementation**

Create `cli/src/platform/cli-routing.mjs` with this content:

```js
import { readFile } from "node:fs/promises";
import path from "node:path";

export function selectValidationEngine(args) {
  return args.includes("--platform") ? "platform" : "legacy";
}

export async function loadPlatformConfigDefaults(root) {
  const configPath = path.join(root, "ai-engineering.config.yaml");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  return {
    platformVersion: config.product?.version ?? "1.0.0",
    providers: config.providers?.enabled ?? [],
    plugins: config.plugins?.enabled ?? [],
  };
}

const FLAGS_WITH_VALUE = new Set([
  "--provider",
  "--optional",
  "--platform-version",
  "--write-lock",
]);

function flagValues(args, flag) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && index + 1 < args.length) {
      values.push(args[index + 1]);
    }
  }
  return values;
}

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : undefined;
}

export function parseResolveArgs(args, defaults) {
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token.startsWith("--")) {
      if (FLAGS_WITH_VALUE.has(token)) {
        index += 1;
      }
      continue;
    }
    positional.push(token);
  }

  const providers = flagValues(args, "--provider");
  const platformVersion = flagValue(args, "--platform-version") ?? defaults.platformVersion;
  const writeLockRequested = args.includes("--write-lock");
  const writeLockNext = flagValue(args, "--write-lock");
  const writeLockPath =
    writeLockRequested && writeLockNext && !writeLockNext.startsWith("--")
      ? writeLockNext
      : undefined;

  return {
    requested: positional.length > 0 ? positional : defaults.plugins,
    providers: providers.length > 0 ? providers : defaults.providers,
    optional: flagValues(args, "--optional"),
    platformVersion,
    writeLockRequested,
    writeLockPath,
    json: args.includes("--json"),
  };
}

export function resolutionToJson(resolution) {
  return {
    platformVersion: resolution.platformVersion,
    providers: resolution.providers,
    pluginIds: resolution.pluginIds,
    graph: resolution.graph,
    assets: resolution.assets,
    ownership: resolution.ownership,
  };
}

export function formatResolution(resolution) {
  return [
    `Resolved ${resolution.pluginIds.length} plugins for ${resolution.providers.length} providers (platform ${resolution.platformVersion}).`,
    `Plugins: ${resolution.pluginIds.join(", ")}`,
    `Assets: ${resolution.assets.length}; dependency edges: ${resolution.graph.length}`,
    "",
  ].join("\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test cli/test/platform-cli-routing.test.mjs`
Expected: PASS — 6 tests pass.

---

### Task 2: Wire the commands into the CLI

**Files:**
- Modify: `cli/src/cli.mjs`
- Test: `cli/test/platform-cli-commands.test.mjs`

**Interfaces:**
- Consumes: Task 1's `cli-routing.mjs` exports; `resolvePlatform`, `validatePlatformContracts`, `generatePlatformLockfile`; `runCli`, `repoRoot` from `cli/test/helpers.mjs`.
- Produces: CLI behavior — `validate --platform`, `doctor --platform` (source mode), and a new `resolve` command.

- [ ] **Step 1: Write the failing test**

Create `cli/test/platform-cli-commands.test.mjs` with this content:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { resolvePlatform } from "../src/platform/resolver/resolve-platform.mjs";
import { generatePlatformLockfile } from "../src/platform/lockfile/generate-lockfile.mjs";
import { validatePlatformContracts } from "../src/platform/validation/validate-platform-contracts.mjs";
import { resolutionToJson } from "../src/platform/cli-routing.mjs";
import { runCli, repoRoot } from "./helpers.mjs";

function directResolution() {
  return resolvePlatform({
    root: repoRoot,
    requested: ["platform"],
    optional: [],
    platformVersion: "1.0.0",
    providers: ["codex"],
  });
}

test("validate --platform routes to the platform contract validator", async () => {
  const { exitCode, stdout } = await runCli(["validate", "--platform", "--json"]);
  assert.equal(exitCode, 0);
  const result = JSON.parse(stdout);
  assert.equal(result.status, "pass");
  assert.ok(result.pluginCount >= 1);
  const direct = await validatePlatformContracts({ root: repoRoot });
  assert.equal(result.pluginCount, direct.pluginCount);
  assert.equal(result.assetCount, direct.assetCount);
});

test("doctor --platform passes in source mode", async () => {
  const { exitCode, stdout } = await runCli(["doctor", "--platform", "--json"]);
  assert.equal(exitCode, 0);
  const result = JSON.parse(stdout);
  assert.equal(result.status, "pass");
  assert.equal(result.scope, "source-platform");
});

test("resolve --json matches a direct resolvePlatform call", async () => {
  const { exitCode, stdout } = await runCli([
    "resolve",
    "platform",
    "--provider",
    "codex",
    "--json",
  ]);
  assert.equal(exitCode, 0);
  const result = JSON.parse(stdout);
  const direct = resolutionToJson(await directResolution());
  assert.deepEqual(result.pluginIds, direct.pluginIds);
  assert.deepEqual(result.graph, direct.graph);
  assert.deepEqual(result.providers, direct.providers);
});

test("resolve --write-lock writes a lockfile equal to generatePlatformLockfile", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "m5-resolve-"));
  const lockPath = path.join(dir, "platform.lock");
  try {
    const { exitCode } = await runCli([
      "resolve",
      "platform",
      "--provider",
      "codex",
      "--write-lock",
      lockPath,
    ]);
    assert.equal(exitCode, 0);
    const written = JSON.parse(await readFile(lockPath, "utf8"));
    const expected = generatePlatformLockfile(await directResolution());
    assert.deepEqual(written, expected);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("resolve --write-lock without a path is a usage error", async () => {
  const { exitCode, stderr } = await runCli(["resolve", "platform", "--write-lock"]);
  assert.equal(exitCode, 1);
  assert.match(stderr, /--write-lock <path>/);
});
```

- [ ] **Step 2: Build and run the test to verify it fails**

Run: `npm run build:cli` then `node --test cli/test/platform-cli-commands.test.mjs`
Expected: FAIL — `validate --platform` runs the legacy validator (which errors on the deleted-docs baseline) and `resolve` is an unknown command (exit code 2), so the assertions on exit code 0 fail.

- [ ] **Step 3: Add imports to `cli/src/cli.mjs`**

Change the `node:fs/promises` import (currently `import { readdir } from "node:fs/promises";`) to:

```js
import { readdir, writeFile } from "node:fs/promises";
```

Then add these imports alongside the other local imports (for example directly after the `import { checkCommandOutput } from "./schema-validate.mjs";` line):

```js
import { validatePlatformContracts } from "./platform/validation/validate-platform-contracts.mjs";
import { resolvePlatform } from "./platform/resolver/resolve-platform.mjs";
import { generatePlatformLockfile } from "./platform/lockfile/generate-lockfile.mjs";
import {
  selectValidationEngine,
  loadPlatformConfigDefaults,
  parseResolveArgs,
  resolutionToJson,
  formatResolution,
} from "./platform/cli-routing.mjs";
```

- [ ] **Step 4: Add `--platform` routing to the `doctor` source-mode branch**

Find this exact block in `run()`:

```js
  if (args[0] === "doctor") {
    if (path.resolve(process.cwd()) === REPOSITORY_ROOT) {
      const result = await validateRepository(REPOSITORY_ROOT);
      streams.stdout.write(
        args.includes("--json")
          ? `${JSON.stringify({ status: "pass", scope: "source", ...result })}\n`
          : `Doctor passed for source repository: ${result.pluginCount} plugins, ${result.providerCount} providers.\n`,
      );
      return 0;
    }
```

Replace it with:

```js
  if (args[0] === "doctor") {
    if (path.resolve(process.cwd()) === REPOSITORY_ROOT) {
      if (selectValidationEngine(args) === "platform") {
        const platformResult = await validatePlatformContracts({ root: REPOSITORY_ROOT });
        streams.stdout.write(
          args.includes("--json")
            ? `${JSON.stringify({ status: "pass", scope: "source-platform", ...platformResult })}\n`
            : `Doctor (platform) passed: ${platformResult.pluginCount} plugins, ${platformResult.assetCount} assets.\n`,
        );
        return 0;
      }
      const result = await validateRepository(REPOSITORY_ROOT);
      streams.stdout.write(
        args.includes("--json")
          ? `${JSON.stringify({ status: "pass", scope: "source", ...result })}\n`
          : `Doctor passed for source repository: ${result.pluginCount} plugins, ${result.providerCount} providers.\n`,
      );
      return 0;
    }
```

- [ ] **Step 5: Add `--platform` routing to the `validate` branch**

Find this exact block in `run()`:

```js
  if (args[0] === "validate") {
    const root = REPOSITORY_ROOT;
    const result = await validateRepository(root);
```

Replace it with:

```js
  if (args[0] === "validate") {
    if (selectValidationEngine(args) === "platform") {
      const platformResult = await validatePlatformContracts({ root: REPOSITORY_ROOT });
      streams.stdout.write(
        args.includes("--json")
          ? `${JSON.stringify(platformResult)}\n`
          : `Validated ${platformResult.pluginCount} plugins and ${platformResult.assetCount} assets (platform contracts).\n`,
      );
      return 0;
    }
    const root = REPOSITORY_ROOT;
    const result = await validateRepository(root);
```

(The remaining lines of the `validate` block are unchanged.)

- [ ] **Step 6: Add the `resolve` command branch**

Insert this new block immediately before the `if (args[0] === "validate") {` block:

```js
  if (args[0] === "resolve") {
    const defaults = await loadPlatformConfigDefaults(REPOSITORY_ROOT);
    const options = parseResolveArgs(args.slice(1), defaults);
    if (options.writeLockRequested && !options.writeLockPath) {
      streams.stderr.write("usage: aie resolve [plugin...] --write-lock <path>\n");
      return 1;
    }
    const resolution = await resolvePlatform({
      root: REPOSITORY_ROOT,
      requested: options.requested,
      optional: options.optional,
      platformVersion: options.platformVersion,
      providers: options.providers,
    });
    if (options.writeLockPath) {
      const lockfile = generatePlatformLockfile(resolution);
      await writeFile(options.writeLockPath, `${JSON.stringify(lockfile, null, 2)}\n`, "utf8");
    }
    streams.stdout.write(
      options.json
        ? `${JSON.stringify(resolutionToJson(resolution))}\n`
        : formatResolution(resolution),
    );
    return 0;
  }
```

- [ ] **Step 7: Build and run the test to verify it passes**

Run: `npm run build:cli` then `node --test cli/test/platform-cli-commands.test.mjs`
Expected: PASS — 5 tests pass.

---

### Task 3: Verification and Checkpoint Report

**Files:**
- None changed. This task runs validation and produces the milestone checkpoint.

- [ ] **Step 1: Build the CLI**

Run: `npm run build:cli`
Expected: PASS — exits 0 with no type errors.

- [ ] **Step 2: Run the platform test suite**

Run: `node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs cli/test/platform-build.test.mjs cli/test/platform-adapters.test.mjs cli/test/platform-cli-routing.test.mjs cli/test/platform-cli-commands.test.mjs`
Expected: PASS — the prior 30 platform tests plus 6 routing tests plus 5 command tests all pass.

- [ ] **Step 3: Run the repository validation commands**

Run each and record the exact result:
- `npm test`
- `npm run validate`
- `npm run doctor`

Expected: the new work does not change default behavior. The same 7 pre-existing failures from the intentionally deleted docs baseline (the `validateRepository` "docs is missing README.md/README_VI.md" / migration-artifact errors) remain and are an accepted external baseline; the new platform CLI tests must all pass. Any failure that references `cli/src/platform/cli-routing.mjs` or the new command branches is a real regression and must be fixed before the checkpoint.

- [ ] **Step 4: Spot-check the new commands manually**

Run and confirm exit code 0 and sensible output:
- `node cli/dist/index.js validate --platform`
- `node cli/dist/index.js resolve platform --provider codex`

Expected: `validate --platform` prints the plugin/asset counts; `resolve` prints the resolved plugin summary. These succeed even though plain `validate` fails on the deleted-docs baseline.

- [ ] **Step 5: Write the checkpoint report in chat and stop**

Use this report format:

```markdown
**Phase Summary**
- Goal: Milestone 5 Wave 1 CLI routing.
- Completed: pure cli-routing module; resolve command; --platform routing for validate and doctor (source mode).
- Changed files: cli/src/platform/cli-routing.mjs, cli/src/cli.mjs, cli/test/platform-cli-routing.test.mjs, cli/test/platform-cli-commands.test.mjs.
- Unchanged: default validate/doctor behavior; legacy projectors; contracts.mjs; platform runtime modules.

**Validation Evidence**
- npm run build:cli: PASS or FAIL with exact error.
- node --test (6 platform test files): PASS or FAIL with exact error and counts.
- npm test: report pass/fail counts; the deleted-docs baseline failures are accepted and listed.
- npm run validate / npm run doctor: FAIL only on the deleted-docs baseline (accepted), or note any new failure.
- Manual: validate --platform and resolve platform --provider codex exit 0.

**Spec Coverage Report**
| # | Spec Area | Status | Evidence |
| --- | --- | --- | --- |
| 7 | Dependency resolution | Verified | resolve command exercises resolvePlatform end-to-end. |
| 11 | CLI | Implemented | New resolve command + --platform flag; default behavior unchanged. |
| 12 | Migration strategy | In Progress | Wave 1 read-only routing landed additively. |
| 14 | Compatibility | Verified | Default validate/doctor unchanged; new paths additive. |

**Risk and Rollback**
- Residual risk: new runtime reachable only via new command/flag; default behavior untouched; resolve writes only with explicit --write-lock <path>.
- Rollback path: delete cli/src/platform/cli-routing.mjs + the two new test files, and revert the cli.mjs branches/imports.
- Affected users: none by default; opt-in only.

**Decision Request**
- Option 1: approve Milestone 5 and proceed to Milestone 6 (project mutation) planning.
- Option 2: revise the resolve/validate output or flag names before continuing.
- Option 3: pause and commit Milestones 1-5 before continuing.
```

- [ ] **Step 6: Stop and wait for approval**

Do not start Milestone 6 until the user explicitly approves the checkpoint.

---

## Self-Review

- **Spec coverage:** Decision 1 (additive `resolve` with config defaults + `--write-lock <path>`) → Task 1 `parseResolveArgs`/`loadPlatformConfigDefaults` and Task 2 Step 6 + the write-lock tests. Decision 2 (`--platform` flag routes validate/doctor; legacy default) → Task 1 `selectValidationEngine` and Task 2 Steps 4-5. Decision 3 (thin CLI, one helper module, JSON-safe projection because `plugins` is a Map) → Task 1 module + `resolutionToJson` and Task 2 thin branches. Decision 4 (additive parity testing: pure unit tests + `runCli` integration) → Task 1 test and Task 2 test. Decision 5 (scope guards) → Global Constraints and the "Unchanged" checkpoint line. Milestone 5 exit criteria ("public binaries still work", "migrated commands pass parity tests") → Task 3 Steps 2-4.
- **Placeholder scan:** No `TBD`/`TODO`/"add error handling"/"similar to Task N". Every code step shows complete code; every run step shows the command and the expected result. The one hardcoded value (`platformVersion: "1.0.0"`) matches `ai-engineering.config.yaml` `product.version` and is used consistently in both the command defaults and the test's `directResolution`.
- **Type consistency:** `selectValidationEngine`, `loadPlatformConfigDefaults`, `parseResolveArgs` (returning `requested/providers/optional/platformVersion/writeLockRequested/writeLockPath/json`), `resolutionToJson`, and `formatResolution` are used with identical names and shapes across Task 1, Task 2, and both test files. `validatePlatformContracts({ root })` returns `{ status, pluginCount, assetCount, ... }` and is consumed consistently in the validate/doctor branches and the integration test. `resolvePlatform(...)` arguments match between the `resolve` branch and `directResolution()` in the test.
