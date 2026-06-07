# AI Engineering Platform Plugin Distribution v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and distribute every current package as an independently installable plugin, with an `aiep` CLI that installs, updates, and removes one plugin or the full AI Engineering Platform for Codex, Claude Code, and Cursor.

**Architecture:** Add a Node.js 20 ESM CLI and library under `platform/`, while retaining the existing repository-local Python runtime during migration. Canonical package manifests and commands are compiled into immutable plugin artifacts; registry, dependency resolution, provider projection, ownership, and transaction modules remain isolated and communicate through JSON contracts.

**Tech Stack:** Node.js 20 ESM, built-in `node:test`, npm workspaces, JSON Schema, PowerShell compatibility tests, SHA-256, npm package archives, GitHub Release archives.

---

## Delivery Boundaries

This plan is split into four independently verifiable increments:

1. **Canonical source contracts:** package manifests, commands, schemas, and validation.
2. **Build and registry:** deterministic plugin artifacts, checksums, npm packages, and registry metadata.
3. **Lifecycle CLI:** install, update, remove, conflict detection, ownership, and rollback.
4. **Distribution and compatibility:** provider integration tests, npm/GitHub packaging, documentation, and release verification.

The first three increments run entirely against local fixtures. Network publication is not required for test completion; release tests inspect generated npm and GitHub archives locally.

## File Map

### Root configuration

- Create `package.json`: npm package metadata, `aiep` executable, scripts, Node engine, and workspace declaration.
- Create `platform/package.json`: private implementation package for CLI and test imports.
- Modify `aidk.config.yaml`: migrate product identity to `ai-engineering-platform` and retain the current provider/package list.
- Modify `.gitignore`: ignore `dist/`, `.aiep/`, npm packs, and transaction staging directories.
- Modify `.codex/test-map.toml`: register the platform test suite under one `test.core.platform` group.

### Contracts and source packages

- Modify `schemas/package.schema.json`: change AIDK package contract into the AIEP plugin source contract and add commands.
- Create `schemas/plugin-artifact.schema.json`: validate built `plugin.json`.
- Create `schemas/platform-lock.schema.json`: validate `.aiep/platform.lock`.
- Create `schemas/ownership.schema.json`: validate `.aiep/ownership.json`.
- Modify `schemas/install-state.schema.json`: represent the last successful AIEP transaction.
- Modify `packages/*/package.yaml`: use `aiep.dev/v1alpha1`, `kind: Plugin`, platform compatibility, and canonical commands.
- Create `packages/*/commands/*.md`: at least one provider-neutral canonical command per plugin.

### Node implementation

- Create `platform/src/errors.mjs`: typed operational errors and stable exit codes.
- Create `platform/src/io.mjs`: JSON loading, atomic writes, hashing, path containment, and recursive file listing.
- Create `platform/src/contracts.mjs`: load and validate platform config, plugin sources, command frontmatter, and artifact manifests.
- Create `platform/src/resolver.mjs`: deterministic dependency resolution and shared asset deduplication.
- Create `platform/src/providers.mjs`: Codex, Claude Code, and Cursor projections.
- Create `platform/src/builder.mjs`: build immutable plugin directories and checksum manifests.
- Create `platform/src/registry.mjs`: generate/read registry entries and resolve artifact sources.
- Create `platform/src/archive.mjs`: create and safely extract `.tgz` archives with traversal rejection.
- Create `platform/src/state.mjs`: lock, ownership, and install-state models.
- Create `platform/src/transaction.mjs`: stage, validate, apply, back up, and rollback file changes.
- Create `platform/src/lifecycle.mjs`: install, update, remove, list, and outdated orchestration.
- Create `platform/src/cli.mjs`: argument parsing, command routing, JSON output, and human-readable output.
- Create `platform/bin/aiep.mjs`: executable launcher.

### Build outputs and registry

- Create `registry/registry.json`: canonical registry index.
- Create `registry/plugins/*.json`: generated plugin version and source entries.
- Generate `dist/plugins/<id>/<version>/`: immutable expanded artifacts.
- Generate `dist/npm/<id>/`: npm package staging directories.
- Generate `dist/releases/*.tgz`: GitHub Release-compatible archives.

### Tests

- Create `platform/test/helpers.mjs`: temporary repository/project fixtures and command runner.
- Create `platform/test/contracts.test.mjs`: source and command validation tests.
- Create `platform/test/resolver.test.mjs`: dependency and deduplication tests.
- Create `platform/test/providers.test.mjs`: provider projection tests.
- Create `platform/test/builder.test.mjs`: artifact and checksum tests.
- Create `platform/test/registry.test.mjs`: registry generation and source fallback tests.
- Create `platform/test/security.test.mjs`: path traversal and root-containment tests.
- Create `platform/test/transaction.test.mjs`: conflict and rollback tests.
- Create `platform/test/lifecycle.test.mjs`: install/update/remove tests.
- Create `platform/test/cli.test.mjs`: executable command contract tests.
- Create `scripts/test-aiep-platform.ps1`: cross-platform-compatible repository test entry point.

## Task 1: Establish the npm CLI Skeleton

**Files:**
- Create: `package.json`
- Create: `platform/package.json`
- Create: `platform/bin/aiep.mjs`
- Create: `platform/src/cli.mjs`
- Create: `platform/src/errors.mjs`
- Create: `platform/test/cli.test.mjs`
- Create: `platform/test/helpers.mjs`
- Create: `scripts/test-aiep-platform.ps1`
- Modify: `.gitignore`
- Modify: `.codex/test-map.toml`

- [ ] **Step 1: Write the failing CLI smoke test**

Create a `node:test` case that executes:

```js
const result = await runCli(["--version"]);
assert.equal(result.exitCode, 0);
assert.match(result.stdout, /^1\.0\.0\s*$/);
assert.equal(result.stderr, "");
```

Add a second case:

```js
const result = await runCli(["--help"]);
assert.equal(result.exitCode, 0);
assert.match(result.stdout, /aiep plugin install/);
assert.match(result.stdout, /aiep update --all/);
```

- [ ] **Step 2: Run the smoke test and verify it fails**

Run:

```powershell
node --test platform/test/cli.test.mjs
```

Expected: FAIL because `platform/bin/aiep.mjs` does not exist.

- [ ] **Step 3: Add the minimal executable package**

Define root metadata:

```json
{
  "name": "ai-engineering-platform",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "aiep": "./platform/bin/aiep.mjs"
  },
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "test": "node --test platform/test/*.test.mjs",
    "build": "node platform/src/cli.mjs build --all",
    "validate": "node platform/src/cli.mjs validate"
  },
  "workspaces": [
    "platform"
  ],
  "files": [
    "platform",
    "schemas",
    "registry",
    "LICENSE",
    "README.md"
  ],
  "license": "MIT"
}
```

Implement `aiep.mjs` as a thin call to `run(process.argv.slice(2))`. Implement stable help/version responses and an `AiepError` carrying `code`, `exitCode`, and `details`.

- [ ] **Step 4: Register the selected test entry point**

Add exactly one `.codex/test-map.toml` group:

```toml
[test.core.platform]
paths = [
  "package.json",
  "platform",
  "packages",
  "registry",
  "schemas",
  "scripts/test-aiep-platform.ps1"
]
commands = [
  "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-aiep-platform.ps1"
]
```

The PowerShell entry point must run `npm test` and return its exit code.

- [ ] **Step 5: Verify the skeleton**

Run:

```powershell
npm test -- --test-name-pattern="version|help"
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-test-map.ps1
```

Expected: both commands PASS.

- [ ] **Step 6: Commit**

```powershell
git add package.json platform scripts/test-aiep-platform.ps1 .gitignore .codex/test-map.toml
git commit -m "feat(platform): add aiep cli skeleton"
```

## Task 2: Migrate Canonical Plugin and Command Contracts

**Files:**
- Modify: `aidk.config.yaml`
- Modify: `schemas/package.schema.json`
- Create: `schemas/plugin-artifact.schema.json`
- Create: `schemas/platform-lock.schema.json`
- Create: `schemas/ownership.schema.json`
- Modify: `schemas/install-state.schema.json`
- Modify: `packages/architecture/package.yaml`
- Modify: `packages/backend/package.yaml`
- Modify: `packages/documentation/package.yaml`
- Modify: `packages/frontend/package.yaml`
- Modify: `packages/security/package.yaml`
- Modify: `packages/testing/package.yaml`
- Create: `packages/architecture/commands/review-architecture.md`
- Create: `packages/backend/commands/review-backend.md`
- Create: `packages/documentation/commands/write-technical-doc.md`
- Create: `packages/frontend/commands/implement-frontend.md`
- Create: `packages/security/commands/review-security.md`
- Create: `packages/testing/commands/verify-quality.md`
- Create: `platform/src/contracts.mjs`
- Create: `platform/test/contracts.test.mjs`
- Modify: `scripts/lib/aidk_core.py`
- Modify: `scripts/test-aidk-core.ps1`

- [ ] **Step 1: Write failing contract tests**

Test these invariants:

```js
assert.equal(platform.product.name, "ai-engineering-platform");
assert.equal(plugin.apiVersion, "aiep.dev/v1alpha1");
assert.equal(plugin.kind, "Plugin");
assert.ok(plugin.assets.skills.length > 0);
assert.ok(plugin.assets.commands.length > 0);
assert.equal(command.id, plugin.assets.commands[0]);
assert.ok(command.requiredSkills.every((skill) => plugin.assets.skills.includes(skill)));
```

Add rejection cases for an unknown skill, missing command file, provider-specific path inside command content, duplicate command ID, unknown dependency, and required dependency cycle.

- [ ] **Step 2: Run contract tests and verify failure**

Run:

```powershell
node --test platform/test/contracts.test.mjs
```

Expected: FAIL because AIEP contracts and command files do not exist.

- [ ] **Step 3: Implement source loaders and validators**

`contracts.mjs` must export:

```js
export async function loadPlatform(root) {}
export async function loadPlugins(root) {}
export async function loadCanonicalCommand(path) {}
export async function validateRepository(root) {}
export async function validateArtifactManifest(value) {}
```

Use the repository's JSON-compatible `.yaml` format, reject additional unrecognized top-level contract keys, and return sorted error messages.

- [ ] **Step 4: Migrate all six package manifests**

For every package:

```json
{
  "apiVersion": "aiep.dev/v1alpha1",
  "kind": "Plugin",
  "compatibility": {
    "platform": ">=1.0.0 <2.0.0"
  },
  "assets": {
    "skills": ["..."],
    "commands": ["..."],
    "agents": ["..."],
    "hooks": ["..."]
  }
}
```

Keep existing dependencies and asset ownership. Replace `workflows` with `commands`.

- [ ] **Step 5: Add one canonical command to every plugin**

Each command must have frontmatter keys `id`, `description`, and `version`, followed by `Intent`, `Inputs`, `Required Skills`, `Steps`, and `Output Contract`. Commands must reference only skills declared by their owning plugin.

- [ ] **Step 6: Verify canonical contracts**

Run:

```powershell
node --test platform/test/contracts.test.mjs
node platform/bin/aiep.mjs validate --json
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-aidk-core.ps1
```

Update the legacy Python reader in this task to accept `aiep.dev/v1alpha1`,
`kind: Plugin`, `compatibility.platform`, and `assets.commands`. Keep its
existing actions and output fields stable.

Expected: Node and legacy compatibility tests PASS and validation returns:

```json
{"status":"pass","pluginCount":6,"providerCount":3}
```

- [ ] **Step 7: Commit**

```powershell
git add aidk.config.yaml schemas packages platform/src/contracts.mjs platform/test/contracts.test.mjs scripts/lib/aidk_core.py scripts/test-aidk-core.ps1
git commit -m "feat(platform): define canonical plugin contracts"
```

## Task 3: Implement Deterministic Dependency Resolution

**Files:**
- Create: `platform/src/resolver.mjs`
- Create: `platform/test/resolver.test.mjs`

- [ ] **Step 1: Write failing resolver tests**

Cover:

```js
assert.deepEqual(resolve(["backend"], plugins).pluginIds, ["architecture", "backend"]);
assert.equal(result.skills.filter((id) => id === "code-shared-design").length, 1);
assert.deepEqual(resolve(["security", "backend"], plugins).pluginIds, [
  "architecture",
  "backend",
  "security"
]);
```

Also assert that optional dependencies are excluded unless requested, cycles fail before output generation, unknown IDs fail, and incompatible platform/provider ranges return `AIEP_INCOMPATIBLE`.

- [ ] **Step 2: Run resolver tests and verify failure**

Run:

```powershell
node --test platform/test/resolver.test.mjs
```

Expected: FAIL because `resolvePluginGraph` is missing.

- [ ] **Step 3: Implement the resolver**

Export:

```js
export function resolvePluginGraph({
  requested,
  plugins,
  platformVersion,
  providers
}) {}
```

Return sorted `pluginIds`, `skills`, `commands`, `agents`, `hooks`, `providers`, and an ownership reference map. Use depth-first dependency traversal with explicit `visiting` and `visited` sets. Do not install optional dependencies implicitly.

- [ ] **Step 4: Verify deterministic output**

Run the resolver test ten times:

```powershell
1..10 | ForEach-Object { node --test platform/test/resolver.test.mjs }
```

Expected: all runs PASS with identical snapshots.

- [ ] **Step 5: Commit**

```powershell
git add platform/src/resolver.mjs platform/test/resolver.test.mjs
git commit -m "feat(platform): resolve plugin dependency graphs"
```

## Task 4: Generate Provider-Neutral Projections

**Files:**
- Create: `platform/src/providers.mjs`
- Create: `platform/test/providers.test.mjs`

- [ ] **Step 1: Write failing provider tests**

For one canonical command, assert:

```js
assert.equal(codex.manifest.provider, "codex");
assert.match(codex.workflow, /review-backend/);
assert.match(claude.command, /^---[\s\S]*description:/);
assert.match(cursor.rule, /Required Skills/);
assert.deepEqual(
  [codex.intent, claude.intent, cursor.intent],
  [command.intent, command.intent, command.intent]
);
```

Assert every provider output uses relative paths and contains no writes outside its staging root.

- [ ] **Step 2: Run provider tests and verify failure**

Run:

```powershell
node --test platform/test/providers.test.mjs
```

Expected: FAIL because provider projectors are missing.

- [ ] **Step 3: Implement three adapters**

Export:

```js
export function projectCodex(context) {}
export function projectClaude(context) {}
export function projectCursor(context) {}
export function projectProviders(context) {}
```

Generate:

- Codex: `adapters/codex/provider.json`, workflow references, agent metadata, and hook configuration.
- Claude Code: `adapters/claude/provider.json`, `.claude/commands/<id>.md`, agents, and hook metadata.
- Cursor: `adapters/cursor/provider.json`, `.cursor/rules/<id>.mdc`, skills, and hook metadata.

Keep command intent, required skills, steps, and output contract semantically identical.

- [ ] **Step 4: Verify projections**

Run:

```powershell
node --test platform/test/providers.test.mjs
```

Expected: PASS for all three providers.

- [ ] **Step 5: Commit**

```powershell
git add platform/src/providers.mjs platform/test/providers.test.mjs
git commit -m "feat(platform): add provider plugin projections"
```

## Task 5: Build Immutable Plugin Artifacts

**Files:**
- Create: `platform/src/io.mjs`
- Create: `platform/src/builder.mjs`
- Create: `platform/test/builder.test.mjs`
- Create: `platform/test/security.test.mjs`

- [ ] **Step 1: Write failing artifact tests**

Build `backend` and assert:

```js
assert.ok(await exists("dist/plugins/backend/1.0.0/plugin.json"));
assert.ok(await exists("dist/plugins/backend/1.0.0/commands/review-backend.md"));
assert.ok(await exists("dist/plugins/backend/1.0.0/skills/java-analyze/SKILL.md"));
assert.ok(await exists("dist/plugins/backend/1.0.0/adapters/codex/provider.json"));
assert.ok(await exists("dist/plugins/backend/1.0.0/adapters/claude/provider.json"));
assert.ok(await exists("dist/plugins/backend/1.0.0/adapters/cursor/provider.json"));
assert.deepEqual(firstChecksums, secondChecksums);
```

Security tests must reject `../escape`, absolute paths, drive-qualified paths, symlink escapes, missing assets, and modified files after checksums are generated.

- [ ] **Step 2: Run builder and security tests and verify failure**

Run:

```powershell
node --test platform/test/builder.test.mjs platform/test/security.test.mjs
```

Expected: FAIL because builder and safe I/O functions are missing.

- [ ] **Step 3: Implement safe I/O primitives**

`io.mjs` must export:

```js
export async function sha256File(path) {}
export async function listFiles(root) {}
export function resolveInside(root, relativePath) {}
export async function writeJsonAtomic(path, value) {}
export async function replaceDirectoryAtomic(staged, destination) {}
```

`resolveInside` must reject any path whose resolved value is not inside `root`.

- [ ] **Step 4: Implement artifact build**

`builder.mjs` must:

1. Validate the repository.
2. Resolve one plugin and required dependencies.
3. Copy declared skills, commands, agents, and hooks.
4. Generate all provider manifests.
5. Write `plugin.json` and `manifest.lock`.
6. Hash every file except `checksums.json`.
7. Write sorted `checksums.json`.
8. Replace the destination only after staging validates.

- [ ] **Step 5: Verify all six builds**

Run:

```powershell
node platform/bin/aiep.mjs build --all --json
node --test platform/test/builder.test.mjs platform/test/security.test.mjs
```

Expected: six artifacts built and all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add platform/src/io.mjs platform/src/builder.mjs platform/test/builder.test.mjs platform/test/security.test.mjs
git commit -m "feat(platform): build immutable plugin artifacts"
```

Do not commit generated `dist/` contents.

## Task 6: Generate Registry and Equivalent Distribution Archives

**Files:**
- Create: `platform/src/archive.mjs`
- Create: `platform/src/registry.mjs`
- Create: `platform/test/registry.test.mjs`
- Create: `registry/registry.json`
- Create: `registry/plugins/architecture.json`
- Create: `registry/plugins/backend.json`
- Create: `registry/plugins/documentation.json`
- Create: `registry/plugins/frontend.json`
- Create: `registry/plugins/security.json`
- Create: `registry/plugins/testing.json`

- [ ] **Step 1: Write failing registry tests**

Assert:

```js
assert.deepEqual(registry.plugins.map((item) => item.id), [
  "architecture",
  "backend",
  "documentation",
  "frontend",
  "security",
  "testing"
]);
assert.equal(entry.npm.package, "@ai-engineering-platform/plugin-backend");
assert.match(entry.github.url, /ai-engineering-platform-backend-1\.0\.0\.tgz$/);
assert.deepEqual(npmManifest.integrity, githubManifest.integrity);
```

Add a source-resolution test where npm lookup fails with an unavailable-source error and GitHub succeeds. Integrity mismatch must never trigger fallback.

- [ ] **Step 2: Run registry tests and verify failure**

Run:

```powershell
node --test platform/test/registry.test.mjs
```

Expected: FAIL because registry generation is missing.

- [ ] **Step 3: Implement safe archive operations**

Use the `tar` npm dependency only in `platform/package.json`. Export:

```js
export async function createPluginArchive({ source, destination }) {}
export async function extractPluginArchive({ archive, destination }) {}
```

Inspect every archive entry before extraction and reject absolute or parent-traversal paths.

- [ ] **Step 4: Implement registry generation**

Generate sorted registry JSON from built artifacts. Each version entry must include:

```json
{
  "version": "1.0.0",
  "platform": ">=1.0.0 <2.0.0",
  "providers": ["codex", "claude", "cursor"],
  "dependencies": ["architecture"],
  "npm": {
    "package": "@ai-engineering-platform/plugin-backend",
    "integrity": "sha256-..."
  },
  "github": {
    "url": "https://github.com/leduyminhh/ai-engineering-platform/releases/download/v1.0.0/ai-engineering-platform-backend-1.0.0.tgz",
    "integrity": "sha256-..."
  }
}
```

- [ ] **Step 5: Verify archive equivalence**

Run:

```powershell
node platform/bin/aiep.mjs build --all
node platform/bin/aiep.mjs registry generate
node --test platform/test/registry.test.mjs
```

Expected: registry tests PASS and npm/GitHub expanded artifact checksums match.

- [ ] **Step 6: Commit**

```powershell
git add platform/src/archive.mjs platform/src/registry.mjs platform/test/registry.test.mjs registry platform/package.json package-lock.json
git commit -m "feat(platform): generate plugin registry artifacts"
```

## Task 7: Add Lock, Ownership, and Transaction State

**Files:**
- Create: `platform/src/state.mjs`
- Create: `platform/src/transaction.mjs`
- Create: `platform/test/transaction.test.mjs`

- [ ] **Step 1: Write failing transaction tests**

Test:

```js
assert.equal(await exists(".aiep/platform.lock"), false);
await transaction.apply();
assert.equal(await exists(".aiep/platform.lock"), true);
assert.equal(ownership.files["skills/java-analyze/SKILL.md"].shared, true);
```

Then inject a failure after destination backup and assert original bytes and prior state are restored. Add unmanaged-file conflict, managed drift, explicit `force`, and interrupted-state cleanup cases.

- [ ] **Step 2: Run transaction tests and verify failure**

Run:

```powershell
node --test platform/test/transaction.test.mjs
```

Expected: FAIL because state and transaction modules are missing.

- [ ] **Step 3: Implement state contracts**

Export:

```js
export async function readPlatformState(root) {}
export function createPlatformLock(input) {}
export function createOwnership(input) {}
export function createInstallState(input) {}
export async function validatePlatformState(root) {}
```

State paths are fixed:

```text
.aiep/platform.lock
.aiep/ownership.json
.aiep/install-state.json
.aiep/cache/
```

- [ ] **Step 4: Implement transaction planning and apply**

Export:

```js
export async function planTransaction(input) {}
export async function applyTransaction(plan) {}
```

The plan must classify every file as `create`, `replace-managed`, `retain-shared`, `remove-managed`, or `conflict`. Apply order is stage, validate, back up, materialize, validate destination, write ownership/lock, write install-state last, then remove backup.

- [ ] **Step 5: Verify rollback and conflict behavior**

Run:

```powershell
node --test platform/test/transaction.test.mjs
```

Expected: PASS, with no `.aiep/install-state.json` written for failed transactions.

- [ ] **Step 6: Commit**

```powershell
git add platform/src/state.mjs platform/src/transaction.mjs platform/test/transaction.test.mjs schemas
git commit -m "feat(platform): add transactional plugin state"
```

## Task 8: Implement Project-Local Installation

**Files:**
- Create: `platform/src/lifecycle.mjs`
- Create: `platform/test/lifecycle.test.mjs`
- Modify: `platform/src/cli.mjs`

- [ ] **Step 1: Write failing install tests**

Cover:

```js
await install({ plugins: ["backend"], providers: ["codex"], target });
assert.deepEqual(lock.plugins.map((item) => item.id), ["architecture", "backend"]);
assert.equal(countFiles(target, "skills/code-shared-design"), 1);
assert.equal(await exists(target, ".codex-plugin/plugin.json"), true);
```

Also test multiple plugins, `--all`, provider CSV input, local artifact source, npm-to-GitHub fallback, conflict stop, `--force`, and no-clone operation.

- [ ] **Step 2: Run lifecycle tests and verify failure**

Run:

```powershell
node --test platform/test/lifecycle.test.mjs
```

Expected: FAIL because install orchestration is missing.

- [ ] **Step 3: Implement installation orchestration**

Export:

```js
export async function installPlugins({
  root,
  target,
  pluginIds,
  all,
  providers,
  source,
  force,
  global
}) {}
```

Use registry resolution, verified cache downloads, dependency graph resolution, provider projection, transaction planning, and state writes. Default `target` is `process.cwd()`. Global root is resolved explicitly per operating system and never inferred from the source repository.

- [ ] **Step 4: Wire CLI install commands**

Support:

```text
aiep plugin install backend
aiep plugin install backend@1.0.0
aiep plugin install backend security
aiep install --all
aiep plugin install backend --provider codex,claude,cursor
aiep plugin install backend --global
aiep plugin install backend --source ../ai-engineering-platform
aiep plugin install backend --force
```

Human output must show plan summary, selected source, conflicts, and final state. `--json` must emit one JSON object and no progress text.

- [ ] **Step 5: Verify project-local installs**

Run:

```powershell
node --test platform/test/lifecycle.test.mjs platform/test/cli.test.mjs
```

Expected: PASS for one, multiple, and all-plugin installs.

- [ ] **Step 6: Commit**

```powershell
git add platform/src/lifecycle.mjs platform/src/cli.mjs platform/test/lifecycle.test.mjs platform/test/cli.test.mjs
git commit -m "feat(platform): install plugins with aiep"
```

## Task 9: Implement Update, Outdated, and Dry Run

**Files:**
- Modify: `platform/src/lifecycle.mjs`
- Modify: `platform/src/cli.mjs`
- Modify: `platform/test/lifecycle.test.mjs`
- Modify: `platform/test/cli.test.mjs`

- [ ] **Step 1: Write failing update tests**

Create local registry fixtures for `backend@1.0.0` and `backend@1.1.0`. Assert:

```js
assert.equal((await outdated({ target })).updates[0].latest, "1.1.0");
assert.equal((await update({ target, pluginIds: ["backend"], dryRun: true })).changed, false);
assert.equal((await readLock(target)).plugins.backend.version, "1.0.0");
await update({ target, pluginIds: ["backend"] });
assert.equal((await readLock(target)).plugins.backend.version, "1.1.0");
```

Add dependency graph change, drift rejection, `--force`, all-plugin update, and rollback-on-validation-failure cases.

- [ ] **Step 2: Run update tests and verify failure**

Run:

```powershell
node --test platform/test/lifecycle.test.mjs --test-name-pattern="outdated|update|dry-run"
```

Expected: FAIL because update operations are missing.

- [ ] **Step 3: Implement list, outdated, and update**

Export:

```js
export async function listInstalled({ target }) {}
export async function findOutdated({ target, registry }) {}
export async function updatePlugins({ target, pluginIds, all, version, dryRun, force }) {}
```

Update must build a complete desired target state, not patch individual files in place.

- [ ] **Step 4: Wire update commands**

Support:

```text
aiep plugin list
aiep plugin outdated
aiep plugin update backend
aiep plugin update backend@1.1.0
aiep update --all
aiep update --all --dry-run
```

- [ ] **Step 5: Verify update lifecycle**

Run:

```powershell
node --test platform/test/lifecycle.test.mjs platform/test/cli.test.mjs
```

Expected: PASS and failed updates preserve the exact previous lock and managed files.

- [ ] **Step 6: Commit**

```powershell
git add platform/src/lifecycle.mjs platform/src/cli.mjs platform/test
git commit -m "feat(platform): update installed plugins safely"
```

## Task 10: Implement Ownership-Aware Removal

**Files:**
- Modify: `platform/src/lifecycle.mjs`
- Modify: `platform/src/cli.mjs`
- Modify: `platform/test/lifecycle.test.mjs`
- Modify: `platform/test/cli.test.mjs`

- [ ] **Step 1: Write failing removal tests**

Install `backend` and `testing`, then assert:

```js
await remove({ target, pluginIds: ["backend"] });
assert.equal(await exists(target, "skills/test-automation-validate/SKILL.md"), true);
assert.equal(await exists(target, "skills/java-analyze/SKILL.md"), false);
assert.equal(await exists(target, "user-owned.txt"), true);
```

Add drift rejection, `--force`, `--prune`, last-owner removal, `remove --all`, and rollback failure cases.

- [ ] **Step 2: Run removal tests and verify failure**

Run:

```powershell
node --test platform/test/lifecycle.test.mjs --test-name-pattern="remove|prune"
```

Expected: FAIL because selective removal is missing.

- [ ] **Step 3: Implement reference-counted removal**

Export:

```js
export async function removePlugins({
  target,
  pluginIds,
  all,
  prune,
  force
}) {}
```

Re-resolve the remaining graph, retain files with at least one owner, delete only recorded managed files, and apply the desired state through the transaction module.

- [ ] **Step 4: Wire removal commands**

Support:

```text
aiep plugin remove backend
aiep plugin remove backend --prune
aiep remove --all
```

- [ ] **Step 5: Verify removal safety**

Run:

```powershell
node --test platform/test/lifecycle.test.mjs platform/test/cli.test.mjs
```

Expected: PASS and unmanaged files are unchanged.

- [ ] **Step 6: Commit**

```powershell
git add platform/src/lifecycle.mjs platform/src/cli.mjs platform/test
git commit -m "feat(platform): remove plugins by ownership"
```

## Task 11: Preserve Existing Repository-Local Workflows

**Files:**
- Modify: `scripts/invoke-aidk.ps1`
- Modify: `scripts/test-aidk-core.ps1`
- Modify: `scripts/validate-workflows.ps1`
- Modify: `skills/codex-structure-validate/scripts/validate-codex-structure.ps1`
- Modify: `.codex-plugin/plugin.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.cursor-plugin/plugin.json`

- [ ] **Step 1: Add failing compatibility assertions**

Update PowerShell tests to require:

```powershell
$result = & node platform/bin/aiep.mjs validate --json | ConvertFrom-Json
Assert-True ($result.status -eq 'pass') 'AIEP contracts should validate.'

$plan = & powershell -File scripts/invoke-aidk.ps1 -Action plan -Package backend -Json |
    ConvertFrom-Json
Assert-True (@($plan.packages) -contains 'backend') 'Legacy wrapper should remain usable.'
```

- [ ] **Step 2: Run selected compatibility tests and verify failure**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-aidk-core.ps1
powershell -ExecutionPolicy Bypass -File scripts/validate-workflows.ps1 -Root .
```

Expected: at least one test FAIL because package contracts moved to AIEP.

- [ ] **Step 3: Adapt the legacy wrapper**

Keep `invoke-aidk.ps1` command parameters stable. Route `validate` and package operations to `node platform/bin/aiep.mjs` or update the Python compatibility reader to accept both old and new field names. Do not add new features to the Python runtime.

- [ ] **Step 4: Regenerate checked-in provider manifests**

Generate root manifests from canonical product metadata and verify they match repository validation output.

- [ ] **Step 5: Run repository validation**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Expected: validator and selected tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add scripts skills/codex-structure-validate .codex-plugin .claude-plugin .cursor-plugin
git commit -m "refactor(platform): bridge legacy aidk workflows"
```

## Task 12: Verify npm and GitHub Release Installation

**Files:**
- Create: `platform/test/distribution.test.mjs`
- Modify: `package.json`
- Modify: `platform/src/builder.mjs`
- Modify: `platform/src/registry.mjs`

- [ ] **Step 1: Write failing distribution tests**

Test local npm packing:

```js
const cliPack = await npmPack(repoRoot);
const pluginPack = await npmPack("dist/npm/backend");
await npmInstall(tempProject, cliPack);
const result = await runInstalledAiep(tempProject, [
  "plugin", "install", "backend",
  "--source", pluginPack,
  "--provider", "codex"
]);
assert.equal(result.exitCode, 0);
```

Extract the GitHub archive and assert its `plugin.json`, `manifest.lock`, and `checksums.json` match the npm plugin pack.

- [ ] **Step 2: Run distribution tests and verify failure**

Run:

```powershell
node --test platform/test/distribution.test.mjs
```

Expected: FAIL because npm plugin staging and release packs are incomplete.

- [ ] **Step 3: Generate npm plugin package metadata**

Each `dist/npm/<id>/package.json` must contain:

```json
{
  "name": "@ai-engineering-platform/plugin-backend",
  "version": "1.0.0",
  "type": "module",
  "files": ["artifact"],
  "aiep": {
    "artifact": "./artifact/plugin.json"
  }
}
```

The artifact directory must be byte-equivalent to the expanded GitHub archive after excluding archive/package transport metadata.

- [ ] **Step 4: Verify install on a clean temporary project**

Run:

```powershell
npm pack
node --test platform/test/distribution.test.mjs
```

Expected: the packed CLI installs without a source clone and installs `backend` from both npm-style and GitHub-style local archives.

- [ ] **Step 5: Commit**

```powershell
git add package.json platform
git commit -m "feat(platform): package npm and release distributions"
```

Do not commit generated `.tgz` files.

## Task 13: Align User Documentation and Release Metadata

**Files:**
- Modify: `README.md`
- Modify: `README_VI.md`
- Modify: `CHANGELOG.md`
- Modify: `scripts/README.md`

- [ ] **Step 1: Add documentation verification assertions**

Extend `platform/test/distribution.test.mjs` to assert both README files contain:

```text
npx ai-engineering-platform --help
aiep plugin install backend
aiep install --all
aiep plugin update backend
aiep plugin remove backend
```

Assert source development instructions still include `npm install`, `npm run build`, and `npm link`.

- [ ] **Step 2: Run documentation assertions and verify failure**

Run:

```powershell
node --test platform/test/distribution.test.mjs --test-name-pattern="documentation"
```

Expected: FAIL because the current README files describe AIDK-only installation.

- [ ] **Step 3: Update English and Vietnamese documentation together**

Document:

- product and CLI identity;
- install one, multiple, or all plugins;
- project-local and `--global` behavior;
- Codex, Claude Code, and Cursor provider selection;
- update, dry-run, removal, and drift behavior;
- npm primary source and GitHub fallback;
- source development workflow;
- legacy AIDK compatibility period.

- [ ] **Step 4: Add a v1 release changelog entry**

Describe independent plugin artifacts, canonical commands, transactional lifecycle, three provider adapters, and distribution formats. Mark the old repository-local CLI as compatibility-only.

- [ ] **Step 5: Verify docs and selected tests**

Run:

```powershell
node --test platform/test/distribution.test.mjs
powershell -ExecutionPolicy Bypass -File scripts/test-skills-cli-compat.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```powershell
git add README.md README_VI.md CHANGELOG.md scripts/README.md platform/test/distribution.test.mjs
git commit -m "docs(platform): document plugin lifecycle"
```

## Task 14: Run Full Acceptance and Release Checks

**Files:**
- Modify only files required to fix failures found by this task.

- [ ] **Step 1: Validate repository contracts**

Run:

```powershell
node platform/bin/aiep.mjs validate --json
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

Expected: both return success; AIEP reports six plugins and three providers.

- [ ] **Step 2: Run the complete Node suite**

Run:

```powershell
npm test
```

Expected: all contract, resolver, provider, builder, registry, security, transaction, lifecycle, CLI, and distribution tests PASS.

- [ ] **Step 3: Run repository-selected tests**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Expected: all selected PowerShell tests and the final structure validator PASS.

- [ ] **Step 4: Verify all plugin artifacts**

Run:

```powershell
node platform/bin/aiep.mjs build --all --json
node platform/bin/aiep.mjs registry generate --json
node platform/bin/aiep.mjs artifact verify --all --json
```

Expected: six immutable artifacts pass checksum and schema verification.

- [ ] **Step 5: Verify clean install, update, and remove**

In a temporary project, run:

```powershell
npx --no-install aiep plugin install backend --provider codex,claude,cursor
npx --no-install aiep plugin list
npx --no-install aiep update --all --dry-run
npx --no-install aiep plugin remove backend --prune
npx --no-install aiep remove --all
```

Expected: every command succeeds; final removal leaves user-created files intact and no managed plugin files behind.

- [ ] **Step 6: Inspect final Git state**

Run:

```powershell
git status --short
git diff --check
git log --oneline --decorate -15
```

Expected: no generated `dist/`, `.aiep/`, or `.tgz` files are staged; `git diff --check` is clean.

- [ ] **Step 7: Commit acceptance fixes if needed**

If Step 1-6 exposes a failure, return to the task that owns the failing
component, add a regression assertion there, apply the minimal fix, rerun that
task's verification commands, and use that task's commit step. Afterward rerun
Task 14 from Step 1. If no fixes are required, do not create an empty commit.

## Acceptance Traceability

| Spec requirement | Implemented by |
|---|---|
| Six standalone plugin artifacts | Tasks 2, 5, 14 |
| Non-empty skills and commands | Tasks 2, 5 |
| Codex, Claude Code, Cursor outputs | Tasks 4, 5 |
| Install one, multiple, or all | Task 8 |
| Shared skills installed once | Tasks 3, 7, 8 |
| npm and GitHub equivalence | Tasks 6, 12 |
| Conflict stop and explicit force | Tasks 7, 8 |
| Update dry run and rollback | Task 9 |
| Ownership-aware removal | Task 10 |
| State written after validation | Task 7 |
| Provider integration tests | Tasks 4, 8, 14 |
| Existing maintainer workflows remain usable | Task 11 |
| Path traversal and root containment | Tasks 5, 6 |
| Project-local default and optional global | Task 8 |
| Source checkout development | Tasks 8, 13 |

## Completion Definition

Implementation is complete only when:

1. `npm test` passes.
2. `scripts/test-selected.ps1 -FromGit` passes.
3. The structure validator passes after `-Fix`.
4. Six plugin artifacts build and verify deterministically.
5. A clean temporary project completes install, dry-run update, selective removal, and full removal.
6. npm and GitHub archive forms expand to equivalent plugin contents.
7. README and README_VI remain aligned.
8. No generated release artifact is accidentally committed.
