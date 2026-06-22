# AI Engineering Platform

AI IDE plugin platform for Codex, Claude Code, Cursor, and Google Antigravity. Canonical capability
content lives in `plugins/`; the CLI projects that content into provider-native
files, workflow definitions, managed instructions, and optional MCP runtime
registrations.

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

## Quick Workflow

```bash
cd /path/to/project

aie init
aie install --all --target codex
aie install --all --target claude
aie install --all --target cursor
aie install --all --target antigravity
aie install --all --target codex,claude,cursor
aie install --all --target codex,claude,cursor,antigravity

aie doctor
aie check
aie available
aie installed

aie workflow list
aie workflow validate
aie workflow build fullstack-feature

aie update application
aie update --all
aie remove security
aie remove --all
```

Install selected plugins or optional dependencies when you do not need the full
set:

```bash
aie install application --target codex --yes
aie install security quality --target cursor
aie install application --with quality
```

Project scope is the default. Use `-g` or `--scope global` for user-global
provider locations:

```bash
aie install --all --target codex -g
```

Non-interactive installs must pass `--yes` with explicit root plugins and
provider targets. Interactive installs auto-detect providers and recommend
plugins based on project context. Use Space to toggle selections, Enter to
continue, or choose Install all plugins to install everything. The session
can be resumed if interrupted.

Generated MCP registrations contain absolute local runtime paths, so run install
on each machine that will use the provider integration.

## Provider Paths

All scopes store runtime, ownership, lock, and backup data under
`<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `.cursor/mcp.json` |
| Antigravity | `AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` | `.antigravity/AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` |

Managed instruction updates preserve user-owned content outside the AI
Engineering baseline block and write backups under `.ai-engineering/backups/`.

## Repository Structure

```text
adapters/      provider projection logic, hooks, and Codex agent definitions
cli/           CLI runtime, generated dist output, tests, hooks, and shell tools
core/          shared AGENTS policy, routing, schemas, standards, templates, and workflows
docs/          migration records, design specs, and implementation plans
providers/     inactive MCP registry, config schemas, policies, and examples
plugins/       canonical installable plugin manifests, commands, skills, workflows, and schemas
```

Command Markdown in `plugins/<plugin>/commands/*.md` is the canonical command
source. `core/routing/command-registry.yaml` is a deterministic derived index
using schema version 2.

Workflow definitions live in `core/workflows/` for shared orchestration and in
`plugins/<plugin>/workflows/` for plugin-owned installable workflows. The CLI can
initialize, list, validate, build, run, inspect, and clean workflow runs under
`.ai-engineering/workflows/` in a target project.

## Maintainer Commands

```bash
aie validate
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

Migration decisions and acceptance notes are recorded in `docs/migration/`, with
the current plugin-first target in
[`docs/migration/migrate-existing-source-to-plugins-platform.md`](docs/migration/migrate-existing-source-to-plugins-platform.md)
and completion criteria in
[`docs/migration/completion-checklist.md`](docs/migration/completion-checklist.md).
