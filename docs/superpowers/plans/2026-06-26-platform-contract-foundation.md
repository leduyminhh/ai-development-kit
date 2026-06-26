# Platform Contract Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 1 of the Safe Greenfield refactor: a new platform contract foundation beside the legacy CLI without changing public command behavior.

**Architecture:** Add focused modules under `cli/src/platform/` for platform errors, manifest normalization, asset metadata helpers, adapter contract validation, lockfile shape validation, artifact shape validation, and read-only platform validation. Existing legacy modules remain untouched except for optional tests importing the new modules directly.

**Tech Stack:** Node.js ESM (`.mjs`), built-in `node:test`, built-in `assert/strict`, existing TypeScript build with `allowJs`, existing repository scripts `npm run build:cli`, `npm test`, `npm run validate`, and `npm run doctor`.

---

## Scope

This plan implements only Milestone 1 from `docs/superpowers/specs/2026-06-26-platform-safe-greenfield-refactor-design.md`.

It does not route CLI commands to the new runtime, does not delete legacy files, does not modify provider adapters, and does not mutate plugin manifests.

## Files

- Create: `cli/src/platform/errors/platform-error.mjs` — platform-next error class and stable error codes.
- Create: `cli/src/platform/contracts/plugin.mjs` — normalize current `AiIdePlugin` manifests into a platform plugin contract.
- Create: `cli/src/platform/contracts/asset.mjs` — normalize asset lists and create asset descriptors.
- Create: `cli/src/platform/contracts/adapter.mjs` — validate adapter contract objects expose required functions.
- Create: `cli/src/platform/contracts/lockfile.mjs` — validate platform lockfile shape for future resolver work.
- Create: `cli/src/platform/contracts/artifact.mjs` — validate build artifact manifest shape for future build work.
- Create: `cli/src/platform/validation/validate-platform-contracts.mjs` — read-only validation entry for plugin manifests and platform contracts.
- Create: `cli/test/platform-contracts.test.mjs` — focused tests for manifest normalization, asset descriptors, adapter contracts, lockfile/artifact validation, and repository plugin validation.
- Modify: no production legacy module should be modified in this milestone.
- Modify only if required by tests: `cli/test/platform-contracts.test.mjs` imports new modules directly.

## Constraints

- Do not modify `cli/src/cli.mjs`, `cli/src/contracts.mjs`, `cli/src/resolver.mjs`, `cli/src/builder.mjs`, or provider projector files in Milestone 1.
- Do not change public command output or routing.
- Do not commit changes unless the user explicitly asks for a commit.
- Stop after the checkpoint report and wait for user approval before Milestone 2.

---

### Task 1: Add Platform Error Foundation

**Files:**
- Create: `cli/src/platform/errors/platform-error.mjs`
- Test: `cli/test/platform-contracts.test.mjs`

- [ ] **Step 1: Create the error module**

Create `cli/src/platform/errors/platform-error.mjs` with this content:

```js
export const PLATFORM_ERROR_CODES = Object.freeze({
  INVALID_CONTRACT: "PLATFORM_INVALID_CONTRACT",
  INVALID_ADAPTER: "PLATFORM_INVALID_ADAPTER",
  INVALID_LOCKFILE: "PLATFORM_INVALID_LOCKFILE",
  INVALID_ARTIFACT: "PLATFORM_INVALID_ARTIFACT",
});

export class PlatformContractError extends Error {
  constructor(message, { code = PLATFORM_ERROR_CODES.INVALID_CONTRACT, details = [] } = {}) {
    super(message);
    this.name = "PlatformContractError";
    this.code = code;
    this.details = details;
  }
}

export function assertCondition(condition, message, options = {}) {
  if (!condition) {
    throw new PlatformContractError(message, options);
  }
}
```

- [ ] **Step 2: Add initial test imports**

Create `cli/test/platform-contracts.test.mjs` with this content:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCondition,
  PlatformContractError,
  PLATFORM_ERROR_CODES,
} from "../src/platform/errors/platform-error.mjs";

test("platform contract errors include stable code and details", () => {
  assert.throws(
    () =>
      assertCondition(false, "broken contract", {
        code: PLATFORM_ERROR_CODES.INVALID_CONTRACT,
        details: ["metadata.id is required"],
      }),
    (error) => {
      assert.equal(error instanceof PlatformContractError, true);
      assert.equal(error.code, "PLATFORM_INVALID_CONTRACT");
      assert.deepEqual(error.details, ["metadata.id is required"]);
      return true;
    },
  );
});
```

- [ ] **Step 3: Run focused test**

Run: `npm run build:cli && node --test cli/test/platform-contracts.test.mjs`

Expected: PASS with one test file executed.

---

### Task 2: Add Asset Contract Helpers

**Files:**
- Create: `cli/src/platform/contracts/asset.mjs`
- Modify: `cli/test/platform-contracts.test.mjs`

- [ ] **Step 1: Add asset contract module**

Create `cli/src/platform/contracts/asset.mjs` with this content:

```js
import { assertCondition } from "../errors/platform-error.mjs";

export const PLATFORM_ASSET_TYPES = Object.freeze([
  "skills",
  "prompts",
  "commands",
  "templates",
  "rules",
  "workflows",
  "snippets",
  "agents",
  "hooks",
  "schemas",
]);

export function normalizeAssetList(value) {
  if (value === undefined || value === null || value === "none") return [];
  assertCondition(Array.isArray(value), "asset declaration must be an array or \"none\"");
  return [...value].sort((left, right) => String(left).localeCompare(String(right)));
}

export function normalizeAssets(assets = {}) {
  const normalized = {};
  for (const type of PLATFORM_ASSET_TYPES) {
    normalized[type] = normalizeAssetList(assets[type]);
  }
  return normalized;
}

export function createAssetDescriptors({ pluginId, assets }) {
  const normalized = normalizeAssets(assets);
  const descriptors = [];
  for (const [type, values] of Object.entries(normalized)) {
    for (const value of values) {
      descriptors.push({
        id: `${pluginId}:${type}:${value}`,
        pluginId,
        type,
        path: value,
      });
    }
  }
  return descriptors.sort((left, right) => left.id.localeCompare(right.id));
}
```

- [ ] **Step 2: Extend tests for asset normalization**

Append this import to `cli/test/platform-contracts.test.mjs`:

```js
import {
  createAssetDescriptors,
  normalizeAssetList,
  normalizeAssets,
} from "../src/platform/contracts/asset.mjs";
```

Append these tests to `cli/test/platform-contracts.test.mjs`:

```js
test("asset lists normalize none and sort deterministic arrays", () => {
  assert.deepEqual(normalizeAssetList("none"), []);
  assert.deepEqual(normalizeAssetList(["z", "a"]), ["a", "z"]);
});

test("assets normalize every platform asset bucket", () => {
  const assets = normalizeAssets({
    skills: ["java-implement"],
    commands: "none",
    workflows: ["workflows/feature.yaml"],
  });

  assert.deepEqual(assets.skills, ["java-implement"]);
  assert.deepEqual(assets.commands, []);
  assert.deepEqual(assets.prompts, []);
  assert.deepEqual(assets.workflows, ["workflows/feature.yaml"]);
});

test("asset descriptors include plugin id, type, path, and deterministic id", () => {
  const descriptors = createAssetDescriptors({
    pluginId: "application",
    assets: {
      skills: ["react-implement"],
      commands: ["commands/plan-feature.md"],
    },
  });

  assert.deepEqual(descriptors, [
    {
      id: "application:commands:commands/plan-feature.md",
      pluginId: "application",
      type: "commands",
      path: "commands/plan-feature.md",
    },
    {
      id: "application:skills:react-implement",
      pluginId: "application",
      type: "skills",
      path: "react-implement",
    },
  ]);
});
```

- [ ] **Step 3: Run focused test**

Run: `npm run build:cli && node --test cli/test/platform-contracts.test.mjs`

Expected: PASS with asset tests included.

---

### Task 3: Add Plugin Manifest Normalization

**Files:**
- Create: `cli/src/platform/contracts/plugin.mjs`
- Modify: `cli/test/platform-contracts.test.mjs`

- [ ] **Step 1: Add plugin contract module**

Create `cli/src/platform/contracts/plugin.mjs` with this content:

```js
import { normalizeAssets } from "./asset.mjs";
import { assertCondition } from "../errors/platform-error.mjs";

export const SUPPORTED_PLUGIN_API_VERSIONS = Object.freeze([
  "ai-engineering.dev/v1alpha1",
]);

function normalizeDependencyList(value) {
  if (value === undefined || value === null) return [];
  assertCondition(Array.isArray(value), "plugin dependencies must be arrays");
  return [...value].sort((left, right) => String(left).localeCompare(String(right)));
}

function normalizeProviderCompatibility(providers = {}) {
  return Object.fromEntries(
    Object.entries(providers).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function normalizePluginManifest(manifest) {
  assertCondition(manifest && typeof manifest === "object" && !Array.isArray(manifest), "plugin manifest must be an object");
  assertCondition(SUPPORTED_PLUGIN_API_VERSIONS.includes(manifest.apiVersion), "unsupported plugin apiVersion");
  assertCondition(manifest.kind === "AiIdePlugin", "unsupported plugin kind");
  assertCondition(typeof manifest.metadata?.id === "string" && manifest.metadata.id.length > 0, "plugin metadata.id is required");
  assertCondition(typeof manifest.metadata?.name === "string" && manifest.metadata.name.length > 0, "plugin metadata.name is required");
  assertCondition(typeof manifest.metadata?.version === "string" && manifest.metadata.version.length > 0, "plugin metadata.version is required");

  const required = normalizeDependencyList(manifest.dependencies?.required);
  const optional = normalizeDependencyList(manifest.dependencies?.optional);
  const legacyDependsOn = normalizeDependencyList(manifest.depends_on?.plugins);
  const requiredSet = new Set([...required, ...legacyDependsOn]);

  return {
    apiVersion: manifest.apiVersion,
    kind: "PlatformPlugin",
    sourceKind: manifest.kind,
    id: manifest.metadata.id,
    name: manifest.metadata.name,
    version: manifest.metadata.version,
    description: manifest.metadata.description ?? "",
    metadata: { ...manifest.metadata },
    compatibility: {
      platform: manifest.compatibility?.platform ?? "",
      providers: normalizeProviderCompatibility(manifest.compatibility?.providers),
    },
    dependencies: {
      required: [...requiredSet].sort((left, right) => left.localeCompare(right)),
      optional,
    },
    assets: normalizeAssets(manifest.assets),
    install: manifest.install ?? {},
    category: manifest.category ?? "",
    displayName: manifest.displayName ?? manifest.metadata.name,
    developerName: manifest.developerName ?? "",
    triggers: manifest.triggers ?? {},
    source: manifest,
  };
}
```

- [ ] **Step 2: Extend tests for plugin normalization**

Append this import to `cli/test/platform-contracts.test.mjs`:

```js
import { normalizePluginManifest } from "../src/platform/contracts/plugin.mjs";
```

Append these tests to `cli/test/platform-contracts.test.mjs`:

```js
const APPLICATION_MANIFEST = {
  apiVersion: "ai-engineering.dev/v1alpha1",
  kind: "AiIdePlugin",
  metadata: {
    id: "application",
    name: "Application Engineering",
    version: "1.0.0",
    description: "Application workflows.",
  },
  compatibility: {
    platform: ">=1.0.0 <2.0.0",
    providers: {
      cursor: "supported",
      codex: "supported",
    },
  },
  dependencies: {
    required: ["quality"],
    optional: ["security"],
  },
  depends_on: {
    plugins: ["architecture"],
  },
  assets: {
    skills: ["react-implement"],
    commands: ["commands/plan-feature.md"],
    rules: "none",
  },
  install: {
    defaultScope: "project",
    supportsCopy: true,
    supportsLink: true,
  },
  category: "ai-ide-plugin",
  displayName: "Application Engineering",
  developerName: "AI Engineering Platform",
};

test("plugin manifests normalize legacy AiIdePlugin shape into platform plugin contract", () => {
  const plugin = normalizePluginManifest(APPLICATION_MANIFEST);

  assert.equal(plugin.kind, "PlatformPlugin");
  assert.equal(plugin.sourceKind, "AiIdePlugin");
  assert.equal(plugin.id, "application");
  assert.deepEqual(plugin.dependencies.required, ["architecture", "quality"]);
  assert.deepEqual(plugin.dependencies.optional, ["security"]);
  assert.deepEqual(Object.keys(plugin.compatibility.providers), ["codex", "cursor"]);
  assert.deepEqual(plugin.assets.rules, []);
  assert.deepEqual(plugin.assets.skills, ["react-implement"]);
});

test("plugin manifests reject missing identity fields", () => {
  assert.throws(
    () => normalizePluginManifest({ ...APPLICATION_MANIFEST, metadata: { id: "" } }),
    /plugin metadata.id is required/,
  );
});
```

- [ ] **Step 3: Run focused test**

Run: `npm run build:cli && node --test cli/test/platform-contracts.test.mjs`

Expected: PASS with plugin normalization tests included.

---

### Task 4: Add Adapter, Lockfile, and Artifact Contracts

**Files:**
- Create: `cli/src/platform/contracts/adapter.mjs`
- Create: `cli/src/platform/contracts/lockfile.mjs`
- Create: `cli/src/platform/contracts/artifact.mjs`
- Modify: `cli/test/platform-contracts.test.mjs`

- [ ] **Step 1: Add adapter contract module**

Create `cli/src/platform/contracts/adapter.mjs` with this content:

```js
import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

export const ADAPTER_METHODS = Object.freeze([
  "validate",
  "transform",
  "package",
  "publish",
]);

export function validateAdapterContract(adapter) {
  assertCondition(adapter && typeof adapter === "object", "adapter contract must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  assertCondition(typeof adapter.id === "string" && adapter.id.length > 0, "adapter id is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  assertCondition(typeof adapter.version === "string" && adapter.version.length > 0, "adapter version is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
  });
  for (const method of ADAPTER_METHODS) {
    assertCondition(typeof adapter[method] === "function", `adapter ${adapter.id} must implement ${method}()`, {
      code: PLATFORM_ERROR_CODES.INVALID_ADAPTER,
    });
  }
  return adapter;
}
```

- [ ] **Step 2: Add lockfile contract module**

Create `cli/src/platform/contracts/lockfile.mjs` with this content:

```js
import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

export function validatePlatformLockfile(lockfile) {
  assertCondition(lockfile && typeof lockfile === "object" && !Array.isArray(lockfile), "platform lockfile must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(typeof lockfile.platformVersion === "string" && lockfile.platformVersion.length > 0, "lockfile platformVersion is required", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(Array.isArray(lockfile.plugins), "lockfile plugins must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(Array.isArray(lockfile.assets), "lockfile assets must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(Array.isArray(lockfile.adapters), "lockfile adapters must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  assertCondition(Array.isArray(lockfile.graph), "lockfile graph must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_LOCKFILE,
  });
  return lockfile;
}
```

- [ ] **Step 3: Add artifact contract module**

Create `cli/src/platform/contracts/artifact.mjs` with this content:

```js
import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

export function validateBuildArtifactManifest(artifact) {
  assertCondition(artifact && typeof artifact === "object" && !Array.isArray(artifact), "build artifact manifest must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(typeof artifact.apiVersion === "string" && artifact.apiVersion.length > 0, "artifact apiVersion is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(artifact.kind === "PlatformBuildArtifact", "artifact kind must be PlatformBuildArtifact", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(typeof artifact.id === "string" && artifact.id.length > 0, "artifact id is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(typeof artifact.version === "string" && artifact.version.length > 0, "artifact version is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(Array.isArray(artifact.files), "artifact files must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  return artifact;
}
```

- [ ] **Step 4: Extend tests for adapter, lockfile, and artifact contracts**

Append these imports to `cli/test/platform-contracts.test.mjs`:

```js
import { validateAdapterContract } from "../src/platform/contracts/adapter.mjs";
import { validateBuildArtifactManifest } from "../src/platform/contracts/artifact.mjs";
import { validatePlatformLockfile } from "../src/platform/contracts/lockfile.mjs";
```

Append these tests to `cli/test/platform-contracts.test.mjs`:

```js
test("adapter contract requires validate transform package and publish functions", () => {
  const adapter = {
    id: "codex",
    version: "1.0.0",
    validate() {},
    transform() {},
    package() {},
    publish() {},
  };

  assert.equal(validateAdapterContract(adapter), adapter);
  assert.throws(
    () => validateAdapterContract({ ...adapter, publish: undefined }),
    /adapter codex must implement publish\(\)/,
  );
});

test("platform lockfile contract validates future resolver output shape", () => {
  const lockfile = {
    platformVersion: "1.0.0",
    plugins: [],
    assets: [],
    adapters: [],
    graph: [],
  };

  assert.equal(validatePlatformLockfile(lockfile), lockfile);
  assert.throws(
    () => validatePlatformLockfile({ ...lockfile, graph: undefined }),
    /lockfile graph must be an array/,
  );
});

test("build artifact contract validates future package output shape", () => {
  const artifact = {
    apiVersion: "ai-engineering.dev/v1alpha1",
    kind: "PlatformBuildArtifact",
    id: "application",
    version: "1.0.0",
    files: [],
  };

  assert.equal(validateBuildArtifactManifest(artifact), artifact);
  assert.throws(
    () => validateBuildArtifactManifest({ ...artifact, kind: "PluginArtifact" }),
    /artifact kind must be PlatformBuildArtifact/,
  );
});
```

- [ ] **Step 5: Run focused test**

Run: `npm run build:cli && node --test cli/test/platform-contracts.test.mjs`

Expected: PASS with adapter, lockfile, and artifact tests included.

---

### Task 5: Add Read-Only Platform Contract Validation

**Files:**
- Create: `cli/src/platform/validation/validate-platform-contracts.mjs`
- Modify: `cli/test/platform-contracts.test.mjs`

- [ ] **Step 1: Add platform validation module**

Create `cli/src/platform/validation/validate-platform-contracts.mjs` with this content:

```js
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { createAssetDescriptors } from "../contracts/asset.mjs";
import { normalizePluginManifest } from "../contracts/plugin.mjs";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function validatePlatformContracts({ root }) {
  const pluginsRoot = path.join(root, "plugins");
  const entries = await readdir(pluginsRoot, { withFileTypes: true });
  const plugins = [];
  const assets = [];

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const manifestPath = path.join(pluginsRoot, entry.name, "plugin.yaml");
    const manifest = await readJson(manifestPath);
    const plugin = normalizePluginManifest(manifest);
    plugins.push(plugin);
    assets.push(...createAssetDescriptors({ pluginId: plugin.id, assets: plugin.assets }));
  }

  plugins.sort((left, right) => left.id.localeCompare(right.id));
  assets.sort((left, right) => left.id.localeCompare(right.id));

  return {
    status: "pass",
    pluginCount: plugins.length,
    assetCount: assets.length,
    pluginIds: plugins.map((plugin) => plugin.id),
    assetIds: assets.map((asset) => asset.id),
  };
}
```

- [ ] **Step 2: Extend tests for repository validation**

Append these imports to `cli/test/platform-contracts.test.mjs`:

```js
import { validatePlatformContracts } from "../src/platform/validation/validate-platform-contracts.mjs";
import { repoRoot } from "./helpers.mjs";
```

Append this test to `cli/test/platform-contracts.test.mjs`:

```js
test("repository plugin manifests pass platform contract normalization", async () => {
  const result = await validatePlatformContracts({ root: repoRoot });

  assert.equal(result.status, "pass");
  assert.equal(result.pluginIds.includes("application"), true);
  assert.equal(result.pluginIds.includes("platform"), true);
  assert.equal(result.pluginCount > 0, true);
  assert.equal(result.assetCount > 0, true);
});
```

- [ ] **Step 3: Run focused test**

Run: `npm run build:cli && node --test cli/test/platform-contracts.test.mjs`

Expected: PASS and repository manifests normalize without changing files.

---

### Task 6: Run Milestone 1 Validation Suite

**Files:**
- No new files.

- [ ] **Step 1: Run TypeScript build**

Run: `npm run build:cli`

Expected: PASS. If it fails, fix only errors caused by files added in this milestone.

- [ ] **Step 2: Run focused platform contract tests**

Run: `node --test cli/test/platform-contracts.test.mjs`

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run: `npm test`

Expected: PASS. If unrelated pre-existing tests fail, capture exact failing tests and do not fix unrelated behavior without approval.

- [ ] **Step 4: Run repository validation**

Run: `npm run validate`

Expected: PASS. If validation fails because of pre-existing repository state, report exact diagnostics and stop.

- [ ] **Step 5: Run doctor**

Run: `npm run doctor`

Expected: PASS. If doctor reports environment-specific warnings, record them in the checkpoint report.

---

### Task 7: Produce Mandatory Checkpoint Report and Stop

**Files:**
- No new files unless the user asks to save the report.

- [ ] **Step 1: Gather changed file list**

Run: `git status --short`

Expected: includes only the Milestone 1 new files plus pre-existing user changes already present before execution.

- [ ] **Step 2: Gather diff summary for milestone files**

Run: `git diff --stat -- cli/src/platform cli/test/platform-contracts.test.mjs docs/superpowers/plans/2026-06-26-platform-contract-foundation.md docs/superpowers/specs/2026-06-26-platform-safe-greenfield-refactor-design.md`

Expected: shows only planned files for this milestone and the existing design/plan docs.

- [ ] **Step 3: Write checkpoint report in chat**

Use this exact report structure:

```markdown
**Phase Summary**
- Goal: Milestone 1 Platform Contract Foundation.
- Completed: platform contract modules, manifest normalization, read-only validation, focused tests.
- Changed files: list exact files.
- Unchanged legacy areas: `cli/src/cli.mjs`, `cli/src/contracts.mjs`, `cli/src/resolver.mjs`, `cli/src/builder.mjs`, adapters.

**Validation Evidence**
- `npm run build:cli`: PASS or FAIL with exact error.
- `node --test cli/test/platform-contracts.test.mjs`: PASS or FAIL with exact error.
- `npm test`: PASS or FAIL with exact error.
- `npm run validate`: PASS or FAIL with exact error.
- `npm run doctor`: PASS or FAIL with exact error.
- Skipped checks: list none or exact reason.

**Project Overview**
- Runtime split: legacy CLI remains active; new platform modules are imported only by tests.
- Compatibility: public binaries and command routing unchanged.
- Repository shape: new `cli/src/platform/` foundation exists beside legacy implementation.

**Spec Coverage Report**
| # | Spec Area | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Vision and goals | In Progress | New contracts preserve vendor-neutral platform model. |
| 2 | Core principles | In Progress | Non-invasive greenfield modules added beside legacy code. |
| 3 | High-level architecture | In Progress | `cli/src/platform/` boundary introduced. |
| 4 | Core components | In Progress | Plugin, asset, adapter, lockfile, and artifact contracts introduced. |
| 5 | Shared asset model | In Progress | Asset normalization covers skills, prompts, commands, templates, rules, workflows, snippets, agents, hooks, schemas. |
| 6 | Plugin specification | In Progress | `AiIdePlugin` manifests normalize into `PlatformPlugin`. |
| 7 | Dependency resolution | Not Started | Resolver graph remains legacy and unchanged. |
| 8 | Build pipeline | Not Started | Build engine remains legacy and unchanged. |
| 9 | Marketplace | Not Started | Marketplace not changed in Milestone 1. |
| 10 | Adapter contract | In Progress | Adapter method contract validation introduced. |
| 11 | CLI | Verified | Public CLI routing unchanged by this milestone. |
| 12 | Migration strategy | In Progress | Compatibility normalization added without mutating manifests. |
| 13 | Versioning | In Progress | Plugin and adapter version fields are required by contracts. |
| 14 | Compatibility | Verified | Existing manifests remain readable; legacy runtime unchanged. |
| 15 | Security and extensibility | In Progress | Contract boundaries prepare checksum/trust/extensibility work; no security behavior changed. |

**Risk and Rollback**
- Residual risk: new modules are unused by CLI, so runtime risk is low; test-only imports may need adjustment if module paths change.
- Rollback path: remove `cli/src/platform/` and `cli/test/platform-contracts.test.mjs`.
- Affected users: none until routing changes in later milestones.

**Decision Request**
- Option 1: approve Milestone 1 and proceed to Milestone 2 planning.
- Option 2: request revisions to contracts before resolver work.
- Option 3: pause or stop the refactor.
```

- [ ] **Step 4: Stop and wait for approval**

Do not start Milestone 2 until the user explicitly approves the checkpoint.
