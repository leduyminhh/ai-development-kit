# AI Engineering Platform Migration Implementation Spec

Version: 1.1.0
CLI Name: `ai-engineering`
Migration Source: legacy `ai-development-kit`
Target Architecture: MCP-first + Capability Packs + Adapter Generator

---

## 1. Migration Goal

Migrate the current repository from the legacy structure:

```text
ai-development-kit/
├── .claude-plugin/
├── .codex/
├── .codex-plugin/
├── .cursor-plugin/
├── adapters/
├── docs/
├── hooks/
├── packages/
├── platform/
├── references/
├── registry/
├── reports/
├── schemas/
├── scripts/
├── skills/
├── AGENTS.md
├── aidk.config.yaml
└── README.md
```

to the new enterprise structure:

```text
ai-engineering-platform/
├── core/
├── packs/
├── mcp-servers/
├── adapters/
├── cli/
├── examples/
├── docs/
├── tests/
├── AGENTS.md
├── ai-engineering.config.yaml
├── package.json
└── README.md
```

Do not read folders:
├── docs/
├── platform/
├── references/
├── reports/

After migrate. Remove


The new structure must support:

- MCP-first execution.
- Installable capability packs.
- Multi-agent adapter generation.
- Safe `AGENTS.md` bootstrap and merge.
- Legacy flow removal when equivalent logic exists in the new structure.

---

## 2. New Target Structure

```text
ai-engineering-platform/
├── README.md
├── README_VI.md
├── AGENTS.md
├── ai-engineering.config.yaml
├── LICENSE
├── CHANGELOG.md
│
├── core/
│   ├── README.md
│   ├── agents/
│   │   ├── AGENTS.template.md
│   │   ├── AGENTS.baseline.md
│   │   └── merge-policy.md
│   ├── routing/
│   │   ├── intent-router.yaml
│   │   ├── command-registry.yaml
│   │   └── skill-registry.yaml
│   ├── standards/
│   ├── templates/
│   ├── checklists/
│   ├── schemas/
│   ├── prompts/
│   └── workflows/
│
├── packs/
│   ├── architecture/
│   ├── application/
│   ├── data/
│   ├── security/
│   ├── quality/
│   ├── platform/
│   └── knowledge/
│
├── mcp-servers/
│   ├── architecture-mcp/
│   ├── application-mcp/
│   ├── data-mcp/
│   ├── security-mcp/
│   ├── quality-mcp/
│   ├── platform-mcp/
│   └── knowledge-mcp/
│
├── adapters/
│   ├── claude/
│   ├── codex/
│   ├── cursor/
│   ├── continue/
│   ├── cline/
│   ├── roo/
│   └── generic/
│
├── cli/
│   ├── README.md
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── commands/
│       ├── services/
│       └── utils/
│
├── examples/
├── docs/
└── tests/
```

---

## 3. Legacy to New Mapping

```text
aidk.config.yaml
→ ai-engineering.config.yaml

AGENTS.md
→ AGENTS.md
→ core/agents/AGENTS.template.md
→ core/agents/AGENTS.baseline.md

skills/
→ packs/*/skills/


schemas/
→ core/schemas/

registry/
→ core/routing/
→ packs/*/pack.yaml

scripts/
→ cli/src/commands/
→ cli/src/services/

hooks/
→ cli/src/hooks/ or legacy/hooks/

.claude-plugin/
→ adapters/claude/

.codex/
→ adapters/codex/

.codex-plugin/
→ adapters/codex/legacy/ or remove after migration

.cursor-plugin/
→ adapters/cursor/legacy/ or remove after migration

packages/
→ cli/
→ mcp-servers/
→ packages/shared/ if reusable libraries are still needed
```

---

## 4. Legacy Flow Evaluation and Removal Rule

During migration, every old folder, script, registry entry, adapter, command, and skill must be evaluated before being kept.

### 4.1 Evaluation Decision

For each legacy component, classify it as one of these:

```text
KEEP_AS_IS
MOVE_TO_NEW_STRUCTURE
MERGE_INTO_NEW_FLOW
REPLACE_BY_NEW_FLOW
DELETE_LEGACY_FLOW
DEPRECATE_TEMPORARILY
```

### 4.2 Rule

If legacy code already has equivalent logic that fits the new structure, migrate the useful logic into the new structure and remove the old flow.

Do not keep duplicate legacy and new flows active at the same time unless a temporary compatibility layer is explicitly required.

### 4.3 Delete Legacy Flow When

Delete or archive the old flow when all conditions are true:

```text
1. Equivalent capability exists in the new structure.
2. New flow has pack.yaml, command contract, skill metadata, or MCP tool schema.
3. Adapter generation covers the old agent-specific behavior.
4. Tests or validation pass for the new flow.
5. No project documentation still points to the old command/path.
6. Migration report records where the old logic moved.
```

### 4.4 Keep Temporarily When

Keep under `legacy/` only when:

```text
1. The new implementation is incomplete.
2. Existing users still depend on the old path.
3. Adapter behavior cannot yet reproduce old behavior.
4. Removing it would break installation or published workflows.
```

Temporary legacy content must include a deprecation note:

```md
# Deprecated

This legacy flow is kept temporarily for compatibility.

Replacement:
- New pack: packs/<pack-name>/
- New command: <pack>.<command>
- New MCP tool: <pack>.<tool>

Removal target version: v<version>
```

### 4.5 Legacy Review Matrix

Create a migration review file:

```text
docs/migration/legacy-review-matrix.md
```

Required table:

```md
| Legacy Path | Type | New Path | Decision | Reason | Validation | Status |
|---|---|---|---|---|---|---|
| skills/docker | skill | packs/platform/skills/docker | MOVE_TO_NEW_STRUCTURE | Platform skill | SKILL.md valid | Done |
| .cursor-plugin | adapter | adapters/cursor | REPLACE_BY_NEW_FLOW | Adapter generator replaces static plugin | cursor adapter test | Done |
| .codex-plugin | adapter | adapters/codex/legacy | DEPRECATE_TEMPORARILY | Need compare with Codex target | pending | Open |
```

### 4.6 No Duplicate Active Flow Rule

After migration, these root-level folders should not remain active:

```text
.claude-plugin/
.codex-plugin/
.cursor-plugin/
skills/
registry/
schemas/
scripts/
```

Allowed final states:

```text
1. Removed after successful migration.
2. Moved to new structure.
3. Moved under legacy/ with deprecation note.
```

---

## 5. Capability Pack Mapping

```text
architecture
- system-design
- adr
- ddd
- cqrs
- event-driven
- microservices
- integration-design

application
- backend
- frontend
- api-design
- spring-boot
- react
- kafka
- redis

data
- postgres
- mysql
- mongodb
- redis-data
- migration
- indexing
- backup-restore
- cdc

security
- owasp
- cwe
- secrets-detection
- threat-modeling
- dependency-scan
- container-security

quality
- testing
- unit-test
- integration-test
- e2e-test
- code-review
- performance-test

platform
- docker
- kubernetes
- ci-cd
- observability
- deployment
- incident-response
- sre

knowledge
- documentation
- readme
- runbook
- api-docs
- onboarding
- changelog
```

---

## 6. Pack Standard

Each pack must follow this format:

```text
packs/<pack-name>/
├── README.md
├── pack.yaml
├── commands/
├── skills/
├── templates/
├── workflows/
└── schemas/
```

Example:

```text
packs/platform/
├── README.md
├── pack.yaml
├── commands/
│   ├── deployment-plan.md
│   ├── docker-review.md
│   ├── k8s-review.md
│   ├── pipeline-review.md
│   └── observability-review.md
├── skills/
│   ├── docker/
│   │   ├── SKILL.md
│   │   ├── examples/
│   │   └── templates/
│   ├── kubernetes/
│   ├── ci-cd/
│   ├── observability/
│   └── sre/
├── templates/
├── workflows/
└── schemas/
```

---

## 7. pack.yaml Contract

```yaml
id: platform
name: Platform Engineering
version: 1.0.0
description: Docker, Kubernetes, CI/CD, Observability, Deployment, SRE

category: capability-pack

triggers:
  keywords:
    - docker
    - kubernetes
    - k8s
    - ci
    - cd
    - jenkins
    - deploy
    - rollback
    - observability
    - prometheus
    - grafana

commands:
  - id: platform.deployment_plan
    file: commands/deployment-plan.md
    mcp_tool: platform.deployment_plan

  - id: platform.docker_review
    file: commands/docker-review.md
    mcp_tool: platform.review_docker

skills:
  - id: platform.docker
    path: skills/docker/SKILL.md

  - id: platform.kubernetes
    path: skills/kubernetes/SKILL.md

depends_on:
  core:
    - production-ready-checklist
    - deployment-checklist
    - observability-checklist
```

---

## 8. AGENTS.md Bootstrap Flow

When installing into another project:

```bash
ai-engineering init
```

Flow:

```text
1. Check target project root.
2. Check AGENTS.md.
3. If AGENTS.md does not exist:
   - create from core/agents/AGENTS.template.md
4. If AGENTS.md exists:
   - preserve local content
   - merge core/agents/AGENTS.baseline.md into managed block
5. Create .ai-engineering/
6. Write manifest.yaml
7. Write lockfile.yaml
```

Managed block:

```md
<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->
... generated baseline rules ...
<!-- AI-ENGINEERING:END AGENTS_BASELINE -->
```

Rules:

```text
- Never overwrite existing AGENTS.md.
- Never modify content outside managed block.
- Purpose stays outside managed block.
- If block exists, update only the block.
- If block does not exist, append it.
- Always create backup before merge.
```

---

## 9. Generated Target Project Structure

After:

```bash
ai-engineering init
ai-engineering install platform security --target cursor
```

target project becomes:

```text
target-project/
├── AGENTS.md
├── .ai-engineering/
│   ├── manifest.yaml
│   ├── installed-packs.yaml
│   ├── lockfile.yaml
│   ├── backups/
│   ├── cache/
│   └── reports/
├── .cursor/
│   └── rules/
├── .mcp.json
└── ...
```

---

## 10. CLI Commands

```bash
ai-engineering init
ai-engineering install <pack>
ai-engineering install <pack...> --target <agent>
ai-engineering uninstall <pack>
ai-engineering list
ai-engineering doctor
ai-engineering validate
ai-engineering update
ai-engineering upgrade
ai-engineering generate-adapter
ai-engineering migrate
ai-engineering migrate --dry-run
ai-engineering migrate --delete-legacy
```

Examples:

```bash
ai-engineering init
ai-engineering install platform
ai-engineering install security
ai-engineering install platform security --target cursor
ai-engineering install data --target codex
ai-engineering migrate --dry-run
ai-engineering doctor
```

---

## 11. CLI Implementation Modules

```text
cli/src/
├── index.ts
├── commands/
│   ├── init.ts
│   ├── install.ts
│   ├── uninstall.ts
│   ├── list.ts
│   ├── update.ts
│   ├── upgrade.ts
│   ├── validate.ts
│   ├── doctor.ts
│   ├── generate-adapter.ts
│   └── migrate.ts
├── services/
│   ├── agents-merger.ts
│   ├── pack-resolver.ts
│   ├── dependency-resolver.ts
│   ├── adapter-generator.ts
│   ├── mcp-config-generator.ts
│   ├── file-merger.ts
│   ├── manifest-writer.ts
│   ├── backup-service.ts
│   ├── legacy-evaluator.ts
│   ├── migration-planner.ts
│   └── legacy-cleaner.ts
└── utils/
    ├── fs.ts
    ├── yaml.ts
    ├── logger.ts
    └── path.ts
```

---

## 12. Migration Steps

### Step 1: Create migration branch

```bash
git checkout -b migration/ai-engineering-structure
git add .
git commit -m "chore: snapshot before ai-engineering migration"
```

### Step 2: Create new root folders

```bash
mkdir -p core/agents
mkdir -p core/routing
mkdir -p core/standards
mkdir -p core/templates
mkdir -p core/checklists
mkdir -p core/schemas
mkdir -p core/prompts
mkdir -p core/workflows

mkdir -p packs/{architecture,application,data,security,quality,platform,knowledge}
mkdir -p mcp-servers/{architecture-mcp,application-mcp,data-mcp,security-mcp,quality-mcp,platform-mcp,knowledge-mcp}
mkdir -p adapters/{claude,codex,cursor,continue,cline,roo,generic}
mkdir -p cli/src/{commands,services,utils}
mkdir -p examples docs tests legacy
mkdir -p docs/migration
```

### Step 3: Rename config

```bash
mv aidk.config.yaml ai-engineering.config.yaml
```

Update internal name:

```yaml
name: ai-engineering-platform
cli: ai-engineering
version: 1.0.0
```

### Step 4: Move AGENTS files

```bash
cp AGENTS.md core/agents/AGENTS.template.md
```

Create baseline-only file:

```text
core/agents/AGENTS.baseline.md
```

Purpose must remain user-managed and must not be placed inside the managed block.

### Step 5: Migrate schemas

```bash
mv schemas/* core/schemas/
```

### Step 6: Migrate references

```text
references/standards/*   → core/standards/
references/templates/*   → core/templates/
references/checklists/*  → core/checklists/
references/prompts/*     → core/prompts/
references/workflows/*   → core/workflows/
```

### Step 7: Migrate skills

Current:

```text
skills/
```

New:

```text
packs/<capability>/skills/
```

Example:

```text
skills/docker/
→ packs/platform/skills/docker/

skills/kubernetes/
→ packs/platform/skills/kubernetes/

skills/owasp/
→ packs/security/skills/owasp-top-10/

skills/postgres/
→ packs/data/skills/postgres/

skills/testing/
→ packs/quality/skills/testing/

skills/documentation/
→ packs/knowledge/skills/documentation/
```

### Step 8: Migrate platform

```text
platform/*
→ packs/platform/*
```

If platform contains generic core files, move them to:

```text
core/
```

### Step 9: Migrate adapters

```text
.claude-plugin/
→ adapters/claude/

.codex/
→ adapters/codex/

.codex-plugin/
→ adapters/codex/legacy/

.cursor-plugin/
→ adapters/cursor/legacy/
```

Then evaluate whether `adapters/*/legacy/` can be deleted after adapter generator is complete.

### Step 10: Migrate scripts

```text
scripts/
→ cli/src/commands/
→ cli/src/services/
```

Shell utilities can stay in:

```text
cli/scripts/
```

### Step 11: Migrate registry

```text
registry/
→ core/routing/
```

Split into:

```text
core/routing/intent-router.yaml
core/routing/command-registry.yaml
core/routing/skill-registry.yaml
```

### Step 12: Create legacy review matrix

```bash
touch docs/migration/legacy-review-matrix.md
```

Every moved or deleted legacy path must be recorded.

### Step 13: Create pack.yaml for every pack

Required files:

```text
packs/architecture/pack.yaml
packs/application/pack.yaml
packs/data/pack.yaml
packs/security/pack.yaml
packs/quality/pack.yaml
packs/platform/pack.yaml
packs/knowledge/pack.yaml
```

### Step 14: Create MCP server skeletons

Each MCP server:

```text
mcp-servers/<name>-mcp/
├── README.md
├── package.json
├── mcp.json
└── src/
    ├── index.ts
    ├── server.ts
    ├── tools/
    ├── resources/
    └── prompts/
```

### Step 15: Update package.json

```json
{
  "name": "ai-engineering-platform",
  "version": "1.0.0",
  "bin": {
    "ai-engineering": "./cli/dist/index.js"
  },
  "scripts": {
    "build": "npm run build:cli",
    "build:cli": "tsc -p cli/tsconfig.json",
    "validate": "node cli/dist/index.js validate",
    "doctor": "node cli/dist/index.js doctor",
    "migrate:dry-run": "node cli/dist/index.js migrate --dry-run"
  }
}
```

---

## 13. Adapter Generation Rules

### Claude target

Generate:

```text
.claude-plugin/
commands/
skills/
.mcp.json
```

### Codex target

Generate:

```text
AGENTS.md
.codex/skills/
agents/openai.yaml
.mcp.json
```

### Cursor target

Generate:

```text
.cursor/rules/
.mcp.json
AGENTS.md
```

### Generic target

Generate:

```text
AGENTS.md
.ai-engineering/
skills/
rules/
.mcp.json
```

---

## 14. MCP Tool Naming

Use consistent naming:

```text
architecture.generate_system_design
architecture.review_architecture
architecture.generate_adr

application.review_source_code
application.generate_service
application.review_api

data.analyze_schema
data.review_index
data.migration_plan

security.scan_source
security.scan_dependencies
security.generate_threat_model

quality.generate_test_plan
quality.review_coverage
quality.performance_review

platform.review_docker
platform.review_kubernetes
platform.deployment_plan

knowledge.generate_readme
knowledge.generate_runbook
knowledge.review_docs
```

---

## 15. Validation Rules

`ai-engineering validate` must check:

```text
- AGENTS.md template exists
- AGENTS baseline exists
- all packs have pack.yaml
- every command has metadata
- every skill has SKILL.md
- routing references valid pack ids
- MCP tools referenced by commands exist
- adapters have templates
- config file valid
- legacy review matrix exists during migration
- no duplicate active flow exists in both legacy and new structure
```

---

## 16. Doctor Rules

`ai-engineering doctor` must check target project:

```text
- AGENTS.md exists
- managed block valid
- .ai-engineering/ exists
- manifest.yaml exists
- installed packs exist
- adapter files generated
- MCP config valid
- no deprecated root plugin folders remain active
```

---

## 17. Deprecated Folders

After migration, these should not remain active at root:

```text
.claude-plugin/
.codex-plugin/
.cursor-plugin/
skills/
platform/
registry/
schemas/
scripts/
reports/
references/
```

Allowed only if intentionally kept as compatibility layer:

```text
legacy/
├── claude-plugin/
├── codex-plugin/
├── cursor-plugin/
├── old-skills/
└── old-registry/
```

---

## 18. Migration Safety

Before migration:

```text
1. Create git branch.
2. Commit current repo.
3. Run migration dry-run.
4. Review legacy matrix.
5. Run migration.
6. Run validation.
7. Compare moved files.
8. Remove deprecated folders only after successful validation.
```

Recommended:

```bash
git checkout -b migration/ai-engineering-structure
git add .
git commit -m "chore: snapshot before ai-engineering migration"
ai-engineering migrate --dry-run
ai-engineering migrate
ai-engineering validate
```

---

## 19. Final Migration Checklist

```text
[ ] ai-engineering.config.yaml created
[ ] core/ created
[ ] core/agents created
[ ] AGENTS template extracted
[ ] AGENTS baseline extracted
[ ] packs created
[ ] all skills moved to packs
[ ] platform moved to packs/platform
[ ] schemas moved to core/schemas
[ ] registry moved to core/routing
[ ] adapters normalized
[ ] mcp-servers skeleton created
[ ] cli renamed to ai-engineering
[ ] package.json bin updated
[ ] legacy review matrix created
[ ] legacy duplicate flows evaluated
[ ] deprecated root folders removed or moved to legacy
[ ] validate command passes
[ ] doctor command passes
```

---

## 20. Recommended Implementation Order

```text
Phase 1: Structure migration
Phase 2: Legacy evaluation matrix
Phase 3: AGENTS.md bootstrap and merge
Phase 4: Pack manifests
Phase 5: CLI init/install/migrate
Phase 6: Adapter generator
Phase 7: MCP server skeleton
Phase 8: Validation and doctor
Phase 9: Legacy cleanup
Phase 10: Documentation update
```

---

## 21. Final Expected Result

After migration, the repository becomes:

```text
AI Engineering Platform
= MCP-first
+ installable capability packs
+ AGENTS.md bootstrap
+ Claude/Codex/Cursor adapter generator
+ enterprise-ready routing and validation
+ safe removal of obsolete legacy flows
```
