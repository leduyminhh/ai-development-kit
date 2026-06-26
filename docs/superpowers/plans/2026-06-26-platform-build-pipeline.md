# Platform Build Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Milestone 3 of the Safe Greenfield refactor: provider-neutral platform build artifacts with deterministic file manifests, checksums, and verification.

**Architecture:** Add a new test-only platform build pipeline beside the legacy `cli/src/builder.mjs`. The new pipeline consumes Milestone 2 `resolvePlatform()` output, stages selected plugin assets into a provider-neutral artifact directory, writes a validated artifact manifest, writes checksums, and verifies artifact integrity without routing public CLI commands to it.

**Tech Stack:** Node.js ESM, `node:fs/promises`, `node:path`, `node:crypto`, existing platform contracts under `cli/src/platform`, and Node's built-in `node:test` runner.

---

## Scope

This plan implements only Milestone 3: build artifact generation, checksum generation, package-ready artifact layout, and artifact verification. Do not modify legacy `cli/src/builder.mjs`, public CLI routing, provider adapter projection logic, or deleted docs. Existing repository-wide validation may continue failing while docs are intentionally deleted; Milestone 3 validation is the focused platform build test suite plus `npm run build:cli`.

## Files

- Create: `cli/src/platform/build/list-artifact-files.mjs` — deterministic recursive file listing and SHA-256 helpers for staged artifact contents.
- Create: `cli/src/platform/build/stage-platform-artifact.mjs` — copy provider-neutral plugin asset files into a staging directory using resolved asset descriptors.
- Create: `cli/src/platform/build/build-platform-artifact.mjs` — orchestrate resolution, staging, manifest generation, checksum generation, and atomic output replacement.
- Create: `cli/src/platform/build/verify-platform-artifact.mjs` — verify manifest shape, expected files, and checksums.
- Create: `cli/test/platform-build.test.mjs` — focused Milestone 3 tests for deterministic artifact output and checksum verification.
- Modify: `cli/src/platform/contracts/artifact.mjs` — validate artifact manifest fields needed by build output while preserving existing contract tests.

## Constraints

- Keep the new runtime isolated under `cli/src/platform/`; no public CLI route should call it in this milestone.
- Use TDD for each behavior: write the failing test, run it, implement the smallest code, run it again.
- Keep artifact output deterministic: sorted files, stable JSON key order, no timestamps, no machine-local absolute paths in manifests.
- Copy only assets declared in normalized plugin manifests and resolved by Milestone 2.
- Fail loud on missing source assets and checksum mismatches.
- Do not restore or modify deleted docs as part of this milestone.

---

### Task 1: Add Artifact File Helpers

**Files:**
- Create: `cli/src/platform/build/list-artifact-files.mjs`
- Test: `cli/test/platform-build.test.mjs`

- [ ] **Step 1: Write the failing file listing test**

Append this import block to `cli/test/platform-build.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { listArtifactFiles, sha256File } from "../src/platform/build/list-artifact-files.mjs";
```

Add this test:

```js
test("lists artifact files in deterministic relative order", async () => {
  const root = await mkdir(path.join(tmpdir(), "platform-build-list-"), { recursive: true });
  await mkdir(path.join(root, "b"), { recursive: true });
  await mkdir(path.join(root, "a"), { recursive: true });
  await writeFile(path.join(root, "b", "two.txt"), "two", "utf8");
  await writeFile(path.join(root, "a", "one.txt"), "one", "utf8");

  assert.deepEqual(await listArtifactFiles(root), ["a/one.txt", "b/two.txt"]);
  assert.equal(await sha256File(path.join(root, "a", "one.txt")), "7692c3ad3540bb803c020bce0ec2fe8cb5f98a8b5ef4b73d084b5110a9c221f0");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test cli/test/platform-build.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `cli/src/platform/build/list-artifact-files.mjs`.

- [ ] **Step 3: Implement deterministic file helpers**

Create `cli/src/platform/build/list-artifact-files.mjs`:

```js
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export async function listArtifactFiles(root, current = "") {
  const directory = path.join(root, current);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listArtifactFiles(root, relative));
    } else if (entry.isFile()) {
      files.push(relative.replaceAll(path.sep, "/"));
    }
  }

  return files;
}

export async function sha256File(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test cli/test/platform-build.test.mjs`

Expected: PASS for `lists artifact files in deterministic relative order`.

---

### Task 2: Stage Provider-Neutral Assets

**Files:**
- Create: `cli/src/platform/build/stage-platform-artifact.mjs`
- Modify: `cli/test/platform-build.test.mjs`

- [ ] **Step 1: Write the failing staging test**

Add imports:

```js
import { readFile } from "node:fs/promises";
import { stagePlatformArtifact } from "../src/platform/build/stage-platform-artifact.mjs";
import { resolvePlatform } from "../src/platform/resolver/resolve-platform.mjs";
import { repoRoot } from "./helpers.mjs";
```

Add this test:

```js
test("stages provider-neutral files for resolved plugin assets", async () => {
  const outputRoot = await mkdir(path.join(tmpdir(), "platform-build-stage-"), { recursive: true });
  const resolution = await resolvePlatform({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
  });

  await stagePlatformArtifact({ root: repoRoot, resolution, stagedRoot: outputRoot });

  const files = await listArtifactFiles(outputRoot);
  assert.equal(files.includes("plugins/platform/plugin.yaml"), true);
  assert.equal(files.includes("plugins/platform/skills/incident-response/SKILL.md"), true);
  assert.equal(files.includes("plugins/platform/commands/respond-incident.md"), true);
  assert.match(await readFile(path.join(outputRoot, "plugins/platform/plugin.yaml"), "utf8"), /Platform Engineering/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test cli/test/platform-build.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `stage-platform-artifact.mjs`.

- [ ] **Step 3: Implement staging**

Create `cli/src/platform/build/stage-platform-artifact.mjs`:

```js
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

function sourcePathForAsset({ root, asset }) {
  if (asset.type === "skills") return path.join(root, "plugins", asset.pluginId, "skills", asset.path);
  return path.join(root, "plugins", asset.pluginId, asset.path);
}

export async function stagePlatformArtifact({ root, resolution, stagedRoot }) {
  for (const pluginId of resolution.pluginIds) {
    await cp(
      path.join(root, "plugins", pluginId, "plugin.yaml"),
      path.join(stagedRoot, "plugins", pluginId, "plugin.yaml"),
    );
  }

  for (const asset of resolution.assets) {
    const source = sourcePathForAsset({ root, asset });
    const destination = path.join(stagedRoot, "plugins", asset.pluginId, asset.type, asset.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test cli/test/platform-build.test.mjs`

Expected: PASS for the staging test.

---

### Task 3: Strengthen Artifact Manifest Contract

**Files:**
- Modify: `cli/src/platform/contracts/artifact.mjs`
- Modify: `cli/test/platform-contracts.test.mjs`

- [ ] **Step 1: Write the failing contract test**

Add to `cli/test/platform-contracts.test.mjs` near the existing artifact contract test:

```js
test("build artifact contract validates checksum metadata", () => {
  const artifact = validateBuildArtifactManifest({
    apiVersion: "ai-engineering.dev/v1alpha1",
    kind: "PlatformBuildArtifact",
    id: "platform",
    version: "1.0.0",
    platformVersion: "1.0.0",
    plugins: [{ id: "platform", version: "1.0.0" }],
    files: [{ path: "artifact.json", sha256: "a".repeat(64) }],
    checksums: { algorithm: "sha256", files: { "artifact.json": "a".repeat(64) } },
  });

  assert.equal(artifact.checksums.algorithm, "sha256");
  assert.throws(
    () => validateBuildArtifactManifest({ apiVersion: "ai-engineering.dev/v1alpha1", kind: "PlatformBuildArtifact", id: "x", version: "1", files: [], checksums: { algorithm: "md5", files: {} } }),
    /artifact checksums algorithm must be sha256/,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test cli/test/platform-contracts.test.mjs`

Expected: FAIL because `validateBuildArtifactManifest()` does not validate `checksums.algorithm` yet.

- [ ] **Step 3: Implement manifest validation**

Modify `cli/src/platform/contracts/artifact.mjs` so `validateBuildArtifactManifest()` includes these assertions after the existing `files` assertion:

```js
  assertCondition(typeof artifact.platformVersion === "string" && artifact.platformVersion.length > 0, "artifact platformVersion is required", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(Array.isArray(artifact.plugins), "artifact plugins must be an array", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(artifact.checksums && typeof artifact.checksums === "object" && !Array.isArray(artifact.checksums), "artifact checksums must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(artifact.checksums.algorithm === "sha256", "artifact checksums algorithm must be sha256", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
  assertCondition(artifact.checksums.files && typeof artifact.checksums.files === "object" && !Array.isArray(artifact.checksums.files), "artifact checksum files must be an object", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });
```

- [ ] **Step 4: Run contract tests**

Run: `node --test cli/test/platform-contracts.test.mjs`

Expected: PASS for all platform contract tests.

---

### Task 4: Build Deterministic Platform Artifact

**Files:**
- Create: `cli/src/platform/build/build-platform-artifact.mjs`
- Modify: `cli/test/platform-build.test.mjs`

- [ ] **Step 1: Write the failing build test**

Add imports:

```js
import { buildPlatformArtifact } from "../src/platform/build/build-platform-artifact.mjs";
```

Add this test:

```js
test("builds deterministic provider-neutral platform artifact", async () => {
  const outputRoot = await mkdir(path.join(tmpdir(), "platform-build-output-"), { recursive: true });

  const first = await buildPlatformArtifact({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
    outputRoot,
  });
  const second = await buildPlatformArtifact({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
    outputRoot,
  });

  assert.equal(first.path, second.path);
  assert.deepEqual(first.manifest, second.manifest);
  assert.equal(first.manifest.kind, "PlatformBuildArtifact");
  assert.equal(first.manifest.files.some((file) => file.path === "artifact.json"), true);
  assert.equal(first.manifest.files.some((file) => file.path === "checksums.json"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test cli/test/platform-build.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `build-platform-artifact.mjs`.

- [ ] **Step 3: Implement build orchestration**

Create `cli/src/platform/build/build-platform-artifact.mjs`:

```js
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { validateBuildArtifactManifest } from "../contracts/artifact.mjs";
import { generatePlatformLockfile } from "../lockfile/generate-lockfile.mjs";
import { resolvePlatform } from "../resolver/resolve-platform.mjs";
import { listArtifactFiles, sha256File } from "./list-artifact-files.mjs";
import { stagePlatformArtifact } from "./stage-platform-artifact.mjs";

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function buildChecksums(stagedRoot) {
  const files = {};
  for (const relative of await listArtifactFiles(stagedRoot)) {
    if (relative !== "checksums.json") {
      files[relative] = await sha256File(path.join(stagedRoot, relative));
    }
  }
  return { algorithm: "sha256", files };
}

export async function buildPlatformArtifact({ root, requested, optional = [], platformVersion, providers, outputRoot }) {
  const resolution = await resolvePlatform({ root, requested, optional, platformVersion, providers });
  const lockfile = generatePlatformLockfile(resolution);
  const artifactId = requested.slice().sort((left, right) => left.localeCompare(right)).join("+");
  const artifactPath = path.join(outputRoot, artifactId, platformVersion);
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "platform-artifact-"));

  try {
    await stagePlatformArtifact({ root, resolution, stagedRoot: temporaryRoot });
    await writeJson(path.join(temporaryRoot, "lockfile.json"), lockfile);

    let checksums = await buildChecksums(temporaryRoot);
    const manifest = validateBuildArtifactManifest({
      apiVersion: "ai-engineering.dev/v1alpha1",
      kind: "PlatformBuildArtifact",
      id: artifactId,
      version: platformVersion,
      platformVersion,
      plugins: lockfile.plugins,
      files: Object.entries(checksums.files).map(([filePath, sha256]) => ({ path: filePath, sha256 })),
      checksums,
    });
    await writeJson(path.join(temporaryRoot, "artifact.json"), manifest);

    checksums = await buildChecksums(temporaryRoot);
    await writeJson(path.join(temporaryRoot, "checksums.json"), checksums);
    const finalManifest = validateBuildArtifactManifest({
      ...manifest,
      files: Object.entries(checksums.files).map(([filePath, sha256]) => ({ path: filePath, sha256 })),
      checksums,
    });
    await writeJson(path.join(temporaryRoot, "artifact.json"), finalManifest);

    await rm(artifactPath, { recursive: true, force: true });
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await import("node:fs/promises").then(({ cp }) => cp(temporaryRoot, artifactPath, { recursive: true }));
    return { id: artifactId, version: platformVersion, path: artifactPath, manifest: finalManifest };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Run build test**

Run: `node --test cli/test/platform-build.test.mjs`

Expected: PASS for deterministic build output.

---

### Task 5: Verify Platform Artifact Checksums

**Files:**
- Create: `cli/src/platform/build/verify-platform-artifact.mjs`
- Modify: `cli/test/platform-build.test.mjs`

- [ ] **Step 1: Write the failing verification test**

Add imports:

```js
import { verifyPlatformArtifact } from "../src/platform/build/verify-platform-artifact.mjs";
```

Add this test:

```js
test("verifies artifact checksums and rejects tampering", async () => {
  const outputRoot = await mkdir(path.join(tmpdir(), "platform-build-verify-"), { recursive: true });
  const built = await buildPlatformArtifact({
    root: repoRoot,
    requested: ["platform"],
    platformVersion: "1.0.0",
    providers: ["codex"],
    outputRoot,
  });

  assert.equal((await verifyPlatformArtifact({ artifactRoot: built.path })).status, "pass");

  await writeFile(path.join(built.path, "plugins/platform/plugin.yaml"), "tampered", "utf8");
  await assert.rejects(
    () => verifyPlatformArtifact({ artifactRoot: built.path }),
    /checksum mismatch for plugins\/platform\/plugin.yaml/,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test cli/test/platform-build.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `verify-platform-artifact.mjs`.

- [ ] **Step 3: Implement artifact verification**

Create `cli/src/platform/build/verify-platform-artifact.mjs`:

```js
import { readFile } from "node:fs/promises";
import path from "node:path";

import { validateBuildArtifactManifest } from "../contracts/artifact.mjs";
import { assertCondition, PLATFORM_ERROR_CODES } from "../errors/platform-error.mjs";
import { listArtifactFiles, sha256File } from "./list-artifact-files.mjs";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function verifyPlatformArtifact({ artifactRoot }) {
  const manifest = validateBuildArtifactManifest(await readJson(path.join(artifactRoot, "artifact.json")));
  const checksums = await readJson(path.join(artifactRoot, "checksums.json"));
  assertCondition(checksums.algorithm === "sha256", "artifact checksums algorithm must be sha256", {
    code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
  });

  const files = (await listArtifactFiles(artifactRoot)).filter((relative) => relative !== "checksums.json");
  for (const relative of files) {
    const expected = checksums.files[relative];
    assertCondition(typeof expected === "string", `missing checksum for ${relative}`, {
      code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
    });
    const actual = await sha256File(path.join(artifactRoot, relative));
    assertCondition(actual === expected, `checksum mismatch for ${relative}`, {
      code: PLATFORM_ERROR_CODES.INVALID_ARTIFACT,
    });
  }

  return { status: "pass", manifest, fileCount: files.length };
}
```

- [ ] **Step 4: Run verification test**

Run: `node --test cli/test/platform-build.test.mjs`

Expected: PASS for checksum verification and tamper rejection.

---

### Task 6: Run Milestone 3 Validation Suite

**Files:**
- No code changes.

- [ ] **Step 1: Run focused platform tests**

Run: `node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs cli/test/platform-build.test.mjs`

Expected: PASS with platform contract, resolver, and build tests all green.

- [ ] **Step 2: Run build**

Run: `npm run build:cli`

Expected: PASS with TypeScript compilation exit `0`.

- [ ] **Step 3: Run repository checks and record baseline failures**

Run:

```powershell
npm test
npm run validate
npm run doctor
```

Expected during current branch state: these may FAIL only because docs are intentionally deleted: `docs/README.md`, `docs/README_VI.md`, and `docs/migration/completion-checklist.md`. If any new failure mentions `cli/src/platform/build`, `platform-build.test.mjs`, artifact manifest shape, or checksum verification, stop and fix Milestone 3.

---

### Task 7: Produce Mandatory Checkpoint Report and Stop

**Files:**
- No code changes.

- [ ] **Step 1: Gather final status**

Run: `git status --short`

Expected: includes Milestone 3 files plus existing Milestone 1/2 files and user-intentional deleted docs.

- [ ] **Step 2: Gather Milestone 3 diff summary**

Run: `git diff --stat -- cli/src/platform cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs cli/test/platform-build.test.mjs docs/superpowers/plans/2026-06-26-platform-build-pipeline.md`

Expected: shows platform build runtime/test/plan files only for Milestone 3 scope.

- [ ] **Step 3: Write checkpoint report in chat**

Use this report format:

```markdown
**Phase Summary**
- Goal: Milestone 3 Build Pipeline.
- Completed: provider-neutral staging, deterministic artifact manifest, checksum generation, artifact verification.
- Changed files: list exact files.
- Unchanged legacy areas: `cli/src/cli.mjs`, `cli/src/contracts.mjs`, `cli/src/resolver.mjs`, `cli/src/builder.mjs`, adapters.

**Validation Evidence**
- `npm run build:cli`: PASS or FAIL with exact error.
- `node --test cli/test/platform-contracts.test.mjs cli/test/platform-resolver.test.mjs cli/test/platform-build.test.mjs`: PASS or FAIL with exact error.
- `npm test`: PASS or FAIL; if FAIL only due deleted docs, mark accepted external baseline.
- `npm run validate`: PASS or FAIL; if FAIL only due deleted docs, mark accepted external baseline.
- `npm run doctor`: PASS or FAIL; if FAIL only due deleted docs, mark accepted external baseline.

**Spec Coverage Report**
| # | Spec Area | Status | Evidence |
| --- | --- | --- | --- |
| 8 | Build pipeline | Implemented | Artifact staging, manifest, checksums, verification tests. |
| 11 | CLI | Verified | Public CLI unchanged. |
| 12 | Migration strategy | In Progress | Build runtime remains isolated beside legacy builder. |
| 15 | Security and extensibility | In Progress | SHA-256 verification rejects tampering. |

**Risk and Rollback**
- Residual risk: new build pipeline is test-only; full legacy validation still fails while docs are intentionally deleted.
- Rollback path: remove files under `cli/src/platform/build` and `cli/test/platform-build.test.mjs`, then revert artifact contract additions if no longer needed.
- Affected users: none until CLI routing changes.

**Decision Request**
- Option 1: approve Milestone 3 and proceed to Milestone 4 planning.
- Option 2: revise artifact layout or checksum contract before adapter work.
- Option 3: pause and repair deleted docs baseline first.
```

- [ ] **Step 4: Stop and wait for approval**

Do not start Milestone 4 until the user explicitly approves the checkpoint.

---

## Self-Review

- Spec coverage: Milestone 3 deliverables are covered by Tasks 2, 4, and 5; exit criteria are covered by Tasks 4, 5, and 6.
- Placeholder scan: no `TBD`, vague edge-case steps, or unspecified tests remain.
- Type consistency: `resolvePlatform()`, `generatePlatformLockfile()`, `validateBuildArtifactManifest()`, `buildPlatformArtifact()`, and `verifyPlatformArtifact()` signatures are used consistently across tasks.
- Scope check: plan does not route public CLI commands and does not repair unrelated deleted docs.