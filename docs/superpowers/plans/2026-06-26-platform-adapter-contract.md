# Platform Adapter Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 4 of the Safe Greenfield refactor: provider adapters that implement the platform four-method contract by wrapping the existing legacy projectors, with parity proven against current output.

**Architecture:** Add two focused modules under `cli/src/platform/adapters/`. `adapter-factory.mjs` is a pure factory that turns any `project(input)` projector into an object exposing `validate/transform/package/publish`. `registry.mjs` loads the four legacy projectors through the same dynamic-import-by-URL pattern `cli/src/providers.mjs` already uses, builds one adapter per provider through the factory, and exposes `selectAdapter(provider)`. No CLI command is routed to the new adapters and no legacy module is modified.

**Tech Stack:** Node.js 20+ ESM (`.mjs`), built-in `node:test`, built-in `node:assert/strict`, built-in `node:crypto`, the existing TypeScript build with `allowJs` (`npm run build:cli`), and the repository scripts `npm test`, `npm run validate`, `npm run doctor`.

## Global Constraints

- Implements only Milestone 4 from `docs/superpowers/specs/2026-06-26-platform-safe-greenfield-refactor-design.md` ("Milestone 4 Adapter Contract — Resolved Design Decisions").
- Do not modify `cli/src/cli.mjs`, `cli/src/providers.mjs`, `cli/src/projection-contracts.mjs`, `cli/src/provider-list.mjs`, or any `adapters/<provider>/projector.mjs`.
- Do not route any CLI command to the new adapters and do not write into a target project.
- Adapters must load legacy projectors only through the dynamic-import-by-URL pattern. The legacy `adapters/` tree is outside the `tsc` `rootDir` (`src`), so a static `import` of a projector breaks `npm run build:cli` (TS6059).
- Adapter `context` is `{ input }`, where `input` is a semantic projection input that already carries `provider` and `scope` (validated by `cli/src/projection-contracts.mjs`).
- The adapter `version` is the string `"1.0.0"` for every provider in this milestone.
- Test files import from `../src/...` (source `.mjs`), matching `cli/test/platform-*.test.mjs`.
- Do not commit changes unless the user explicitly asks for a commit.
- Stop after the checkpoint report (Task 4) and wait for explicit user approval before Milestone 5.

---

## Files

- Create: `cli/src/platform/adapters/adapter-factory.mjs` — pure `createWrapperAdapter({ id, version, projector })` returning the four-method contract.
- Create: `cli/src/platform/adapters/registry.mjs` — dynamic-import loader + `ADAPTERS` map + `selectAdapter(provider)`.
- Create: `cli/test/platform-adapters.test.mjs` — factory, registry, and parity tests.

These build on existing, unchanged modules:
- `cli/src/platform/contracts/adapter.mjs` — `validateAdapterContract(adapter)` (asserts `id`, `version`, and the four methods).
- `cli/src/platform/errors/platform-error.mjs` — `PlatformContractError`, `PLATFORM_ERROR_CODES`, `assertCondition`.
- `cli/src/projection-contracts.mjs` — `validateProjectionInput(input)`, `validateProjectionPlan(plan)`.
- `cli/src/provider-list.mjs` — `SUPPORTED_PROVIDERS` (`["antigravity", "claude", "codex", "cursor"]`).
- `cli/src/providers.mjs` — `projectProvider(input)`, the legacy dispatch used as the parity baseline.

---

### Task 1: Adapter Wrapper Factory

**Files:**
- Create: `cli/src/platform/adapters/adapter-factory.mjs`
- Test: `cli/test/platform-adapters.test.mjs`

**Interfaces:**
- Consumes: `validateProjectionInput`, `validateProjectionPlan` from `cli/src/projection-contracts.mjs`; `assertCondition`, `PLATFORM_ERROR_CODES` from `cli/src/platform/errors/platform-error.mjs`.
- Produces: `createWrapperAdapter({ id, version, projector })` returning `{ id, version, validate(context), transform(context), package(context), publish(context) }`.
  - `context` is `{ input }` (a projection input).
  - `validate(context)` returns the validated `input`; throws `PlatformContractError` (`INVALID_ADAPTER`) when `input.provider !== id`.
  - `transform(context)` returns the validated projection plan (`{ schemaVersion, provider, scope, assets, instructions?, mcpConfig? }`).
  - `package(context)` returns `{ id, version, provider, scope, files, plan }`. Each `render` asset becomes `{ path, operation: "render", content, sha256 }`; each `copy` asset becomes `{ path, operation: "copy", sourcePath }`.
  - `publish(context)` returns `{ provider, scope, files }`. Each `render` asset becomes `{ path, content }`; each `copy` asset becomes `{ path, sourcePath }`. No disk I/O.

- [ ] **Step 1: Write the failing test**

Create `cli/test/platform-adapters.test.mjs` with this content:

```js
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createWrapperAdapter } from "../src/platform/adapters/adapter-factory.mjs";
import { validateAdapterContract } from "../src/platform/contracts/adapter.mjs";
import { PLATFORM_ERROR_CODES } from "../src/platform/errors/platform-error.mjs";

function fakeInput(provider = "codex", scope = "project") {
  return {
    schemaVersion: 1,
    provider,
    scope,
    plugins: [{ id: "demo", version: "1.0.0" }],
    skills: [],
    commands: [],
    agents: [],
    hooks: [],
    workflows: [],
  };
}

function fakeProjector(input) {
  return {
    schemaVersion: 1,
    provider: "codex",
    scope: input.scope,
    assets: [
      {
        operation: "render",
        assetType: "command",
        assetId: "demo.cmd",
        destinationPath: ".codex/demo.md",
        content: "hello\n",
        owners: ["demo"],
        shared: false,
      },
      {
        operation: "copy",
        assetType: "skill",
        assetId: "demo.skill",
        sourcePath: "plugins/demo/skills/demo",
        destinationPath: ".agents/skills/demo",
        owners: ["demo"],
        shared: false,
      },
    ],
  };
}

const codexAdapter = createWrapperAdapter({
  id: "codex",
  version: "1.0.0",
  projector: fakeProjector,
});

test("wrapper adapter satisfies the platform adapter contract", () => {
  assert.doesNotThrow(() => validateAdapterContract(codexAdapter));
  assert.equal(codexAdapter.id, "codex");
  assert.equal(codexAdapter.version, "1.0.0");
});

test("validate rejects a provider that does not match the adapter id", () => {
  assert.throws(
    () => codexAdapter.validate({ input: fakeInput("claude") }),
    (error) => error.code === PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  );
});

test("transform returns the validated projection plan", () => {
  const plan = codexAdapter.transform({ input: fakeInput() });
  assert.equal(plan.provider, "codex");
  assert.deepEqual(
    plan.assets.map((asset) => asset.destinationPath),
    [".codex/demo.md", ".agents/skills/demo"],
  );
});

test("package hashes render content and references copy sources", () => {
  const artifact = codexAdapter.package({ input: fakeInput() });
  assert.equal(artifact.provider, "codex");
  assert.equal(artifact.scope, "project");
  assert.deepEqual(artifact.files, [
    {
      path: ".codex/demo.md",
      operation: "render",
      content: "hello\n",
      sha256: createHash("sha256").update("hello\n").digest("hex"),
    },
    {
      path: ".agents/skills/demo",
      operation: "copy",
      sourcePath: "plugins/demo/skills/demo",
    },
  ]);
});

test("publish returns a write-plan with no disk writes and is deterministic", () => {
  const first = codexAdapter.publish({ input: fakeInput() });
  const second = codexAdapter.publish({ input: fakeInput() });
  assert.deepEqual(first, {
    provider: "codex",
    scope: "project",
    files: [
      { path: ".codex/demo.md", content: "hello\n" },
      { path: ".agents/skills/demo", sourcePath: "plugins/demo/skills/demo" },
    ],
  });
  assert.deepEqual(first, second);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test cli/test/platform-adapters.test.mjs`
Expected: FAIL — `Cannot find module` for `../src/platform/adapters/adapter-factory.mjs`.

- [ ] **Step 3: Write the factory implementation**

Create `cli/src/platform/adapters/adapter-factory.mjs` with this content:

```js
import { createHash } from "node:crypto";

import {
  validateProjectionInput,
  validateProjectionPlan,
} from "../../projection-contracts.mjs";
import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

function sha256Text(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function createWrapperAdapter({ id, version, projector }) {
  assertCondition(typeof id === "string" && id.length > 0, "adapter id is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  assertCondition(typeof version === "string" && version.length > 0, "adapter version is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  assertCondition(typeof projector === "function", `adapter ${id} requires a projector function`, {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });

  function validate(context) {
    const input = context?.input;
    validateProjectionInput(input);
    assertCondition(input.provider === id, `adapter ${id} cannot project provider ${input.provider}`, {
      code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
    });
    return input;
  }

  function transform(context) {
    const input = validate(context);
    return validateProjectionPlan(projector(input));
  }

  function packageArtifact(context) {
    const plan = transform(context);
    const files = plan.assets.map((asset) =>
      asset.operation === "render"
        ? {
            path: asset.destinationPath,
            operation: "render",
            content: asset.content,
            sha256: sha256Text(asset.content),
          }
        : {
            path: asset.destinationPath,
            operation: "copy",
            sourcePath: asset.sourcePath,
          },
    );
    return { id, version, provider: id, scope: plan.scope, files, plan };
  }

  function publish(context) {
    const plan = transform(context);
    const files = plan.assets.map((asset) =>
      asset.operation === "render"
        ? { path: asset.destinationPath, content: asset.content }
        : { path: asset.destinationPath, sourcePath: asset.sourcePath },
    );
    return { provider: id, scope: plan.scope, files };
  }

  return { id, version, validate, transform, package: packageArtifact, publish };
}
```

Note: the public method is exposed as `package` but the internal function is named `packageArtifact` because `function package() {}` is a syntax error in strict-mode ESM (`package` is a reserved word).

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test cli/test/platform-adapters.test.mjs`
Expected: PASS — 5 tests pass.

---

### Task 2: Adapter Registry

**Files:**
- Create: `cli/src/platform/adapters/registry.mjs`
- Test: `cli/test/platform-adapters.test.mjs` (append)

**Interfaces:**
- Consumes: `createWrapperAdapter` from `./adapter-factory.mjs`; `SUPPORTED_PROVIDERS` from `cli/src/provider-list.mjs`; `PlatformContractError`, `PLATFORM_ERROR_CODES` from `cli/src/platform/errors/platform-error.mjs`; the legacy `project` export of each `adapters/<provider>/projector.mjs`, loaded by URL.
- Produces: `ADAPTERS` (a frozen `{ [provider]: adapter }` map) and `selectAdapter(provider)` (returns the adapter or throws `PlatformContractError` with code `INVALID_ADAPTER`).

- [ ] **Step 1: Write the failing test**

Add these two imports to the top of `cli/test/platform-adapters.test.mjs` (after the existing imports):

```js
import { selectAdapter, ADAPTERS } from "../src/platform/adapters/registry.mjs";
import { SUPPORTED_PROVIDERS } from "../src/provider-list.mjs";
```

Append these tests to the end of `cli/test/platform-adapters.test.mjs`:

```js
test("registry exposes a contract-valid adapter for every supported provider", () => {
  assert.deepEqual(Object.keys(ADAPTERS).sort(), [...SUPPORTED_PROVIDERS].sort());
  for (const provider of SUPPORTED_PROVIDERS) {
    const adapter = selectAdapter(provider);
    assert.doesNotThrow(() => validateAdapterContract(adapter));
    assert.equal(adapter.id, provider);
    assert.equal(adapter.version, "1.0.0");
  }
});

test("selectAdapter throws an INVALID_ADAPTER error for an unknown provider", () => {
  assert.throws(
    () => selectAdapter("unknown"),
    (error) => error.code === PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test cli/test/platform-adapters.test.mjs`
Expected: FAIL — `Cannot find module` for `../src/platform/adapters/registry.mjs`.

- [ ] **Step 3: Write the registry implementation**

Create `cli/src/platform/adapters/registry.mjs` with this content:

```js
import { createWrapperAdapter } from "./adapter-factory.mjs";
import {
  PlatformContractError,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";
import { SUPPORTED_PROVIDERS } from "../../provider-list.mjs";

const ADAPTER_VERSION = "1.0.0";

const adapterUrl = (provider) =>
  new URL(`../../../../adapters/${provider}/projector.mjs`, import.meta.url).href;

const dynamicImport = new Function("specifier", "return import(specifier)");

const entries = await Promise.all(
  SUPPORTED_PROVIDERS.map(async (provider) => {
    const { project } = await dynamicImport(adapterUrl(provider));
    return [
      provider,
      createWrapperAdapter({ id: provider, version: ADAPTER_VERSION, projector: project }),
    ];
  }),
);

export const ADAPTERS = Object.freeze(Object.fromEntries(entries));

export function selectAdapter(provider) {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new PlatformContractError(`no adapter registered for provider ${provider}`, {
      code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
    });
  }
  return adapter;
}
```

Note: `adapterUrl` uses four `..` segments because, after compilation, this module lives at `cli/dist/platform/adapters/registry.mjs` and the legacy projectors live at `<repo>/adapters/<provider>/projector.mjs`. This mirrors the two-segment path `cli/src/providers.mjs` uses from `cli/dist/providers.mjs`. The `new Function` dynamic import keeps `tsc` from resolving the out-of-`rootDir` path at build time.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test cli/test/platform-adapters.test.mjs`
Expected: PASS — 7 tests pass.

---

### Task 3: Legacy Parity Guard

**Files:**
- Test: `cli/test/platform-adapters.test.mjs` (append)

**Interfaces:**
- Consumes: `selectAdapter` (Task 2), `SUPPORTED_PROVIDERS` (already imported), and `projectProvider` from `cli/src/providers.mjs`.
- Produces: nothing new; this is a regression guard proving `transform()` equals the current legacy output for every provider and scope.

- [ ] **Step 1: Write the parity test**

Add this import to the top of `cli/test/platform-adapters.test.mjs` (after the existing imports):

```js
import { projectProvider } from "../src/providers.mjs";
```

Append this fixture and test to the end of `cli/test/platform-adapters.test.mjs`:

```js
function projectionInput(provider, scope) {
  return {
    schemaVersion: 1,
    provider,
    scope,
    plugins: [{ id: "application", version: "1.0.0" }],
    skills: [
      {
        id: "java-analyze",
        sourcePath: "plugins/application/skills/java-analyze",
        owners: ["application"],
      },
    ],
    commands: [
      {
        id: "application.review_backend",
        pluginId: "application",
        slug: "review-backend",
        description: "Review backend source code.",
        version: "1.0.0",
        intent: "Review backend.",
        inputs: ["source scope"],
        requiredSkills: ["java-analyze"],
        steps: ["Inspect source."],
        outputContract: ["summary"],
        sourcePath: "plugins/application/commands/review-backend.md",
        markdown: "# Review Backend",
        owners: ["application"],
      },
    ],
    agents: [
      {
        id: "java-analyze",
        sourcePath: "adapters/codex/agents/java-analyze.toml",
        owners: ["application"],
      },
    ],
    hooks: [],
    workflows: [],
    mcpServers: {},
  };
}

test("adapter transform output matches the legacy projector for every provider and scope", () => {
  for (const provider of SUPPORTED_PROVIDERS) {
    for (const scope of ["project", "global"]) {
      const adapter = selectAdapter(provider);
      const fromAdapter = adapter.transform({ input: projectionInput(provider, scope) });
      const fromLegacy = projectProvider(projectionInput(provider, scope));
      assert.deepEqual(
        fromAdapter,
        fromLegacy,
        `${provider}/${scope} drifted from legacy projector output`,
      );
    }
  }
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `node --test cli/test/platform-adapters.test.mjs`
Expected: PASS — 8 tests pass. (This guard passes immediately because `transform()` runs the same `validateProjectionInput -> project -> validateProjectionPlan` pipeline as `projectProvider`.)

---

### Task 4: Verification and Checkpoint Report

**Files:**
- None changed. This task runs validation and produces the milestone checkpoint.

- [ ] **Step 1: Build the CLI**

Run: `npm run build:cli`
Expected: PASS — `tsc -p cli/tsconfig.json` exits 0 with no errors. A failure here most likely means a projector was static-imported instead of loaded by URL; fix that in `registry.mjs`.

- [ ] **Step 2: Run the platform test suite**

Run: `node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs cli/test/platform-build.test.mjs cli/test/platform-adapters.test.mjs`
Expected: PASS — all platform tests pass (the prior 22 plus the 8 new adapter tests).

- [ ] **Step 3: Run the repository validation commands**

Run each and record the exact result:
- `npm test`
- `npm run validate`
- `npm run doctor`

Expected: the adapter work does not change public behavior. If `npm test`, `npm run validate`, or `npm run doctor` fails only because of the intentionally deleted docs baseline (the `D docs/...` entries in `git status`), mark it as an accepted external baseline and quote the exact failing check. Any failure that references `cli/src/platform/adapters/` is a real regression and must be fixed before the checkpoint.

- [ ] **Step 4: Write the checkpoint report in chat and stop**

Use this report format:

```markdown
**Phase Summary**
- Goal: Milestone 4 Adapter Contract.
- Completed: pure adapter wrapper factory, provider adapter registry with selectAdapter, legacy parity guard for all four providers.
- Changed files: cli/src/platform/adapters/adapter-factory.mjs, cli/src/platform/adapters/registry.mjs, cli/test/platform-adapters.test.mjs.
- Unchanged legacy areas: cli/src/cli.mjs, cli/src/providers.mjs, cli/src/projection-contracts.mjs, cli/src/provider-list.mjs, adapters/<provider>/projector.mjs.

**Validation Evidence**
- npm run build:cli: PASS or FAIL with exact error.
- node --test (4 platform test files): PASS or FAIL with exact error and counts.
- npm test: PASS or FAIL; if FAIL only due to deleted docs, mark accepted external baseline.
- npm run validate: PASS or FAIL; if FAIL only due to deleted docs, mark accepted external baseline.
- npm run doctor: PASS or FAIL; if FAIL only due to deleted docs, mark accepted external baseline.

**Spec Coverage Report**
| # | Spec Area | Status | Evidence |
| --- | --- | --- | --- |
| 4 | Core components | Implemented | Adapter responsibilities behind a four-method contract. |
| 10 | Adapter contract | Verified | validate/transform/package/publish per provider; contract test green. |
| 11 | CLI | Verified | Public CLI unchanged; no command routed to new adapters. |
| 14 | Compatibility | Verified | Parity test proves transform equals legacy projectProvider output. |

**Risk and Rollback**
- Residual risk: adapters are test-only and not yet routed; package/publish are pure and write nothing.
- Rollback path: delete cli/src/platform/adapters/ and cli/test/platform-adapters.test.mjs.
- Affected users: none until CLI routing (Milestone 5).

**Decision Request**
- Option 1: approve Milestone 4 and proceed to Milestone 5 (CLI routing) planning.
- Option 2: revise the package/publish shape before routing work.
- Option 3: pause and commit Milestones 1-4 before continuing.
```

- [ ] **Step 5: Stop and wait for approval**

Do not start Milestone 5 until the user explicitly approves the checkpoint.

---

## Self-Review

- **Spec coverage:** Decision 1 (wrapper-over-legacy) → Tasks 1-2 wrap `project()` via the factory. Decision 2 (module layout: factory + registry, no per-provider files) → Tasks 1-2 file set. Decision 3 (four-method semantics, `context = { input }`) → Task 1 factory. Decision 4 (all four providers) → Task 2 registry over `SUPPORTED_PROVIDERS` + parity loop in Task 3. Decision 5 (parity as proof) → Task 3 plus the package/publish/unknown-provider tests. Decision 6 (scope guards) → Global Constraints and the "unchanged legacy areas" checkpoint line. Milestone 4 exit criteria ("adapter contract tests pass for every supported provider", "existing smoke adapter tests remain green") → Task 2 contract test and Task 4 Steps 2-3.
- **Placeholder scan:** No `TBD`/`TODO`/"add error handling"/"similar to Task N". Every code step shows complete code; every run step shows the command and expected result. The one computed value (`sha256` of `"hello\n"`) is produced in-test with `createHash` rather than hardcoded.
- **Type consistency:** `createWrapperAdapter({ id, version, projector })`, the `{ input }` context, `transform` returning the projection plan, `package` returning `{ id, version, provider, scope, files, plan }`, `publish` returning `{ provider, scope, files }`, and `selectAdapter(provider)` are used identically across Tasks 1-3 and the tests. The public method name `package` (internal `packageArtifact`) is consistent. `PLATFORM_ERROR_CODES.INVALID_ADAPTER` is the single error code asserted for both provider mismatch and unknown-provider selection.
