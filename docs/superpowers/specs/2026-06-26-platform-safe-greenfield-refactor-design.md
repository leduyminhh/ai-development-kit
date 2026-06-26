# Platform Safe Greenfield Refactor Design

## Context

The repository already contains the major building blocks described by `docs/Platform-Specification-v1.0.md`: `core/`, `plugins/`, `adapters/`, `providers/`, and `cli/`. The current CLI is functional, but much of the platform orchestration is concentrated in legacy CLI modules such as `cli/src/cli.mjs`, `cli/src/lifecycle.mjs`, `cli/src/workflow.mjs`, `cli/src/resolver.mjs`, and `cli/src/builder.mjs`.

The selected direction is **Safe Greenfield**: build a new platform-first runtime next to the existing implementation, route commands to the new runtime only after parity is proven, and remove legacy code only after deterministic validation passes.

## Goals

- Align the source code with `AI Plugin Platform Specification v1.0`.
- Rebuild platform runtime around explicit contracts, resolver pipeline, build pipeline, adapter contract, and lock generation.
- Preserve public CLI compatibility for `aie`, `ai-engineering`, and existing user workflows.
- Avoid big-bang deletion of working install, doctor, validation, and migration behavior.
- Make each migration step testable, reversible, and reviewable.

## Non-Goals

- Do not delete the legacy CLI in the first implementation phase.
- Do not change existing plugin content unless a contract migration requires it.
- Do not introduce a remote marketplace in the initial rebuild.
- Do not break existing provider outputs for Codex, Claude Code, Cursor, or Antigravity.
- Do not rename the package or remove current command aliases.

## Design Principles

1. **Contract-first**: schemas and runtime types define plugin, asset, adapter, lock, and artifact behavior before command handlers depend on them.
2. **Compatibility-first**: existing manifests, commands, adapters, and install state continue to work through compatibility adapters.
3. **Deterministic-first**: discovery, resolution, lock generation, and build output must be stable across repeated runs.
4. **Adapter isolation**: provider-specific projection code lives behind a common adapter interface.
5. **Thin CLI**: CLI command handlers parse input, call platform services, format output, and map errors only.
6. **Safe migration**: every filesystem-changing command supports dry-run or transaction-style planning before mutation.

## Proposed Source Layout

```text
cli/src/
  index.ts
  cli.mjs                         legacy entry/router during migration
  platform/
    contracts/
      asset.mjs
      adapter.mjs
      plugin.mjs
      lockfile.mjs
      artifact.mjs
    discovery/
      discover-platform.mjs
      discover-plugins.mjs
      discover-assets.mjs
      discover-adapters.mjs
    validation/
      validate-platform.mjs
      validate-plugin.mjs
      validate-assets.mjs
      validate-adapter.mjs
    resolver/
      dependency-graph.mjs
      resolve-versions.mjs
      detect-cycles.mjs
      dedupe-assets.mjs
      resolver.mjs
    lockfile/
      generate-lockfile.mjs
      read-lockfile.mjs
      verify-lockfile.mjs
    build/
      build-pipeline.mjs
      build-artifact.mjs
      package-artifact.mjs
      checksums.mjs
    adapters/
      adapter-contract.mjs
      codex.mjs
      claude.mjs
      cursor.mjs
      antigravity.mjs
    marketplace/
      local-index.mjs
    config/
      load-config.mjs
      normalize-config.mjs
    fs/
      transaction.mjs
      paths.mjs
    errors/
      platform-error.mjs
      error-codes.mjs
  commands/
    validate.mjs
    resolve.mjs
    build.mjs
    package.mjs
    doctor.mjs
    migrate.mjs
    install.mjs
```

This layout can be introduced incrementally. Existing legacy modules remain in place until each command has parity tests and is routed to the new runtime.

## Runtime Pipeline

### 1. Discovery

Discovery reads repository-owned platform sources without mutating files.

Inputs:
- root config such as `ai-engineering.config.yaml`
- `core/`
- `plugins/*/plugin.yaml`
- plugin-owned assets
- `adapters/*/projector.mjs` or new adapter wrappers
- `providers/` registry data

Outputs:
- discovered platform model
- plugin catalog
- asset catalog
- adapter catalog
- diagnostics for missing or malformed entries

### 2. Validation

Validation checks source contracts before resolution or build.

Checks:
- manifest schema compatibility
- asset metadata shape
- command references
- workflow schema validity
- provider support declarations
- adapter availability
- duplicated asset ids
- README bilingual rule for depth 0-1 docs

### 3. Resolution

Resolution converts requested plugins and targets into a deterministic dependency graph.

Checks:
- required plugin existence
- optional dependency handling
- cycle detection
- semantic version compatibility
- shared asset deduplication
- adapter compatibility
- deterministic ordering

Output:
- resolved graph
- selected plugins
- selected assets
- selected adapters
- dependency diagnostics

### 4. Lock Generation

Lock generation records exactly what the resolver selected.

The lock file should include:
- platform version
- selected plugins and versions
- selected assets and versions
- selected adapters and versions
- dependency graph edges
- checksums for source assets when appropriate
- generated timestamp only if deterministic mode can omit or normalize it

### 5. Build

Build consumes the resolved graph and lock, then creates provider-neutral artifacts before adapter transformation.

Build outputs:
- plugin artifact metadata
- selected asset tree
- checksums
- build manifest
- diagnostics

### 6. Adapter Transform

Adapters convert platform artifacts into provider-native outputs.

Every adapter exposes:
- `validate(context)`
- `transform(context)`
- `package(context)`
- `publish(context)`

Initial wrappers can call the current `adapters/<provider>/projector.mjs` implementations, then later be rewritten internally.

### 7. Install and Migration

Install and migration run through a plan/apply flow.

Flow:
1. inspect target project
2. detect provider state
3. resolve selected plugins
4. produce install plan
5. render dry-run diff
6. apply through transaction
7. verify installed state
8. write install state and diagnostics

## Command Migration Strategy

### Wave 1: Read-only platform commands

- `validate`
- `resolve`
- `doctor`

These commands are safest because they can run without mutating target projects.

### Wave 2: Build and package commands

- `build`
- `package`

These commands write only to controlled output directories and are good candidates after resolver parity exists.

### Wave 3: Project mutation commands

- `init`
- `install`
- `upgrade`
- `uninstall`
- `migrate`

These commands require transaction safety, dry-run support, rollback behavior, and compatibility checks before switching to the new runtime.

### Wave 4: Publish and marketplace commands

- `publish`
- marketplace indexing

Initial marketplace work should stay local and metadata-only.

## Compatibility Plan

- Keep `apiVersion: ai-engineering.dev/v1alpha1` support while introducing v1 platform contracts.
- Keep `AiIdePlugin` manifests readable through a normalization layer.
- Keep package binaries unchanged: `aie`, `ai-engineering`, and `ai-engineering-platform`.
- Keep existing adapter output paths unless a documented migration requires otherwise.
- Keep current tests as regression coverage while adding new contract tests.

## Testing Strategy

### Baseline

Run before any implementation wave:

```powershell
npm run build:cli
npm test
npm run validate
npm run doctor
```

### Contract Tests

Add focused tests for:
- plugin manifest normalization
- asset catalog discovery
- adapter contract validation
- dependency graph ordering
- cycle detection
- lock file determinism
- build artifact checksums

### Parity Tests

For each migrated command:
- compare legacy and new output for stable fields
- verify exit codes
- verify generated files
- verify dry-run behavior
- verify diagnostics and error messages where stable

### Smoke Tests

Run target-project smoke tests after project mutation commands are migrated:

```powershell
ai-engineering init
ai-engineering install platform security --target cursor
ai-engineering doctor
```

## Documentation Impact

- Update `README.md` first, then synchronize `README_VI.md`.
- Add or update docs for platform contracts, resolver pipeline, adapter authoring, lock files, and migration behavior.
- Update `docs/Platform-Specification-v1.0.md` only if implementation discovers a spec ambiguity that should become normative.
- Preserve user-authored content outside managed instruction blocks.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Legacy behavior is lost during rewrite | Keep legacy runtime until parity tests pass. |
| Install commands damage user files | Require dry-run, transaction planning, and rollback checks before migration. |
| Adapter outputs drift silently | Add adapter snapshot or contract tests per provider. |
| Scope expands into remote marketplace | Limit first marketplace phase to local metadata index. |
| Schema migration breaks existing plugins | Use manifest normalization and compatibility tests. |
| Large CLI rewrite becomes hard to review | Ship in waves with command-level routing switches. |

## Phase Reporting and Approval Gates

Every implementation phase must end with a written checkpoint report. The next phase must not start until the user explicitly approves the checkpoint.

### Checkpoint Rule

At the end of each phase:

1. stop implementation work;
2. run the phase-specific validation commands;
3. produce the checkpoint report below;
4. identify blockers, skipped checks, and residual risks;
5. ask the user to approve, revise, or stop;
6. continue only after explicit user approval.

### Required Checkpoint Report Format

Each report must include:

- **Phase summary**: goal, completed work, changed files, and unchanged legacy areas.
- **Validation evidence**: exact commands run, pass/fail result, skipped checks, and reason for skips.
- **Project overview**: current repository shape, active runtime path, legacy/new split, and compatibility status.
- **Spec coverage report**: status against the 15 implementation-facing platform spec areas listed below.
- **Risk and rollback**: residual risk, affected users, rollback path, and files safe to revert.
- **Decision request**: clear options for approve, revise, pause, or stop.

### 15-Item Spec Coverage Report

The checkpoint must report each item with one of these statuses: `Not Started`, `In Progress`, `Implemented`, `Verified`, `Deferred`, or `Blocked`.

| # | Spec Area | Checkpoint Question |
| --- | --- | --- |
| 1 | Vision and goals | Does this phase preserve vendor-neutral reusable platform capabilities? |
| 2 | Core principles | Does the work follow non-invasive migration, isolation, metadata, adapters, semver, and compatibility? |
| 3 | High-level architecture | Are `core`, `plugins`, `adapters`, `cli`, `build`, `resolver`, and marketplace boundaries clearer? |
| 4 | Core components | Are Core, Plugin, Adapter, Resolver, and Build Engine responsibilities explicit? |
| 5 | Shared asset model | Are skills, prompts, commands, templates, rules, workflows, and snippets modeled consistently? |
| 6 | Plugin specification | Are plugin metadata, capabilities, dependencies, exports, and compatibility validated or normalized? |
| 7 | Dependency resolution | Are existence checks, cycles, dedupe, semver, deterministic ordering, and incompatibility failures handled? |
| 8 | Build pipeline | Does the phase advance discovery, validation, resolution, lock, transform, packaging, or distribution? |
| 9 | Marketplace | Is marketplace scope unchanged, local-only, or explicitly advanced? |
| 10 | Adapter contract | Are adapter `validate`, `transform`, `package`, and `publish` boundaries preserved or improved? |
| 11 | CLI | Are public commands, aliases, flags, output, and exit behavior preserved or intentionally changed? |
| 12 | Migration strategy | Does the phase support discovery, metadata, dependencies, resolver, adapter, or marketplace migration? |
| 13 | Versioning | Are platform, plugin, asset, and adapter versions respected? |
| 14 | Compatibility | Are existing manifests, providers, install state, and target-project behavior compatible? |
| 15 | Security and extensibility | Are checksums, trust boundaries, custom validators, new asset types, or extension points affected? |

### User Approval Gate

The default next action after every checkpoint is to wait. Implementation resumes only when the user responds with an explicit approval such as `duyệt`, `tiếp tục`, `approve`, or equivalent. If the user requests changes, update the phase plan or design before continuing.

## Milestones

### Milestone 1: Platform Contract Foundation

Deliverables:
- new platform contract modules
- manifest normalization layer
- validation tests
- no command behavior changed by default

Exit criteria:
- build passes
- tests for contract modules pass
- existing validation still passes

### Milestone 2: Resolver and Lockfile

Deliverables:
- new discovery and resolver pipeline
- deterministic lock generation
- graph validation tests

Exit criteria:
- `resolve` can run through new runtime behind an internal flag or isolated command path
- resolver tests cover missing deps, cycles, dedupe, and ordering

### Milestone 3: Build Pipeline

Deliverables:
- provider-neutral build artifact generation
- checksum verification
- package artifact flow

Exit criteria:
- build output is deterministic
- artifact verification passes

### Milestone 4: Adapter Contract

Deliverables:
- adapter interface wrappers
- provider adapter tests
- Codex adapter migrated first, then Claude, Cursor, Antigravity

Exit criteria:
- adapter contract tests pass for every supported provider
- existing smoke adapter tests remain green

### Milestone 5: CLI Routing Migration

Deliverables:
- thin command handlers
- route selected commands to new runtime
- legacy fallback for commands not yet migrated

Exit criteria:
- public binaries still work
- migrated commands pass parity tests

### Milestone 6: Project Mutation Migration

Deliverables:
- install/init/migrate planning flow
- transaction-backed apply
- rollback and dry-run diagnostics

Exit criteria:
- target-project smoke test passes
- install state compatibility is verified

### Milestone 7: Legacy Removal

Deliverables:
- remove unused legacy implementation
- simplify CLI entrypoint
- update docs and bilingual README pair

Exit criteria:
- `npm run build:cli` passes
- `npm test` passes
- `npm run validate` passes
- `npm run doctor` passes
- smoke install passes

## Open Questions

1. Should the new runtime use `.mjs` only for consistency, or gradually move more source to TypeScript?
2. Should the new lock file be written by default during `resolve`, or only with an explicit `--write-lock` flag? — **Resolved (M5): only with an explicit `--write-lock <path>` flag that requires an explicit path. `resolve` stays read-only by default and never writes a lockfile implicitly, and the explicit path avoids clobbering the legacy `.ai-engineering/platform.lock` state.**
3. Should the first adapter wrapper target Codex because it is the active Codex environment, or Cursor because the smoke test currently targets Cursor? — **Resolved (M4): wrap all four providers in one milestone through a shared wrapper factory. Wrappers are thin, so provider order is not a blocker and the milestone meets its own "every supported provider" exit criteria in one pass.**
4. Should legacy/new command routing be controlled by hidden flags, config, or command-by-command replacement only? — **Resolved (M5): flag-controlled and additive. A `--platform` flag routes `validate`/`doctor` to the new runtime; legacy remains the default and the fallback, so default behavior is unchanged. New capabilities ship as additive commands (`resolve`) rather than replacing legacy commands.**

## Milestone 4 Adapter Contract — Resolved Design Decisions

Milestones 1-3 are implemented and green (contracts, resolver, lockfile, build), so the next planned milestone is Milestone 4. The following decisions are normative for the Milestone 4 plan.

1. **Wrapper-over-legacy (not artifact-driven yet).** Each new adapter is a thin wrapper that calls the existing `adapters/<provider>/projector.mjs` through the semantic projection input. This matches "initial wrappers can call the current projector implementations" in the Adapter Transform section and guarantees output parity with the legacy path. Reading directly from the Milestone 3 build artifact is deferred to a later internal rewrite.

2. **Module layout.** New, isolated modules under `cli/src/platform/adapters/`:
   - `adapter-factory.mjs` — `createWrapperAdapter({ id, version, projector })` returns an object implementing the four-method contract. Pure and projector-agnostic, so it is unit-testable with a fake projector.
   - `registry.mjs` — loads the four legacy projectors through the same dynamic-import-by-URL pattern `cli/src/providers.mjs` already uses, builds one adapter per provider through the factory, and exposes `selectAdapter(provider)` plus an `ADAPTERS` map mirroring `SUPPORTED_PROVIDERS`. The legacy `adapters/` tree lives outside the `tsc` `rootDir` (`src`), so static cross-boundary imports break the build; centralizing the dynamic import in the registry is both build-safe and consistent with the existing projector loader. Per-provider wrapper files are intentionally omitted in favor of this single registry.
   - `cli/test/platform-adapters.test.mjs` — contract, parity, factory, and registry tests.

3. **Four-method semantics.** Shared `context = { input }` where `input` is the semantic projection input that already carries `provider` and `scope` (validated by the projection contracts), so the adapter derives provider from `input.provider` and scope from the resulting plan.
   - `validate(context)` — runs the projection-input validator and checks `input.provider` matches `adapter.id`; throws an `INVALID_ADAPTER` platform error otherwise.
   - `transform(context)` — calls the legacy `project()` and returns the validated projection plan unchanged (pure).
   - `package(context)` — turns the plan into a provider-native artifact `{ id, version, provider, scope, files, plan }`. Each `render` asset becomes `{ path, operation: "render", content, sha256 }` where `sha256` hashes the in-memory content with the same SHA-256 algorithm (`node:crypto`) the Milestone 3 build uses; each `copy` asset becomes `{ path, operation: "copy", sourcePath }` with no content or checksum, because the source bytes are not present in the plan. The file-based `sha256File` helper does not apply to in-memory content, so the plan adds a small content-hashing helper rather than reusing it (pure).
   - `publish(context)` — returns a write-plan only `{ provider, scope, files }` and performs no disk I/O. Each `render` asset becomes `{ path, content }` and each `copy` asset becomes `{ path, sourcePath }`. The Milestone 6 transaction layer is the component that applies this plan.

4. **All four providers in one milestone.** Codex, Claude, Cursor, and Antigravity are wrapped together through the shared factory, satisfying the milestone's "every supported provider" exit criterion in a single pass.

5. **Parity is the proof against drift.** Tests assert that `transform()` output equals the current `projectProvider()` output for the same input, that `package()` is deterministic across repeated runs, that `publish()` writes nothing, and that `selectAdapter()` rejects unknown providers.

6. **Scope guards.** Milestone 4 does not modify `cli/src/cli.mjs`, `cli/src/providers.mjs`, the legacy projectors, or `projection-contracts.mjs`; it does not route any CLI command; and it does not write into a target project.

## Milestone 5 CLI Routing Migration — Resolved Design Decisions

Milestone 4 is implemented and green (adapter factory, registry, parity tests). Milestone 5 begins Wave 1 of CLI routing for read-only commands. The following decisions are normative for the Milestone 5 plan. The strategy is **additive plus flag-gated**: legacy command behavior stays the default, and the new runtime is reachable through a new command and an opt-in flag, so no default behavior regresses while parity is proven.

1. **New additive `resolve` command.** `aie resolve [plugin...] [--provider <p>]... [--platform-version <v>] [--optional <p>]... [--write-lock <path>] [--json]`.
   - Defaults come from `ai-engineering.config.yaml`: `requested` defaults to `plugins.enabled` when no positional plugin is given, `providers` defaults to `providers.enabled`, and `platformVersion` defaults to `product.version`. Flags override these.
   - Calls `resolvePlatform({ root, requested, optional, platformVersion, providers })`. Human output reports the resolved plugin ids in order, the asset count, and the dependency-edge count; `--json` emits the full resolution object.
   - `--write-lock <path>` is opt-in and requires an explicit path. It runs `generatePlatformLockfile(resolution)` and writes the JSON to that path. Without the flag, `resolve` writes nothing.

2. **Flag-gated routing for `validate` and `doctor`.** A `--platform` boolean flag routes these read-only commands to the new runtime:
   - `validate --platform` calls `validatePlatformContracts({ root })` and prints `{ status, pluginCount, assetCount }`.
   - `doctor --platform` in source mode (cwd is the repository root) calls `validatePlatformContracts({ root })`; project-mode doctor stays legacy.
   - Without `--platform`, `validate` and `doctor` keep their current `validateRepository` / `doctorProject` behavior unchanged.
   - The new validation scope is intentionally narrower than `validateRepository` (it checks plugin manifests and asset descriptors, not the README bilingual rule or migration artifacts), which is why it is additive rather than a replacement. A side effect is that the `--platform` path stays green even while legacy `validate` fails on the intentionally deleted docs baseline.

3. **Thin CLI, no new directory yet.** The new branches live in `cli/src/cli.mjs` following the existing `if (args[0] === ...)` convention. The pure logic — engine selection (legacy vs platform), `resolve` argument parsing with config defaults, and the JSON-safe projection of a resolution — is extracted into one small module `cli/src/platform/cli-routing.mjs` (`selectValidationEngine`, `loadPlatformConfigDefaults`, `parseResolveArgs`, `resolutionToJson`, `formatResolution`) so it is unit-testable without invoking the failing legacy path or spawning the CLI. The `cli.mjs` handlers only parse input, call the platform service, format output, and map errors. The aspirational `cli/src/commands/` directory is not introduced in this milestone. A JSON-safe projection is required because `resolvePlatform` returns `plugins` as a `Map`, which `JSON.stringify` would otherwise drop.

4. **Additive parity testing.** Pure helpers are unit-tested directly (no spawn): `selectValidationEngine` picks legacy vs platform purely from the flag; `parseResolveArgs` applies config defaults and flag overrides; `resolutionToJson` produces a Map-free object. CLI behavior is tested through the existing `runCli(args)` helper (which spawns the compiled `cli/dist/index.js`): `validate --platform --json` exits 0 with `pluginCount >= 1` and matches `validatePlatformContracts(...)`; `resolve platform --provider codex --json` exits 0 and its plugin ids and graph match a direct `resolvePlatform(...)` call; and `resolve ... --write-lock <tmp>` writes a lockfile equal to `generatePlatformLockfile(...)`. Because `runCli` runs the compiled output, the integration tests require `npm run build:cli` first.

5. **Scope guards.** Milestone 5 does not change the default behavior of `validate` or `doctor`, does not route Wave 2/3 commands (`build`, `install`, `upgrade`, `remove`, `migrate`), does not introduce `cli/src/commands/`, and does not write into a target project except through the explicit `--write-lock <path>`.

## Milestone 6 Project Mutation Migration — Decomposition and Milestone 6a Decisions

Milestone 5 is implemented and green. Milestone 6 (routing `init`, `install`, `upgrade`, `uninstall`, `migrate` to the new runtime with transaction-backed apply, dry-run, and rollback) is the highest-risk milestone and is too large for one plan, so it is decomposed into reviewable, reversible slices:

- **M6a — Platform install dry-run (additive, non-mutating).** Drive the project-mutation projection through the Milestone 4 adapter layer, build the desired-state, and produce a transaction plan/diff via `planTransaction` — without ever applying it.
- **M6b — Platform apply behind a flag.** Wire `applyTransaction` (with the existing backup/rollback) behind an opt-in `--platform` apply for `install`, smoke-tested against a temporary project.
- **M6c — Extend to the remaining mutation commands** (`upgrade`, `uninstall`, `migrate`, `init`), one at a time.

The following decisions are normative for the Milestone 6a plan only.

1. **Inject the projector (do not duplicate the desired-state builder).** The legacy internal `buildDesiredState` and its caller `prepareInstallation` gain an optional parameter `project = projectProvider` (default preserves current behavior exactly). The platform path passes `project = (input) => selectAdapter(input.provider).transform({ input })`. Because Milestone 4 proved `adapter.transform` equals `projectProvider` for the same input, the desired-state and resulting plan are provably identical to the legacy path — this is the safety guarantee, and it reuses the battle-tested asset/instruction/ownership/lock assembly instead of duplicating it. Only the single projector call site (`cli/src/lifecycle.mjs`) is parameterized; the change is backward-compatible.

2. **Non-mutating by construction.** M6a calls `prepareInstallation({ ..., project: platformProjector })` then `planTransaction({ target, desiredFiles, lock, ownership, force, linkMode })` and prints the diff. It never calls `applyTransaction` and never writes lifecycle state. `prepareInstallation` and `planTransaction` only read the filesystem (source files and the target's existing ownership/files for conflict detection), so no project file is created or modified.

3. **Additive command surface.** `aie install <plugin...> --platform --dry-run [--target <provider>] [--scope project|global]`. The branch is short-circuited before the existing interactive install flow and activates only when both `--platform` and `--dry-run` are present. `--platform` without `--dry-run` prints a notice that platform apply is not yet available (Milestone 6b) and returns a non-zero exit, so M6a can never mutate. Argument parsing reuses the existing install-request parsing so plugin/provider/scope selection matches the legacy command.

4. **New platform module + reuse the existing planner/renderer.** `cli/src/platform/install/platform-projector.mjs` exports a single function `platformProjector(input) = selectAdapter(input.provider).transform({ input })` (the adapter-as-projector). The diff itself is produced by reusing the existing `buildInstallPlan` (which already calls `planTransaction` non-mutatingly) and `renderInstallPlan` from `cli/src/install-plan.mjs`; no new formatter is written. The dry-run command parses arguments with the existing `parseInstallRequest` + `finalizeNonInteractiveDraft` (which requires explicit plugins and providers but not `--yes`) and builds the context with `resolveInstallContext`.

5. **Safety is the proof.** Tests assert that, on a temporary target, `prepareInstallation` with the platform projector yields the same `desiredFiles` and the same `planTransaction` actions as the legacy projector, and that running the dry-run command through `runCli` writes nothing to the target directory.

6. **Scope guards.** Milestone 6a does not apply changes (no `applyTransaction`), does not write lifecycle state, and does not touch `upgrade`, `uninstall`, `migrate`, or `init`. The only legacy modification is the backward-compatible optional `project` parameter threaded through `prepareInstallation` and `buildDesiredState`.

## Milestone 6b Platform Install Apply — Resolved Design Decisions

Milestone 6a is implemented and green (non-mutating `install --platform --dry-run`). Milestone 6b enables the first real project mutation: applying the platform-projected install (writing provider files and state) through the existing transaction layer, with the full interactive wizard wired in. The following decisions are normative for the Milestone 6b plan.

1. **Wire the wizard by injecting the projector into the existing install branch — do not duplicate the apply path.** Rather than a separate platform apply branch, the existing `install` branch in `cli.mjs` selects the projector by flag — `const project = args.includes("--platform") ? platformProjector : undefined` — and threads it into both `prepareInstallation` calls: the wizard's `preparePlan` closure and the final apply. When `--platform` is absent, `project` is `undefined`, so the `project = projectProvider` default applies and default behavior is byte-identical. This reuses the entire existing flow — interactive wizard, `--yes` non-interactive path, install session, plan preview, `applyPreparedInstallation`, and the success summary — with only the projector swapped.

2. **Narrow the Milestone 6a dry-run branch.** The dry-run branch condition becomes `args[0] === "install" && args.includes("--platform") && args.includes("--dry-run")`, and its previous "`--platform` without `--dry-run` returns exit 1" guard is removed. Now `install --platform` without `--dry-run` falls through to the existing install branch and applies (interactively or with `--yes`), while `install --platform --dry-run` stays the Milestone 6a dry-run.

3. **Reuse the legacy transaction and wizard wholesale.** `runInstallWizard`, `applyPreparedInstallation` (`planTransaction` conflict detection + `applyTransaction` atomic write, backup, and rollback), the install session, and `initializeProject` are unchanged. Confirmation safety is unchanged: apply still requires either `--yes` (non-interactive) or interactive wizard confirmation, exactly as the legacy install — M6b does not weaken any gate.

4. **Tests.** Through `runCli` against a temporary project: a non-interactive `install <plugin> --target codex --platform --yes` writes the provider files and `.ai-engineering` state, is idempotent on a second run, and a pre-existing unmanaged file at a managed destination causes a conflict abort with no partial write. The Milestone 6a dry-run continues to write nothing. Default install (without `--platform`) behavior stays green via the existing lifecycle tests. The interactive wizard path uses the same injected projector as the tested non-interactive path (shared wiring, already covered by legacy wizard tests); a wizard-level unit test with a platform-projector-prepared plan is added if feasible.

5. **Scope guards.** Milestone 6b touches only the `install` command. It does not route `upgrade`, `uninstall`, `migrate`, or `init` to the new runtime, and the only changes are the flag-selected projector threaded through the existing install branch and the narrowed dry-run branch condition.

## Milestone 6c Remaining Mutation Commands — Decomposition and Milestone 6c-1 (Uninstall) Decisions

Milestone 6b is implemented and green (`install --platform` apply). Milestone 6c routes the remaining mutation commands and is decomposed by command:

- Only the **projection-based** mutation commands flow through `buildDesiredState` and therefore route via the same projector-injection pattern as Milestone 6b: **uninstall** (`removePlugins` → `buildDesiredState`) and **upgrade** (`updatePlugins` → `installPlugins` → `buildDesiredState`).
- **init** (`initializeProject`) and **migrate** (`migrateProject`) do not use the projector; routing them to the new runtime is a different, larger effort (reimplementation on the new resolver) and is **deferred / out of scope** for the projector-routing phase.

Milestone 6c-1 routes **uninstall** first (simplest seam, one hop). The following decisions are normative for the Milestone 6c-1 plan.

1. **Thread the projector through `removePlugins`.** Add an optional `project = projectProvider` parameter to `removePlugins` (`cli/src/lifecycle.mjs`) and pass it into its single `buildDesiredState` call (the one that projects the remaining plugins). Default preserves legacy behavior exactly.

2. **Flag-selected projector in the uninstall branch.** In the `remove`/`uninstall` branch of `cli.mjs`, add `const project = (args[0] === "remove" || args[0] === "uninstall") && args.includes("--platform") ? platformProjector : undefined;` (the `plugin remove` maintainer sub-form is excluded). Thread `project` into both `removePlugins` call sites: the non-interactive path and the interactive uninstall-wizard path.

3. **Reuse the transaction and wizard unchanged.** `planTransaction` (which computes `remove-managed` actions for files no longer desired), `applyTransaction` (atomic + backup + rollback), `writeLifecycleState`, and `runUninstallWizard` are unchanged. The existing confirmation model (positional plugin / `--yes` / `--all`, or interactive) is unchanged — Milestone 6c-1 does not weaken it.

4. **Default uninstall unchanged.** Without `--platform`, `project` is `undefined`, so `removePlugins`/`buildDesiredState` use the `projectProvider` default and default uninstall is byte-identical.

5. **Tests.** Through `runCli` against a temporary project: install via `install <plugin> --target codex --platform --yes`, then `remove <plugin> --platform --yes` removes the managed provider files and updates/clears the `.ai-engineering` state. Default uninstall (without `--platform`) stays green via the existing lifecycle tests.

6. **Scope guards.** Milestone 6c-1 touches only `remove`/`uninstall` (not `plugin remove`), does not route `upgrade`, `init`, or `migrate`, and the only changes are the `project` parameter on `removePlugins` and the flag-selected projector threaded through the uninstall branch.

## Recommended Next Step

Create an implementation plan for Milestone 6c-1 only: the `project` parameter on `removePlugins`, the flag-selected projector threaded into the uninstall branch's two `removePlugins` calls, and the install-then-uninstall smoke test. This keeps the slice small, reversible, and non-regressing for default uninstall behavior; `upgrade` follows as its own slice.
