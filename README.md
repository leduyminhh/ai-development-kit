# AI Engineering Platform

AI IDE plugin platform for Codex, Claude Code, Cursor, and Google Antigravity. Canonical capability content lives in `plugins/`; the CLI projects that content into provider-native files, workflow definitions, managed instructions, and optional MCP runtime registrations.

**Version: [v1.1.0](CHANGELOG.md)** — Plugin standardization, shell completions, CI/CD automation

## What's New in v1.1.0

- **Standardized naming** across all 7 plugins: skills (noun-action), commands (verb-noun), workflows (domain-pipeline)
- **Consolidated 7 phase-specific skills** into core implementation skills (java-implement, python-implement, react-implement)
- **Shell completions** for bash/zsh with command, subcommand, and flag completion
- **Release automation** with GitHub Actions CI/CD
- **Comprehensive migration guide** for users upgrading from v1.0

See [CHANGELOG.md](CHANGELOG.md) for details. Upgrading from v1.0? See [MIGRATION.md](MIGRATION.md).

## Install

Requires Node.js 20 or newer.

```bash
git clone https://github.com/leduyminhh/ai-development-kit.git
cd ai-development-kit
npm install
npm run build
npm link
```

Both `ai-engineering` and `aie` invoke the CLI.

### Shell Completions (Optional)

Enable tab-completion in bash/zsh:

```bash
# Bash
source /path/to/aie-repo/completions/aie.bash

# Zsh
fpath=(/path/to/aie-repo/completions $fpath)
autoload -U compinit && compinit
```

See [SHELL_SETUP.md](SHELL_SETUP.md) for detailed setup.

## Quick Workflow

```bash
cd /path/to/project

aie init
aie install
aie check
aie remove
aie upgrade
```

Use `aie -h` or `aie --help` to print the same wizard-first command guide from the CLI.

## Interactive CLI Flow

### Step 1: Install

Run `aie install` in an interactive terminal to open the install wizard. The CLI detects provider signals and project context, recommends plugins, supports `antigravity`, previews the install plan, and can resume an interrupted session from `.ai-engineering/install/session.json`.

Wizard controls:

- `↑/↓` or `j/k`: move between items.
- `Space`: toggle plugin/provider selections.
- `Enter`: continue or confirm the install plan.
- `Esc` or `q`: cancel.
- `b`: return from a child step to the parent step.
- `Install all plugins`: toggles every plugin on; toggling it again clears all selections.

For CI or non-interactive usage, pass explicit choices with `--yes`:

```bash
aie install application --target codex --yes
aie install --all --target codex --yes
aie install --all --target antigravity --yes
aie install application --with quality
```

### Step 2: Check

Run `aie check` after install to verify installed plugins, skills, commands, agents, workflows, and provider-native files.

```bash
aie check
aie doctor
```

### Step 3: Uninstall

Run `aie remove` in an interactive terminal to open the uninstall wizard. It lists installed plugins, starts with nothing selected for safety, supports back/cancel navigation, and requires a final confirmation before removing managed assets while preserving user-owned files.

```bash
aie remove
aie remove security
aie remove --all --yes
```

Use explicit plugin names or `--all --yes` for CI and non-interactive scripts.

### Step 4: Upgrade

Run `aie upgrade` in an interactive terminal to open the upgrade wizard. It checks for outdated plugins, selects available updates by default, supports back/cancel navigation, and requires confirmation before applying changes.

```bash
aie upgrade
aie upgrade --all --yes
aie update platform security --yes
aie upgrade --dry-run
```

Use `aie update` as the lifecycle alias when you want to upgrade specific plugins directly.

Project scope is the default. Use `-g` or `--scope global` for user-global provider locations:

```bash
aie install --all --target codex -g
```

Generated MCP registrations contain absolute local runtime paths, so run install on each machine that will use the provider integration.

## Plugin Standardization (v1.1)

All 7 plugins now follow uniform naming conventions:

| Asset Type | Pattern | Examples |
|----------|---------|----------|
| **Skills** | noun-action | `java-implement`, `react-implement`, `test-qa-review` |
| **Commands** | verb-noun | `plan-migration`, `plan-deployment`, `implement-backend` |
| **Workflows** | domain-pipeline | `feature-delivery-pipeline`, `security-audit-pipeline` |

**Key changes from v1.0:**

- Removed 7 phase-specific feature-* skills; use stack-specific skills instead
  - `feature-implement` → `java-implement`, `python-implement`, `react-implement`
  - `feature-review` → use implementation skills with test skills
  - `feature-plan`, `feature-integrate`, `feature-test`, `feature-fix` → consolidated into commands
- Renamed core skills for consistency
  - `java-analyze` → `java-implement`
  - `python-backend-engineer` → `python-implement`
  - `react-code-generate` → `react-implement`
- Renamed commands to verb-noun order
  - `migration-plan` → `plan-migration`
  - `deployment-plan` → `plan-deployment`
- Renamed workflows for clarity
  - `fullstack-feature` → `feature-delivery-pipeline`

**Migrating from v1.0?** See [MIGRATION.md](MIGRATION.md) for before/after examples.

## Upgrade Plan

- v1 now has interactive install, uninstall, and upgrade wizards, provider/plugin auto-detection, install-all selection, plan preview, resumable install state, and wizard coverage across the main CLI lifecycle tests.
- Next upgrades: template-driven wizard screens, explicit resume prompt, richer project context detection, and dedicated help pages for workflow/maintainer command groups.

## Provider Paths

All scopes store runtime, ownership, lock, and backup data under `<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `.cursor/mcp.json` |
| Antigravity | `AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` | `.antigravity/AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` |

Managed instruction updates preserve user-owned content outside the AI Engineering baseline block and write backups under `.ai-engineering/backups/`.

### Agent projection

Plugin `assets.agents` are projected into runnable agent definitions for **Codex** (`.codex/agents/<id>.toml`, copied), **Claude** (`.claude/agents/<id>.md`), and **Antigravity** (`agents/<id>.md`) — the Markdown forms are rendered from the canonical agent definition. Cursor has no subagent concept and receives managed instructions (`AGENTS.md`) only.

## Repository Structure

```text
adapters/      provider projection logic, hooks, and Codex agent definitions
cli/           CLI runtime, generated dist output, tests, hooks, and shell tools
core/          shared AGENTS policy, routing, schemas, standards, templates, and workflows
docs/          migration records, design specs, and implementation plans
providers/     inactive MCP registry, config schemas, policies, and examples
plugins/       canonical installable plugin manifests, commands, skills, workflows, and schemas
```

Command Markdown in `plugins/<plugin>/commands/*.md` is the canonical command source. `core/routing/command-registry.yaml` is a deterministic derived index using schema version 2.

Workflow definitions live in `core/workflows/` for shared orchestration and in `plugins/<plugin>/workflows/` for plugin-owned installable workflows. Use `aie workflow <subcommand>` to initialize, list, validate, build, run, inspect, and clean workflow runs under `.ai-engineering/workflows/` in a target project.

## Maintainer Commands

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

## Verification

```bash
npm test
npm run validate
npm run build:cli
```

Migration decisions and acceptance notes are recorded in `docs/migration/`, with the current plugin-first target in [`docs/migration/migrate-existing-source-to-plugins-platform.md`](docs/migration/migrate-existing-source-to-plugins-platform.md) and completion criteria in [`docs/migration/completion-checklist.md`](docs/migration/completion-checklist.md).
