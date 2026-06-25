# AI Engineering Platform

A plugin platform for installing production-grade AI engineering workflows into
Codex, Claude Code, Cursor, and Google Antigravity. The repository keeps one
canonical source for skills, commands, agents, hooks, workflows, schemas, and
provider adapters, then projects that source into each AI IDE's native layout.

Use it when you want AI agents to share the same engineering baseline: read the
right context, route to the right skill, preserve user work, validate changes,
and report evidence instead of guesses.

## Quickstart

Requires Node.js 20 or newer.

```bash
git clone https://github.com/leduyminhh/ai-development-kit.git
cd ai-development-kit
npm install
npm run build
npm link
```

Install capabilities into another project:

```bash
cd /path/to/project

aie init
aie install
aie doctor
```

Common non-interactive installs:

```bash
aie install application --target codex --yes
aie install application --with quality
aie install --all --target codex --yes
aie install --all --target antigravity --yes
aie install --all --target codex -g
```

Both `ai-engineering` and `aie` invoke the same CLI. Use `aie -h` for the
wizard-first command guide.

## Contents

- [Structure](#structure)
- [Detail Structure](#detail-structure)
- [Plugin Catalog](#plugin-catalog)
- [Getting Started](#getting-started)
- [Provider Outputs](#provider-outputs)
- [Maintainer Workflow](#maintainer-workflow)
- [Migration And Docs](#migration-and-docs)

## Structure

| Path | Owns |
| --- | --- |
| `plugins/` | Installable capability plugins. This is the canonical source for skills, commands, agents, hooks, workflows, templates, and schemas. |
| `core/` | Shared agent baseline, routing indexes, schemas, standards, templates, and shared workflows. |
| `adapters/` | Provider-specific projection logic for Codex, Claude Code, Cursor, and Antigravity. |
| `providers/` | MCP registry, config schemas, policies, and non-active examples. |
| `cli/` | `ai-engineering` / `aie` CLI source, generated `dist/`, tests, and shell utilities. |
| `docs/` | Migration notes, implementation plans, design records, and repository documentation. |
| `completions/` | Shell completions for the `aie` command. |

The command registry is derived from canonical command files:
`core/routing/command-registry.yaml` uses schema version 2 and points back to
`plugins/<plugin>/commands/*.md`.

## Detail Structure

Every plugin follows the same shape:

```text
plugins/<plugin>/
  plugin.yaml                       plugin metadata, dependencies, assets
  skills/<skill>/SKILL.md            reusable domain procedure
  skills/<skill>/resources/          optional focused references
  skills/<skill>/subagents/          optional delegated prompts
  skills/<skill>/scripts/            optional validators or helpers
  commands/*.md                      user-facing orchestration contracts
  agents/                            provider-neutral agent definitions
  hooks/                             plugin-owned hooks
  workflows/*.yaml                   installable workflow definitions
  schemas/*.json                     output or config schemas
  templates/                         reusable generated artifacts
  rules/                             plugin-owned rules
```

| Asset | Purpose | Projection |
| --- | --- | --- |
| `plugin.yaml` | Declares plugin id, version, dependencies, supported providers, assets, triggers, and install behavior. | Read by the resolver and lifecycle commands. |
| `skills/<skill>/SKILL.md` | Defines the operating procedure for a reusable capability. | Copied into provider skill locations such as `.agents/skills` or `.claude/skills`. |
| `commands/*.md` | Defines an entry point: intent, inputs, required skills, steps, and output contract. | Rendered into provider command/rule/catalog files. |
| `agents/` | Defines specialized agents where the provider supports them. | Codex receives `.codex/agents`; Claude receives `.claude/agents`; Antigravity receives `agents/`. |
| `hooks/` | Adds audit or provider lifecycle behavior. | Installed only for supported provider flows. |
| `workflows/*.yaml` | Defines deterministic workflow steps and gates. | Installed under `.ai-engineering/workflows/definitions/`. |
| `schemas/*.json` | Validates command or workflow output. | Referenced by command `outputSchema` metadata. |
| `templates/` and `rules/` | Provide reusable generated files and policy fragments. | Projected when the owning provider/plugin uses them. |

## Plugin Catalog

| Plugin | Capability | Required Plugins | Skills | Commands / Workflows |
| --- | --- | --- | --- | --- |
| `architecture` | Architecture boundaries, shared design, patterns, and diagrams. | None | `architecture-onion-design`, `code-shared-design`, `code-design-pattern`, `diagram-generate` | `review-architecture`, `architecture-review-pipeline` |
| `application` | Full-stack feature delivery for Java, Python, React, APIs, Kafka, and Redis. | `architecture`, `quality`, `security`, `data` | `api-contract-design`, `java-implement`, `python-implement`, `react-implement` | `deliver-feature`, `plan-feature`, `implement-backend`, `implement-frontend`, `review-feature`, `test-feature`, `feature-delivery-pipeline` |
| `data` | Database schema and data migration planning. | None | `data-migration` | `plan-migration`, `db-migration-pipeline` |
| `knowledge` | Technical docs, README work, onboarding, changelogs, and release notes. | None | `doc-write`, `release-notes` | `write-technical-doc`, `write-release-notes`, `documentation-pipeline` |
| `platform` | Git workflow, deployment planning, workflow bootstrap, and incident response. | None | `git-workflow-design`, `using-workflow-kit`, `incident-response` | `plan-deployment`, `respond-incident`, `incident-response-pipeline` |
| `quality` | QA review, test automation, naming validation, and verification. | None | `test-qa-review`, `test-automation-validate`, `naming-rule-validate` | `verify-quality`, `quality-verification-pipeline` |
| `security` | Security review for code, configs, dependencies, secrets, and containers. | None | `security-code-review` | `review-security`, `security-audit-pipeline` |

## Getting Started

### Interactive CLI Flow

```bash
aie init
aie install
aie check
aie doctor
aie remove
aie upgrade
```

### Step 1: Install

Run `aie install` to open the wizard. It detects project context, recommends
plugins, supports provider selection, previews the install plan, and can resume
from `.ai-engineering/install/session.json`.

Wizard controls:

- `Up/Down` or `j/k`: move between items.
- `Space`: toggle plugin or provider selections.
- `Enter`: continue or confirm the install plan.
- `Esc` or `q`: cancel.
- `b`: go back from a child step.
- `Install all plugins`: select all plugins; toggle again to clear them.

For CI, pass explicit choices with `--yes`:

```bash
aie install application --target codex --yes
aie install application --with quality
aie install --all --target codex --yes
aie install --all --target antigravity --yes
aie install --all --target codex -g
```

### Step 2: Check

```bash
aie check
aie doctor
```

`aie check` reports installed plugins, skills, commands, agents, workflows, and
MCP registrations. `aie doctor` validates the installed projection or, when run
from this repository root, validates the source repository.

### Step 3: Remove

```bash
aie remove
aie remove security
aie remove --all --yes
```

The remove wizard starts with nothing selected for safety and preserves
user-owned files.

### Step 4: Upgrade

```bash
aie upgrade
aie upgrade --all --yes
aie update platform security --yes
aie upgrade --dry-run
```

Use `aie update` as the direct lifecycle alias for upgrading specific plugins.

## Provider Outputs

All installs store lock, ownership, backup, and runtime state under
`<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md`, `.codex/workflows/commands/*.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `.claude/skills`, `.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `.cursor/mcp.json` |
| Antigravity | `AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` | `.antigravity/AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` |

Managed instruction files preserve user-owned content outside the AI Engineering
baseline block and write backups under `.ai-engineering/backups/`.

## Maintainer Workflow

Build and verify the repository:

```bash
npm run build:cli
npm test
npm run validate
npm run doctor
```

Maintainer commands:

```bash
aie validate
aie schema check <plugin> <json-file> [--schema <relpath>]
aie build --all
aie artifact verify --all
aie registry generate
aie migrate --dry-run
aie migrate --delete-legacy
aie generate-adapter <plugin...> --target <provider[,provider...]>
```

Optional shell completions:

```bash
# Bash
source /path/to/aie-repo/completions/aie.bash

# Zsh
fpath=(/path/to/aie-repo/completions $fpath)
autoload -U compinit && compinit
```

See [SHELL_SETUP.md](SHELL_SETUP.md) for detailed setup.

## Migration And Docs

- [CHANGELOG.md](CHANGELOG.md): release notes and version history.
- [MIGRATION.md](MIGRATION.md): upgrade guide for naming and layout changes.
- [docs/migration/migrate-existing-source-to-plugins-platform.md](docs/migration/migrate-existing-source-to-plugins-platform.md): plugin-first migration target.
- [docs/migration/completion-checklist.md](docs/migration/completion-checklist.md): migration completion criteria.

v1.1 standardizes all 7 plugins around noun-action skills, verb-noun commands,
and domain-pipeline workflows. It consolidates phase-specific feature skills into
stack and domain skills such as `java-implement`, `python-implement`,
`react-implement`, `test-qa-review`, and `test-automation-validate`.

## Change Checklist

- Update English `README.md` first, then synchronize `README_VI.md`.
- Keep command, provider path, and plugin tables aligned with `plugins/`, `adapters/`, and `core/routing/`.
- Run `npm run validate` after structure, command id, provider path, or plugin catalog changes.
