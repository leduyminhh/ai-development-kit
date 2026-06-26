# Platform Resolver Lockfile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 2 of the Safe Greenfield refactor: a new platform resolver and deterministic lockfile generator beside the legacy CLI.

**Architecture:** Add new modules under `cli/src/platform/discovery/`, `cli/src/platform/resolver/`, and `cli/src/platform/lockfile/`. The new runtime reads current plugin manifests as source reference, normalizes them through Milestone 1 contracts, resolves requested plugins into a deterministic graph, deduplicates assets, and generates a lockfile shape that passes the Milestone 1 lockfile validator.

**Tech Stack:** Node.js ESM (`.mjs`), built-in `node:test`, built-in `assert/strict`, no new dependencies, existing `npm run build:cli`, and focused `node --test` commands. Full legacy `npm test`, `npm run validate`, and `npm run doctor` are allowed to fail while deleted docs are intentional.

---

## Scope

This plan implements only Milestone 2: resolver and lockfile. The old source code is reference-only. Do not route public CLI commands to the new runtime. Do not restore deleted docs. Do not modify legacy resolver behavior.

## Files

- Create: `cli/src/platform/discovery/discover-plugins.mjs` — discover and normalize plugins from `plugins/*/plugin.yaml`.
- Create: `cli/src/platform/resolver/compatibility.mjs` — minimal platform/provider compatibility helpers.
- Create: `cli/src/platform/resolver/dependency-graph.mjs` — deterministic dependency graph resolution with cycle/missing dependency detection.
- Create: `cli/src/platform/resolver/resolve-assets.mjs` — deduplicate selected plugin assets and ownership.
- Create: `cli/src/platform/resolver/resolve-platform.mjs` — public resolver orchestration for requested plugins/providers.
- Create: `cli/src/platform/lockfile/generate-lockfile.mjs` — deterministic lockfile generation from resolver output.
- Create: `cli/test/platform-resolver.test.mjs` — focused tests for discovery, resolution, assets, errors, and lockfile determinism.
- Modify: no legacy production module.

## Constraints

- Do not modify `cli/src/resolver.mjs`, `cli/src/contracts.mjs`, `cli/src/cli.mjs`, or adapter projectors.
- Do not restore intentionally deleted docs.
- Do not make full legacy validation a phase gate until the new runtime owns those checks.
- Do not commit unless the user explicitly asks.
- Stop after the checkpoint report and wait for approval before Milestone 3.

---

### Task 1: Discover Normalized Plugins

**Files:**
- Create: `cli/src/platform/discovery/discover-plugins.mjs`
- Create: `cli/test/platform-resolver.test.mjs`

- [ ] **Step 1: Create plugin discovery module**

Create `cli/src/platform/discovery/discover-plugins.mjs`:

```js
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { normalizePluginManifest } from "../contracts/plugin.mjs";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function discoverPlugins({ root }) {
  const pluginsRoot = path.join(root, "plugins");
  const entries = await readdir(pluginsRoot, { withFileTypes: true });
  const plugins = new Map();

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const manifestPath = path.join(pluginsRoot, entry.name, "plugin.yaml");
    const manifest = await readJson(manifestPath);
    const plugin = normalizePluginManifest(manifest);
    plugins.set(plugin.id, {
      ...plugin,
      root: path.join(pluginsRoot, entry.name),
      manifestPath,
    });
  }

  return new Map([...plugins].sort(([left], [right]) => left.localeCompare(right)));
}
```

- [ ] **Step 2: Add discovery tests**

Create `cli/test/platform-resolver.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { discoverPlugins } from "../src/platform/discovery/discover-plugins.mjs";
import { repoRoot } from "./helpers.mjs";

test("discovers normalized plugins in deterministic order", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  const pluginIds = [...plugins.keys()];

  assert.deepEqual(pluginIds, [...pluginIds].sort());
  assert.equal(plugins.has("application"), true);
  assert.equal(plugins.has("platform"), true);
  assert.equal(plugins.get("application").kind, "PlatformPlugin");
  assert.equal(plugins.get("application").manifestPath.endsWith("plugin.yaml"), true);
});
```

- [ ] **Step 3: Run focused tests**

Run: `npm run build:cli; node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs`

Expected: PASS. If PowerShell command sequencing behaves differently, run the two commands separately.

---

### Task 2: Add Compatibility Helpers

**Files:**
- Create: `cli/src/platform/resolver/compatibility.mjs`
- Modify: `cli/test/platform-resolver.test.mjs`

- [ ] **Step 1: Create compatibility module**

Create `cli/src/platform/resolver/compatibility.mjs`:

```js
import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";

export function isPlatformCompatible(range, version) {
  const major = Number(version.split(".")[0]);
  const minimum = range?.match(/>=([0-9]+)\./);
  const maximum = range?.match(/<([0-9]+)\./);
  return (
    (!minimum || major >= Number(minimum[1])) &&
    (!maximum || major < Number(maximum[1]))
  );
}

export function assertPluginCompatibility({ plugin, platformVersion, providers }) {
  assertCondition(
    isPlatformCompatible(plugin.compatibility?.platform, platformVersion),
    `plugin ${plugin.id} is incompatible with platform ${platformVersion}`,
    { code: PLATFORM_ERROR_CODES.INVALID_CONTRACT },
  );

  for (const provider of providers) {
    assertCondition(
      plugin.compatibility?.providers?.[provider] === "supported",
      `plugin ${plugin.id} does not support provider ${provider}`,
      { code: PLATFORM_ERROR_CODES.INVALID_CONTRACT },
    );
  }
}
```

- [ ] **Step 2: Add compatibility tests**

Append to `cli/test/platform-resolver.test.mjs`:

```js
import {
  assertPluginCompatibility,
  isPlatformCompatible,
} from "../src/platform/resolver/compatibility.mjs";

test("checks platform semver major range compatibility", () => {
  assert.equal(isPlatformCompatible(">=1.0.0 <2.0.0", "1.1.1"), true);
  assert.equal(isPlatformCompatible(">=1.0.0 <2.0.0", "2.0.0"), false);
});

test("rejects unsupported providers", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  const application = plugins.get("application");

  assert.throws(
    () =>
      assertPluginCompatibility({
        plugin: application,
        platformVersion: "1.0.0",
        providers: ["unknown-provider"],
      }),
    /does not support provider unknown-provider/,
  );
});
```

- [ ] **Step 3: Run focused tests**

Run: `npm run build:cli; node --test cli/test/platform-resolver.test.mjs`

Expected: PASS.

---

### Task 3: Resolve Dependency Graph

**Files:**
- Create: `cli/src/platform/resolver/dependency-graph.mjs`
- Modify: `cli/test/platform-resolver.test.mjs`

- [ ] **Step 1: Create dependency graph module**

Create `cli/src/platform/resolver/dependency-graph.mjs`:

```js
import {
  assertCondition,
  PLATFORM_ERROR_CODES,
} from "../errors/platform-error.mjs";
import { assertPluginCompatibility } from "./compatibility.mjs";

function uniqueSorted(values = []) {
  return [...new Set(values)].sort((left, right) => String(left).localeCompare(String(right)));
}

export function resolveDependencyGraph({ requested, optional = [], plugins, platformVersion, providers }) {
  const rootPlugins = uniqueSorted(requested);
  const optionalPlugins = uniqueSorted(optional);
  const allowedOptional = new Set(
    rootPlugins.flatMap((pluginId) => plugins.get(pluginId)?.dependencies?.optional ?? []),
  );

  for (const pluginId of optionalPlugins) {
    assertCondition(
      allowedOptional.has(pluginId),
      `plugin ${pluginId} is not an optional dependency of the selected roots`,
      { code: PLATFORM_ERROR_CODES.INVALID_CONTRACT },
    );
  }

  const resolved = [];
  const edges = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(pluginId, parentId = undefined) {
    const plugin = plugins.get(pluginId);
    assertCondition(plugin, `unknown plugin ${pluginId}`, {
      code: PLATFORM_ERROR_CODES.INVALID_CONTRACT,
    });
    assertCondition(!visiting.has(pluginId), `dependency cycle detected at ${pluginId}`, {
      code: PLATFORM_ERROR_CODES.INVALID_CONTRACT,
    });
    if (parentId) {
      edges.push({ from: parentId, to: pluginId, type: "required" });
    }
    if (visited.has(pluginId)) return;

    assertPluginCompatibility({ plugin, platformVersion, providers });
    visiting.add(pluginId);
    for (const dependencyId of uniqueSorted(plugin.dependencies?.required)) {
      visit(dependencyId, pluginId);
    }
    visiting.delete(pluginId);
    visited.add(pluginId);
    resolved.push(pluginId);
  }

  for (const pluginId of rootPlugins) visit(pluginId);
  for (const pluginId of optionalPlugins) visit(pluginId);

  return {
    pluginIds: resolved,
    edges: edges.sort((left, right) =>
      `${left.from}:${left.to}:${left.type}`.localeCompare(`${right.from}:${right.to}:${right.type}`),
    ),
  };
}
```

- [ ] **Step 2: Add dependency graph tests**

Append to `cli/test/platform-resolver.test.mjs`:

```js
import { resolveDependencyGraph } from "../src/platform/resolver/dependency-graph.mjs";

test("resolves required dependencies before requested plugins", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  const graph = resolveDependencyGraph({
    requested: ["application"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex"],
  });

  assert.deepEqual(graph.pluginIds, [
    "architecture",
    "data",
    "quality",
    "security",
    "application",
  ]);
  assert.equal(graph.edges.some((edge) => edge.from === "application" && edge.to === "quality"), true);
});

test("rejects unknown plugins and dependency cycles", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  assert.throws(
    () =>
      resolveDependencyGraph({
        requested: ["missing"],
        plugins,
        platformVersion: "1.0.0",
        providers: ["codex"],
      }),
    /unknown plugin missing/,
  );

  const cyclic = new Map([
    ["a", { id: "a", compatibility: { platform: ">=1.0.0 <2.0.0", providers: { codex: "supported" } }, dependencies: { required: ["b"] } }],
    ["b", { id: "b", compatibility: { platform: ">=1.0.0 <2.0.0", providers: { codex: "supported" } }, dependencies: { required: ["a"] } }],
  ]);
  assert.throws(
    () =>
      resolveDependencyGraph({
        requested: ["a"],
        plugins: cyclic,
        platformVersion: "1.0.0",
        providers: ["codex"],
      }),
    /dependency cycle detected at a/,
  );
});
```

- [ ] **Step 3: Run focused tests**

Run: `npm run build:cli; node --test cli/test/platform-resolver.test.mjs`

Expected: PASS.

---

### Task 4: Resolve Assets and Ownership

**Files:**
- Create: `cli/src/platform/resolver/resolve-assets.mjs`
- Modify: `cli/test/platform-resolver.test.mjs`

- [ ] **Step 1: Create asset resolver module**

Create `cli/src/platform/resolver/resolve-assets.mjs`:

```js
import { createAssetDescriptors } from "../contracts/asset.mjs";

export function resolveAssets({ pluginIds, plugins }) {
  const descriptorsById = new Map();
  const ownership = {};

  for (const pluginId of pluginIds) {
    const plugin = plugins.get(pluginId);
    for (const descriptor of createAssetDescriptors({ pluginId, assets: plugin.assets })) {
      descriptorsById.set(descriptor.id, descriptor);
      ownership[descriptor.id] = [...(ownership[descriptor.id] ?? []), pluginId].sort();
    }
  }

  const assets = [...descriptorsById.values()].sort((left, right) => left.id.localeCompare(right.id));
  return { assets, ownership };
}
```

- [ ] **Step 2: Add asset resolver tests**

Append to `cli/test/platform-resolver.test.mjs`:

```js
import { resolveAssets } from "../src/platform/resolver/resolve-assets.mjs";

test("resolves deterministic asset descriptors for selected plugins", async () => {
  const plugins = await discoverPlugins({ root: repoRoot });
  const graph = resolveDependencyGraph({
    requested: ["platform"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex"],
  });
  const result = resolveAssets({ pluginIds: graph.pluginIds, plugins });
  const ids = result.assets.map((asset) => asset.id);

  assert.deepEqual(ids, [...ids].sort());
  assert.equal(ids.some((id) => id.includes("platform:skills:incident-response")), true);
  assert.deepEqual(result.ownership["platform:skills:incident-response"], ["platform"]);
});
```

- [ ] **Step 3: Run focused tests**

Run: `npm run build:cli; node --test cli/test/platform-resolver.test.mjs`

Expected: PASS.

---

### Task 5: Orchestrate Resolver and Generate Lockfile

**Files:**
- Create: `cli/src/platform/resolver/resolve-platform.mjs`
- Create: `cli/src/platform/lockfile/generate-lockfile.mjs`
- Modify: `cli/test/platform-resolver.test.mjs`

- [ ] **Step 1: Create resolver orchestration module**

Create `cli/src/platform/resolver/resolve-platform.mjs`:

```js
import { discoverPlugins } from "../discovery/discover-plugins.mjs";
import { resolveDependencyGraph } from "./dependency-graph.mjs";
import { resolveAssets } from "./resolve-assets.mjs";

export async function resolvePlatform({ root, requested, optional = [], platformVersion, providers }) {
  const plugins = await discoverPlugins({ root });
  const graph = resolveDependencyGraph({ requested, optional, plugins, platformVersion, providers });
  const assetResult = resolveAssets({ pluginIds: graph.pluginIds, plugins });

  return {
    platformVersion,
    providers: [...providers].sort(),
    plugins,
    pluginIds: graph.pluginIds,
    graph: graph.edges,
    assets: assetResult.assets,
    ownership: assetResult.ownership,
  };
}
```

- [ ] **Step 2: Create lockfile generator module**

Create `cli/src/platform/lockfile/generate-lockfile.mjs`:

```js
import { validatePlatformLockfile } from "../contracts/lockfile.mjs";

export function generatePlatformLockfile(resolution) {
  const lockfile = {
    platformVersion: resolution.platformVersion,
    plugins: resolution.pluginIds.map((pluginId) => {
      const plugin = resolution.plugins.get(pluginId);
      return {
        id: plugin.id,
        version: plugin.version,
      };
    }),
    assets: resolution.assets.map((asset) => ({
      id: asset.id,
      pluginId: asset.pluginId,
      type: asset.type,
      path: asset.path,
    })),
    adapters: resolution.providers.map((provider) => ({
      id: provider,
      version: "1.0.0",
    })),
    graph: resolution.graph,
  };

  return validatePlatformLockfile(lockfile);
}
```

- [ ] **Step 3: Add resolver orchestration and lockfile tests**

Append to `cli/test/platform-resolver.test.mjs`:

```js
import { generatePlatformLockfile } from "../src/platform/lockfile/generate-lockfile.mjs";
import { resolvePlatform } from "../src/platform/resolver/resolve-platform.mjs";

test("resolves platform selection and generates deterministic lockfile", async () => {
  const firstResolution = await resolvePlatform({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
  });
  const secondResolution = await resolvePlatform({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
  });

  const firstLockfile = generatePlatformLockfile(firstResolution);
  const secondLockfile = generatePlatformLockfile(secondResolution);

  assert.deepEqual(firstLockfile, secondLockfile);
  assert.equal(firstLockfile.platformVersion, "1.0.0");
  assert.equal(firstLockfile.plugins.some((plugin) => plugin.id === "platform"), true);
  assert.equal(firstLockfile.adapters[0].id, "codex");
});
```

- [ ] **Step 4: Run focused tests**

Run: `npm run build:cli; node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs`

Expected: PASS.

---

### Task 6: Run Milestone 2 Validation Suite

**Files:**
- No new files.

- [ ] **Step 1: Run TypeScript build**

Run: `npm run build:cli`

Expected: PASS.

- [ ] **Step 2: Run focused platform tests**

Run: `node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs`

Expected: PASS.

- [ ] **Step 3: Run legacy full test for evidence only**

Run: `npm test`

Expected: may FAIL because docs were intentionally deleted before this phase. Record exact failures. Do not restore docs unless the user requests it.

- [ ] **Step 4: Run validate and doctor for evidence only**

Run: `npm run validate; npm run doctor`

Expected: may FAIL because docs were intentionally deleted before this phase. Record exact failures. Do not restore docs unless the user requests it.

---

### Task 7: Produce Mandatory Checkpoint Report and Stop

**Files:**
- No new files unless the user asks to save the report.

- [ ] **Step 1: Gather changed file list**

Run: `git status --short`

Expected: includes Milestone 1/2 platform files, plan/spec docs, and user-intentional deleted docs.

- [ ] **Step 2: Gather diff summary for platform files**

Run: `git diff --stat -- cli/src/platform cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs docs/superpowers/plans/2026-06-26-platform-resolver-lockfile.md`

Expected: shows platform runtime/test/plan files only for Milestone 2 scope.

- [ ] **Step 3: Write checkpoint report in chat**

Use the same 15-item report format defined in `docs/superpowers/specs/2026-06-26-platform-safe-greenfield-refactor-design.md`, with these Milestone 2 status expectations:

```markdown
**Phase Summary**
- Goal: Milestone 2 Resolver and Lockfile.
- Completed: plugin discovery, compatibility helpers, dependency graph, asset resolution, resolver orchestration, deterministic lockfile generation.
- Changed files: list exact files.
- Unchanged legacy areas: `cli/src/cli.mjs`, `cli/src/contracts.mjs`, `cli/src/resolver.mjs`, `cli/src/builder.mjs`, adapters.

**Validation Evidence**
- `npm run build:cli`: PASS or FAIL with exact error.
- `node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs`: PASS or FAIL with exact error.
- `npm test`: PASS or FAIL; if FAIL only due deleted docs, mark accepted external baseline.
- `npm run validate`: PASS or FAIL; if FAIL only due deleted docs, mark accepted external baseline.
- `npm run doctor`: PASS or FAIL; if FAIL only due deleted docs, mark accepted external baseline.

**Project Overview**
- Runtime split: legacy CLI remains active; new resolver is test-only.
- Compatibility: public binaries and command routing unchanged.
- Repository shape: `cli/src/platform/discovery`, `cli/src/platform/resolver`, and `cli/src/platform/lockfile` now exist.

**Spec Coverage Report**
| # | Spec Area | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Vision and goals | In Progress | Resolver models vendor-neutral plugin selection. |
| 2 | Core principles | In Progress | New source is isolated and metadata-driven. |
| 3 | High-level architecture | In Progress | Discovery, resolver, and lockfile boundaries introduced. |
| 4 | Core components | In Progress | Resolver component now exists beside Core/Plugin contracts. |
| 5 | Shared asset model | In Progress | Asset descriptors are deduped for resolved plugins. |
| 6 | Plugin specification | In Progress | Resolver consumes normalized plugin metadata/dependencies/compatibility. |
| 7 | Dependency resolution | Implemented | Missing plugin, cycle detection, provider/platform compatibility, deterministic ordering covered. |
| 8 | Build pipeline | Not Started | Build engine remains future Milestone 3. |
| 9 | Marketplace | Not Started | Marketplace unchanged. |
| 10 | Adapter contract | In Progress | Lockfile records selected provider adapter ids. |
| 11 | CLI | Verified | Public CLI unchanged. |
| 12 | Migration strategy | In Progress | Old source is reference-only; new resolver runs beside legacy. |
| 13 | Versioning | In Progress | Plugin versions and adapter versions appear in lockfile. |
| 14 | Compatibility | Verified | Existing manifests resolve through normalization. |
| 15 | Security and extensibility | In Progress | Deterministic lockfile prepares future checksum/trust fields. |

**Risk and Rollback**
- Residual risk: new resolver is test-only; full legacy validation still fails while docs are intentionally deleted.
- Rollback path: remove Milestone 2 files under `cli/src/platform/discovery`, `cli/src/platform/resolver`, `cli/src/platform/lockfile`, and `cli/test/platform-resolver.test.mjs`.
- Affected users: none until CLI routing changes.

**Decision Request**
- Option 1: approve Milestone 2 and proceed to Milestone 3 planning.
- Option 2: revise resolver/lockfile contract before build pipeline.
- Option 3: pause or stop refactor.
```

- [ ] **Step 4: Stop and wait for approval**

Do not start Milestone 3 until the user explicitly approves the checkpoint.
