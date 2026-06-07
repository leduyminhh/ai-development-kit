# AI Engineering Platform Plugin Distribution v1

Version: `1.0.0`
Status: `Approved design`
Product: `ai-engineering-platform`
CLI command: `aiep`

## 1. Goal

Build every current package as an independently installable plugin while also supporting installation of the complete AI Engineering Platform.

The platform must support:

- installing one plugin, multiple plugins, or all plugins;
- project-local installation by default;
- Codex, Claude Code, and Cursor in the first release;
- npm and GitHub Release distribution;
- deterministic dependency resolution without duplicate shared skills;
- safe install, update, removal, drift detection, and rollback;
- canonical skills and commands that are not coupled to one AI provider.

## 2. Product Model

`ai-engineering-platform` is the distribution platform.

Each package is a plugin source definition:

```text
packages/
|-- architecture/
|-- backend/
|-- documentation/
|-- frontend/
|-- security/
`-- testing/
```

Reusable source assets remain canonical and DRY:

```text
skills/<skill-name>/
agents/
hooks/
adapters/
```

Canonical commands are owned by the package that publishes them under
`packages/<plugin-id>/commands/`. The build system resolves package references
to shared assets and creates self-contained immutable plugin artifacts.

## 3. Source Plugin Contract

Each package contains:

```text
packages/<plugin-id>/
|-- plugin.yaml
|-- commands/
`-- adapter-overrides/
```

`plugin.yaml` defines:

- plugin identity and version;
- supported providers;
- required and optional plugin dependencies;
- included skills;
- included commands;
- included agents and hooks;
- build and installation compatibility.

Example:

```yaml
apiVersion: aiep.dev/v1alpha1
kind: Plugin

metadata:
  id: backend
  name: Backend Engineering
  version: 1.0.0
  description: Backend architecture, implementation, review, and testing workflows.

compatibility:
  platform: ">=1.0.0 <2.0.0"
  providers:
    codex: supported
    claude: supported
    cursor: supported

dependencies:
  required:
    - architecture
  optional:
    - security

assets:
  skills:
    - java-analyze
    - code-shared-design
    - test-automation-validate
  commands:
    - review-backend
    - generate-api
  agents:
    - java-analyze
    - test-automation-validate
  hooks:
    - project-audit
```

## 4. Canonical Command Contract

Commands are provider-neutral Markdown workflows.

Each command declares:

```markdown
---
id: review-backend
description: Review backend source code for production readiness.
version: 1.0.0
---

# Review Backend

## Intent

Review backend implementation and return prioritized findings.

## Inputs

- scope
- optional changed-file set

## Required Skills

- java-analyze
- test-qa-review

## Steps

1. Inspect project structure and stack.
2. Review architecture and API boundaries.
3. Review persistence, errors, logging, and tests.
4. Return evidence-backed findings.

## Output Contract

- summary
- critical findings
- major findings
- test gaps
- verification
```

Rules:

- commands must not assume a Claude slash command or Codex-only invocation;
- commands must not contain provider-specific paths;
- adapters translate canonical commands into provider-native representations;
- adapter overrides may change packaging details but not business workflow semantics.

## 5. Built Plugin Artifact

Every plugin build produces:

```text
dist/<plugin-id>/<version>/
|-- plugin.json
|-- skills/
|-- commands/
|-- agents/
|-- hooks/
|-- adapters/
|   |-- codex/
|   |-- claude/
|   `-- cursor/
|-- checksums.json
`-- manifest.lock
```

The artifact is:

- self-contained;
- immutable for a published version;
- checksum-verifiable;
- installable without access to source repository files;
- semantically equivalent across supported providers.

Artifact rules:

- `skills/` and `commands/` must each contain at least one declared asset;
- `agents/` and `hooks/` are always present but may be empty when the plugin does not declare that asset type;
- each supported provider directory is always present under `adapters/` and contains the generated provider manifest, even when no additional provider-specific files are required.

`manifest.lock` records resolved plugin and asset versions used during build.

`checksums.json` records SHA-256 checksums for every artifact file.

## 6. Build Outputs

One build produces two distribution forms from the same staged artifact:

### npm

```text
@ai-engineering-platform/plugin-backend
@ai-engineering-platform/plugin-security
@ai-engineering-platform/plugin-testing
```

### GitHub Release

```text
ai-engineering-platform-backend-1.0.0.tgz
ai-engineering-platform-security-1.0.0.tgz
ai-engineering-platform-testing-1.0.0.tgz
```

Both forms must contain the same plugin manifest, asset contents, lock data, and checksums.

npm is the primary registry. GitHub Release is a mirror and fallback source.

## 7. Registry

The platform repository owns a canonical registry:

```text
registry/
|-- registry.json
`-- plugins/
    |-- architecture.json
    |-- backend.json
    |-- documentation.json
    |-- frontend.json
    |-- security.json
    `-- testing.json
```

Each registry entry records:

- available versions;
- npm package name;
- GitHub Release URL template;
- integrity metadata;
- plugin dependencies;
- supported providers;
- platform version range.

The registry must not execute code during discovery or dependency resolution.

## 8. CLI Distribution

Install globally:

```bash
npm install -g ai-engineering-platform
```

Run without global installation:

```bash
npx ai-engineering-platform --help
```

Primary executable:

```text
aiep
```

## 9. Installation Lifecycle

Install one plugin:

```bash
aiep plugin install backend
aiep plugin install backend@1.2.0
```

Install multiple plugins:

```bash
aiep plugin install backend security testing
```

Install all plugins:

```bash
aiep install --all
```

Select providers:

```bash
aiep plugin install backend --provider codex
aiep plugin install backend --provider claude
aiep plugin install backend --provider cursor
aiep plugin install backend --provider codex,claude,cursor
```

Installation defaults to the current project.

Global installation requires:

```bash
aiep plugin install backend --global
```

Install flow:

1. Read the configured registry.
2. Resolve plugin versions and required dependencies.
3. Prefer npm and fall back to GitHub Release when configured.
4. Download artifacts into a temporary staging directory.
5. Verify archive integrity and `checksums.json`.
6. Validate plugin manifest and provider compatibility.
7. Detect conflicts and managed-file drift.
8. Materialize shared skills only once.
9. Generate or copy provider-native files.
10. Validate staged output.
11. Atomically apply staged changes.
12. Write state and ownership files only after success.

## 10. Project State

Installed projects contain:

```text
.aiep/
|-- install-state.json
|-- platform.lock
|-- ownership.json
`-- cache/
```

`platform.lock` records:

- platform version;
- installed plugin versions;
- dependency graph;
- selected providers;
- artifact source and integrity.

`ownership.json` records:

- every managed output file;
- owning plugin;
- originating asset;
- checksum after installation;
- whether the file is shared.

`install-state.json` records the last successful transaction.

Secrets and credentials must never be stored in these files.

## 11. Dependency Resolution

Rules:

- required dependencies are installed automatically;
- optional dependencies require explicit selection;
- shared skills are installed once;
- all plugins requiring one shared skill must resolve to a compatible skill version;
- incompatible constraints fail before files are changed;
- dependency cycles fail during planning;
- deterministic ordering is required.

Removal uses reference counting from the resolved ownership graph.

## 12. Conflict Policy

Default behavior:

- stop when a destination file exists and is not owned by AIEP;
- stop when a managed file checksum differs from recorded state;
- do not merge automatically;
- do not overwrite silently.

Explicit override:

```bash
aiep plugin install backend --force
aiep plugin update backend --force
```

`--force` must be visible in transaction output and state history.

## 13. Update Lifecycle

Inspect:

```bash
aiep plugin list
aiep plugin outdated
```

Update:

```bash
aiep plugin update backend
aiep plugin update backend@1.3.0
aiep update --all
aiep update --all --dry-run
```

Update flow:

1. Resolve the desired dependency graph.
2. Compare it with `platform.lock`.
3. Download and verify changed artifacts.
4. Detect drift and conflicts.
5. Build a complete staged target state.
6. Validate staged provider output.
7. Apply changes atomically.
8. Replace lock and ownership state only after success.
9. Restore the previous state if any step fails.

## 14. Removal Lifecycle

Remove one plugin:

```bash
aiep plugin remove backend
```

Remove everything:

```bash
aiep remove --all
```

Remove unused dependencies:

```bash
aiep plugin remove backend --prune
```

Rules:

- remove only files recorded in `ownership.json`;
- never delete user-owned files;
- retain shared assets while another plugin references them;
- fail when a managed file drifted unless `--force` is supplied;
- update lock and ownership state transactionally.

## 15. Source Development

Maintainers:

```bash
git clone https://github.com/leduyminhh/ai-engineering-platform
cd ai-engineering-platform
npm install
npm run build
npm link
```

Install from a local source checkout:

```bash
aiep plugin install backend --source ../ai-engineering-platform
```

Install from GitHub source for development:

```bash
aiep install --all --source https://github.com/leduyminhh/ai-engineering-platform
```

Production users update through published artifact versions, not `git pull`.

## 16. Provider Adapters

### Codex

Generate or install:

- `AGENTS.md` managed section;
- Codex-discoverable skills;
- command workflow references;
- agent registration where supported;
- project hook runtime configuration.

### Claude Code

Generate or install:

- plugin metadata;
- skills;
- slash command projections from canonical commands;
- agents;
- hook metadata.

### Cursor

Generate or install:

- project rules;
- skills;
- command workflow projections;
- hook metadata.

Adapter output must preserve canonical command intent and output contract.

## 17. Transaction and Rollback

Install, update, and removal are transactions.

Required behavior:

- plan before write;
- stage outside managed destinations;
- verify checksums before apply;
- back up replaced managed files;
- write state last;
- restore the previous state on failure;
- return a non-zero exit code with actionable errors;
- leave no partial successful state marker.

## 18. Security Requirements

- Use SHA-256 integrity for artifact files.
- Record npm or GitHub provenance in the lock file.
- Reject path traversal in archives and manifests.
- Reject writes outside project or approved global roots.
- Do not execute plugin scripts during discovery or planning.
- Keep MCP disabled unless explicitly enabled in a future contract.
- Redact registry credentials and tokens from logs.
- Require explicit `--force` for destructive conflict resolution.

## 19. Initial Plugin Set

The first release builds:

| Plugin | Main assets |
|---|---|
| `architecture` | architecture analysis, Onion Architecture, shared design, pattern advice |
| `backend` | Java/backend analysis, shared contracts, test automation |
| `frontend` | React implementation and test automation |
| `security` | security review and verification |
| `testing` | QA review and automated testing |
| `documentation` | technical documentation and diagrams |

Each plugin must define at least one canonical command before publication.

## 20. Acceptance Criteria

The first release is complete when:

1. Every initial package builds into a standalone plugin artifact.
2. Every artifact contains non-empty skills and commands, declared agents and hooks, and generated manifests for all three provider adapters.
3. `aiep plugin install backend` succeeds in a clean project.
4. `aiep install --all` installs all compatible plugins.
5. Shared skills are installed once and referenced by multiple plugins.
6. npm and GitHub artifacts have equivalent manifests and checksums.
7. Conflict detection stops installation without `--force`.
8. Update supports dry run and rollback.
9. Removal preserves shared and user-owned files.
10. Lock and ownership state are written only after successful validation.
11. Codex, Claude Code, and Cursor integration tests pass.
12. Existing direct skill development workflows remain usable for maintainers.

## 21. Deferred Scope

The following are deferred:

- GitHub Copilot adapter;
- remote third-party marketplace registration;
- automatic MCP server installation;
- automatic merging of user-owned instruction files;
- runtime execution of arbitrary plugin scripts;
- multi-user enterprise registry service.
