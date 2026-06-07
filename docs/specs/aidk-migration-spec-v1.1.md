# AI Development Kit Migration Specification v1.1

## Incremental Migration of the Existing AI Development Kit

Version: `1.1.0`
Status: `Proposed`
Source repository: `ai-development-kit`
Target product identity: `AI Development Kit (AIDK)`
Migration style: `In-place + Compatibility Bridge + Incremental Adapters`
Primary goal: evolve the current repository into a plugin-capable, multi-agent engineering kit without breaking its existing skills, validators, installers, hooks, or test workflows.

---

## 1. Executive Summary

Version 1.0 described the desired destination as if AIDK were a new repository. The current repository already contains production-relevant foundations:

- discoverable runtime skills under `skills/<name>/`;
- a canonical skill registry in `skills/manifest.toml`;
- Codex agent registration under `.codex/`;
- provider plugin manifests for Claude Code, Codex, and Cursor;
- provider adapters and a normalized cross-IDE hook runtime;
- local and `npx skills` installation paths;
- deterministic structure validation and selected-test routing.

Version 1.1 changes the migration strategy from a directory rewrite to an incremental conversion:

```text
Current repository assets
        |
        v
Compatibility contracts and package metadata
        |
        v
Generated provider outputs
        |
        v
Plugin-capable AIDK distribution
```

The repository must remain usable after every migration phase. Existing `skills/` paths and commands remain supported until equivalent package and adapter behavior is verified.

---

## 2. Current-State Baseline

The following paths are treated as current sources of truth.

| Capability | Current source |
|---|---|
| Runtime skill content | `skills/<name>/SKILL.md` |
| Skill ownership and discovery metadata | `skills/manifest.toml` |
| Skill authoring structure | `skills/SKILL_TEMPLATE.md` |
| Codex runtime registration | `.codex/config.toml`, `.codex/agents/` |
| Provider package metadata | `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/` |
| Provider adapters | `adapters/` |
| Cross-IDE hook runtime | `scripts/hooks/`, `scripts/install-hooks.ps1` |
| Local skill installation | `scripts/install-skill-link.ps1` |
| External skill installation | `npx skills add ...` |
| Workflow bootstrap | `skills/using-workflow-kit/`, `.codex/workflows/` |
| Structure validation | `skills/codex-structure-validate/` |
| Test selection | `.codex/test-map.toml`, `scripts/test-selected.ps1` |

### 2.1 Current Strengths

- Skills already use a flat, discoverable layout.
- Skill-owned scripts, resources, and subagents already have explicit ownership.
- Runtime agent registration is separated from skill content.
- Provider-specific manifests are thin.
- Hook adapters normalize provider events into one internal contract.
- Installation supports both repository links and copied external skills.
- Validation and selected tests already enforce repository conventions.

### 2.2 Current Gaps

- There is no AIDK package schema above the existing skill manifest.
- Provider manifests contain duplicated metadata.
- Adapter outputs are mostly static rather than generated from a canonical model.
- Installation is skill-oriented, not package or capability-bundle oriented.
- Dependency and compatibility rules are not machine-readable at package level.
- There is no install-state lock file for update, removal, conflict detection, or rollback.
- Marketplace and MCP catalogs are not yet canonical repository contracts.

---

## 3. Migration Principles

### 3.1 Preserve Working Contracts

The following contracts must not be removed during v1.1:

- `skills/<name>/SKILL.md`;
- `skills/manifest.toml`;
- existing `.codex/agents/*.toml` registrations;
- existing `npx skills` commands documented by the repository;
- `scripts/install-skill-link.ps1`;
- provider plugin manifests;
- hook installation and audit behavior;
- structure validator and selected-test runner.

### 3.2 Add Before Replacing

New AIDK metadata, package definitions, generators, and CLI commands must be added alongside existing behavior. Replacement is allowed only after parity tests pass for all supported installation paths.

### 3.3 Generate Provider Files from Canonical Metadata

Provider-specific files should become generated projections. They must not become independent sources of skill or governance content.

### 3.4 Keep Provider Adapters Thin

Adapters translate canonical AIDK contracts into provider-native files. They must not contain domain-specific engineering rules.

### 3.5 Make Every Phase Reversible

Each phase must define:

- files added or changed;
- compatibility behavior;
- validation commands;
- rollback procedure;
- exit criteria.

---

## 4. Target Architecture for This Repository

Version 1.1 uses the existing repository as the base:

```text
ai-development-kit/
|
|-- AGENTS.md
|-- README.md
|-- README_VI.md
|-- aidk.config.yaml                 # added after schema approval
|
|-- skills/                          # canonical runtime content in v1.1
|   |-- manifest.toml
|   |-- SKILL_TEMPLATE.md
|   `-- <skill-name>/
|
|-- packages/                        # capability composition metadata
|   |-- architecture/
|   |-- backend/
|   |-- frontend/
|   |-- security/
|   |-- testing/
|   `-- documentation/
|
|-- schemas/                         # canonical AIDK contracts
|   |-- aidk-config.schema.json
|   |-- package.schema.json
|   |-- adapter-output.schema.json
|   `-- install-state.schema.json
|
|-- adapters/                        # thin provider projections
|   |-- claude/
|   |-- codex/
|   |-- cursor/
|   |-- copilot/
|   `-- generic/
|
|-- marketplace/                     # local registry, added incrementally
|   `-- registry.yaml
|
|-- scripts/                         # shared CLI and deterministic helpers
|-- hooks/                           # provider entry shims
|-- .codex/                          # Codex runtime and project governance
|-- .claude-plugin/                  # generated/provider package metadata
|-- .codex-plugin/
`-- .cursor-plugin/
```

### 4.1 Why `packages/` Instead of Moving `skills/`

A package is a composition layer over existing skills, agents, workflows, hooks, and optional integrations. It is not a replacement folder for skill content.

For example, a backend package can reference:

- `java-analyze`;
- `architecture-onion-design`;
- `code-shared-design`;
- `test-automation-validate`;
- optional `security-code-review`.

This avoids duplicating skill bodies and preserves compatibility with current skill discovery tools.

### 4.2 Canonical Source During v1.1

```text
Skill instructions       -> skills/<name>/
Skill registry           -> skills/manifest.toml
Package composition      -> packages/<package>/package.yaml
Project selection        -> aidk.config.yaml
Provider output          -> generated by adapters
Installed state          -> .aidk/install-state.json
```

---

## 5. Package Contract

Each package is a capability bundle that references existing repository assets.

Example:

```text
packages/backend/
|-- package.yaml
`-- README.md
```

Example `package.yaml`:

```yaml
apiVersion: aidk.dev/v1alpha1
kind: Package

metadata:
  id: backend
  name: Backend Engineering
  version: 1.1.0
  description: Backend architecture, implementation review, security, and test workflows.

compatibility:
  aidk: ">=1.1.0 <2.0.0"
  providers:
    codex: supported
    claude: supported
    cursor: supported
    copilot: planned
    generic: supported

dependencies:
  required: []
  optional:
    - security

assets:
  skills:
    - java-analyze
    - architecture-onion-design
    - code-shared-design
    - test-automation-validate
  agents:
    - java-analyze
    - test-automation-validate
  workflows: []
  hooks:
    - project-audit

install:
  defaultScope: project
  supportsCopy: true
  supportsLink: true
```

### 5.1 Package Validation Rules

- Every referenced skill must exist in `skills/manifest.toml`.
- Every referenced agent must exist in `.codex/agents/` and be registered when required.
- Every referenced workflow must exist in the workflow registry.
- Dependencies must form an acyclic graph.
- Package IDs must be unique and use kebab-case.
- Provider support must use a defined compatibility status.
- Package metadata must not duplicate full skill instructions.

---

## 6. Project Configuration

`aidk.config.yaml` declares desired project state:

```yaml
apiVersion: aidk.dev/v1alpha1

project:
  name: ai-development-kit

providers:
  primary: codex
  enabled:
    - codex
    - claude
    - cursor

packages:
  enabled:
    - architecture
    - backend
    - security
    - testing
    - documentation

skills:
  include: []
  exclude: []

hooks:
  enabled: true
  transport: cli

mcp:
  enabled: false
  servers: []

generation:
  overwritePolicy: ask
  generatedFileMarker: true
```

The config expresses intent. It must not be used as proof that files were installed successfully.

---

## 7. Install-State Contract

Project installation writes `.aidk/install-state.json` only after generation and validation succeed.

Minimum state:

```json
{
  "schemaVersion": 1,
  "aidkVersion": "1.1.0",
  "providers": ["codex", "claude", "cursor"],
  "packages": {
    "backend": "1.1.0",
    "security": "1.1.0"
  },
  "generatedFiles": [],
  "sourceChecksums": {},
  "installedAt": "RFC-3339 timestamp"
}
```

The state file supports:

- update planning;
- safe package removal;
- generated-file ownership;
- drift detection;
- rollback to the previous successful state.

Secrets, machine credentials, and MCP tokens must never be stored in this file.

---

## 8. Adapter Strategy

Adapters consume the resolved package graph and produce provider-native files.

```text
skills/manifest.toml + packages/*/package.yaml + aidk.config.yaml
                              |
                              v
                       Resolution model
                              |
             +----------------+----------------+
             v                v                v
          Codex            Claude           Cursor
```

### 8.1 Common Adapter Contract

```ts
export interface AidkAdapter {
  readonly id: string;
  plan(input: ResolvedProject): Promise<GenerationPlan>;
  generate(plan: GenerationPlan): Promise<GeneratedArtifact[]>;
  validate(artifacts: GeneratedArtifact[]): Promise<ValidationResult>;
}
```

Planning must be side-effect free. Generation must use the repository overwrite policy and return explicit ownership metadata.

### 8.2 Codex Adapter

The Codex adapter should preserve:

- root `AGENTS.md` project instructions;
- `.codex/config.toml`;
- `.codex/agents/`;
- `.codex/workflows/`;
- skill discovery through supported link or copy targets;
- existing hook and test-routing configuration.

It must merge only marked AIDK-managed sections and must not replace user-owned instructions.

### 8.3 Claude Adapter

The Claude adapter should generate or validate:

- `.claude-plugin/plugin.json`;
- skill exposure from the canonical `skills/` tree;
- `adapters/claude/hooks.json`;
- optional project-local Claude configuration.

Native Claude packaging is a distribution projection, not the canonical AIDK package format.

### 8.4 Cursor Adapter

The Cursor adapter should preserve current skill installation compatibility and add generated project rules only when requested. Generated rules must link back to their source skill and package.

### 8.5 Copilot and Generic Adapters

Copilot and generic support should be introduced after the first three adapters pass parity checks. Initial support may be export-only and should not be advertised as full lifecycle support until update and removal are verified.

---

## 9. CLI Evolution

Version 1.1 should extend existing scripts before introducing a standalone published CLI.

### 9.1 Compatibility Commands

These commands remain supported:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-skill-link.ps1 -Force
npx skills add . --list
npx skills add . --skill security-code-review --agent codex -y
```

### 9.2 Initial AIDK Commands

Recommended repository-local commands:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 -Action plan
powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 -Action install
powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 -Action validate
powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 -Action export -Provider codex
```

The first implementation should prioritize deterministic behavior over command breadth.

### 9.3 Deferred Commands

The following commands are deferred until install-state and rollback are stable:

- remote marketplace add/remove;
- package update across incompatible versions;
- automatic MCP server installation;
- global package removal;
- unattended overwrite of user-managed files.

---

## 10. Generated File Policy

Every fully generated text file must include a marker when its format supports comments:

```text
Generated by AIDK. Source: <package-or-adapter>@<version>.
```

Generated artifacts are classified as:

| Class | Behavior |
|---|---|
| Managed | AIDK may replace after drift and policy checks |
| Merged | AIDK may update only a marked section |
| User-owned | AIDK may inspect but must not overwrite |

Default overwrite policy is `ask`.

For non-interactive execution, a conflict must fail with a non-zero exit code unless an explicit `skip` or `overwrite` policy was supplied.

---

## 11. Incremental Migration Plan

### Phase 0: Freeze and Baseline

Purpose: prove current behavior before introducing new contracts.

Tasks:

- record current validator and selected-test results;
- inventory skills, registered agents, provider manifests, adapters, hooks, and installers;
- define compatibility fixtures for current install commands;
- resolve the malformed character encoding present in the v1.0 document only when that file is intentionally revised.

Exit criteria:

- current repository validation passes;
- compatibility commands have executable tests;
- no runtime path has moved.

Rollback: no structural changes.

### Phase 1: Canonical Schemas

Purpose: add machine-readable contracts without changing runtime behavior.

Tasks:

- add AIDK config, package, adapter output, and install-state schemas;
- add schema validation helpers;
- add tests and map them in `.codex/test-map.toml`;
- document schema versioning and forward-compatibility rules.

Exit criteria:

- valid fixtures pass;
- invalid references, cycles, unknown providers, and duplicate IDs fail;
- existing skill validation remains unchanged.

Rollback: remove schema-only files and their mapped tests.

### Phase 2: Package Composition Layer

Purpose: group current skills into installable capabilities.

Tasks:

- add initial package metadata for architecture, backend, frontend, security, testing, and documentation;
- resolve package assets through `skills/manifest.toml`;
- prohibit copied skill bodies under `packages/`;
- generate a deterministic resolved-package model.

Exit criteria:

- every package reference resolves;
- dependency order is deterministic;
- installing one package produces the expected skill set;
- direct single-skill installation still works.

Rollback: ignore or remove `packages/`; existing skill flows remain intact.

### Phase 3: Adapter Planning and Generation

Purpose: generate provider outputs from one resolved model.

Tasks:

- implement side-effect-free generation plans;
- implement Codex, Claude, and Cursor adapters first;
- classify outputs as managed, merged, or user-owned;
- compare generated manifests with current checked-in manifests;
- add golden-file or semantic parity tests.

Exit criteria:

- repeated generation is idempotent;
- provider manifests retain current functionality;
- existing user-owned configuration is not overwritten;
- generated outputs pass provider-specific validation.

Rollback: retain current static manifests and disable generation.

### Phase 4: Project Install and State

Purpose: support safe package installation into another project.

Tasks:

- implement `plan`, `install`, `validate`, and `export`;
- write install state only after successful validation;
- support dry run;
- support project scope before global scope;
- integrate existing hook installer instead of duplicating hook logic.

Exit criteria:

- failed installation leaves no successful state record;
- repeated installation is idempotent;
- changed user files produce explicit conflicts;
- rollback restores the previous generated state.

Rollback: remove generated artifacts by recorded ownership and restore the previous state snapshot.

### Phase 5: Compatibility CLI

Purpose: offer a unified AIDK command surface while retaining existing commands.

Tasks:

- wrap deterministic repository scripts with a stable command contract;
- provide aliases for package installation and provider export;
- retain `npx skills` for individual skill distribution;
- publish deprecation notices only after measured parity.

Exit criteria:

- documented commands are covered by integration tests;
- exit codes and machine-readable output are stable;
- Windows and POSIX installation paths are verified.

Rollback: continue using existing scripts and `npx skills`.

### Phase 6: Marketplace and MCP Catalogs

Purpose: add remote discovery and optional tool integrations after local lifecycle stability.

Tasks:

- add signed or checksum-verifiable registry metadata;
- distinguish package metadata from executable MCP configuration;
- require explicit MCP enablement;
- define trust, version pinning, and source provenance policies.

Exit criteria:

- registry entries are schema-valid and integrity-checked;
- MCP remains disabled by default;
- remote content cannot silently overwrite local user files.

Rollback: operate with repository-local package metadata only.

---

## 12. Migration Mapping

| Existing asset | v1.1 treatment |
|---|---|
| `skills/<name>/` | Preserve as canonical skill content |
| `skills/manifest.toml` | Extend or project into package resolution |
| `.codex/agents/` | Preserve as Codex runtime registration |
| `.codex/config.toml` | Preserve; add only validated AIDK settings when needed |
| `.claude-plugin/plugin.json` | Convert to generated or parity-validated output |
| `.codex-plugin/plugin.json` | Convert to generated or parity-validated output |
| `.cursor-plugin/plugin.json` | Convert to generated or parity-validated output |
| `adapters/*` | Evolve into thin generators and validators |
| `scripts/install-skill-link.ps1` | Preserve as local Codex compatibility path |
| `scripts/install-hooks.ps1` | Reuse from package installation |
| `scripts/test-selected.ps1` | Preserve as the default verification entry |
| `skills/codex-structure-validate/` | Extend for new schemas and package contracts |
| `.codex/test-map.toml` | Add exactly one mapping for every new PowerShell test |

---

## 13. Validation Strategy

### 13.1 Required Repository Checks

After structure, skill, config, adapter, or script changes:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

### 13.2 Required Migration Tests

- schema positive and negative fixtures;
- unresolved package asset detection;
- dependency-cycle detection;
- deterministic dependency ordering;
- adapter idempotency;
- provider manifest semantic parity;
- user-owned file conflict handling;
- install-state write-after-success behavior;
- rollback from partial failure;
- Windows and POSIX path handling;
- backward compatibility for direct skill installation;
- hook installer reuse without duplicate configuration.

### 13.3 Acceptance Criteria

The v1.1 migration is complete when:

1. Existing skills can still be listed and installed with documented commands.
2. A project can select one or more packages without duplicating skill content.
3. Codex, Claude, and Cursor outputs are generated or validated from canonical metadata.
4. Installation supports dry run, explicit conflict handling, and state recording.
5. Generated files have traceable ownership.
6. Validator and selected tests enforce all new contracts.
7. No protected path or user-owned target is silently overwritten.
8. Rollback is tested for at least one multi-package, multi-provider installation.

---

## 14. Security and Supply-Chain Requirements

- Remote package sources must be pinned by version and integrity metadata.
- Package metadata must not execute arbitrary scripts during discovery or planning.
- Install hooks require explicit package metadata and project policy approval.
- MCP integrations remain disabled by default.
- Credentials must be referenced through environment variables or provider-native secret stores.
- Generated provider files must not embed secrets.
- Path traversal outside the target project must be rejected.
- Symlink and junction behavior must be validated before writes.
- Installation logs must redact tokens and sensitive environment values.

---

## 15. Decisions and Rejected Alternatives

### 15.1 Decision: Preserve `skills/` in v1.1

Reason: it is already compatible with current discovery, validation, documentation, and external installation flows.

Rejected alternative: move all skills to `plugins/<name>/skills/`.

Consequence: package metadata references skill assets instead of owning copied skill trees.

### 15.2 Decision: Add Packages as Composition

Reason: users need capability-level installation while maintainers need one source for reusable skills.

Rejected alternative: treat every skill as a full plugin.

Consequence: individual skills remain installable, while packages provide higher-level dependency and provider behavior.

### 15.3 Decision: Extend Existing Scripts First

Reason: the repository currently uses deterministic PowerShell, shell, and Python helpers with selected tests.

Rejected alternative: introduce a Node.js CLI before lifecycle contracts are stable.

Consequence: a published CLI may be added later without making early schema and adapter decisions depend on a framework.

### 15.4 Decision: Provider Manifests Are Projections

Reason: duplicated provider metadata will drift if edited independently.

Rejected alternative: maintain each provider package as a separate source of truth.

Consequence: provider-specific fields remain supported, but common metadata is generated from canonical AIDK contracts.

---

## 16. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Existing skill installation breaks | Keep `skills/` and compatibility tests throughout v1.1 |
| Generated adapters overwrite user files | Ownership classes, dry run, marked merges, default `ask` policy |
| Package metadata duplicates skill content | Schema and validator prohibit embedded instruction bodies |
| Provider formats change | Keep adapters isolated and version their compatibility |
| Cross-platform behavior diverges | Test Windows and POSIX paths before publishing lifecycle support |
| Install state becomes stale | Use checksums, drift detection, and validation before update/removal |
| Marketplace introduces supply-chain risk | Integrity metadata, provenance, explicit trust, no execution during discovery |
| Migration scope grows too quickly | Enforce phase exit criteria and defer remote marketplace/MCP lifecycle |

---

## 17. Recommended Implementation Order

1. Capture current validation and compatibility baselines.
2. Define schemas and fixtures.
3. Add package composition metadata over existing skills.
4. Implement deterministic package resolution.
5. Implement adapter planning with no writes.
6. Add Codex semantic parity generation.
7. Add Claude semantic parity generation.
8. Add Cursor semantic parity generation.
9. Implement dry-run project installation.
10. Add install state, conflict handling, and rollback.
11. Stabilize the compatibility CLI.
12. Add Copilot and generic exports.
13. Add marketplace and optional MCP catalogs.

---

## 18. Final Recommendation

AIDK v1.1 should evolve the current repository through a compatibility bridge:

```text
Existing skills and governance
        +
Package composition metadata
        +
Deterministic adapter generation
        +
Safe install state and rollback
        =
Incrementally migrated AI Development Kit
```

The governing rule is:

```text
Preserve current runtime contracts.
Add canonical metadata above them.
Generate provider-specific outputs.
Replace legacy paths only after verified parity.
```

This approach delivers package-level installation and multi-provider generation while protecting the repository's working skill ecosystem, validators, hooks, and installation workflows.
