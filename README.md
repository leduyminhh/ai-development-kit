# AI Engineering Platform

AI IDE plugin platform for Codex, Claude Code, and Cursor. Canonical capability
content lives in `plugins/`; the CLI projects that content into provider-native
files and optional MCP runtime registrations.

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
aie install --all --target codex,claude,cursor

aie doctor
aie check
aie available
aie installed

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
provider targets. Interactive installs ask only for missing choices and preview
the plan before writing files.

Generated MCP registrations contain absolute local runtime paths, so run install
on each machine that will use the provider integration.

## Provider Paths

All scopes store runtime, ownership, lock, and backup data under
`<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules` | Provider MCP config is not generated until active tools exist. |

Managed instruction updates preserve user-owned content outside the AI
Engineering baseline block and write backups under `.ai-engineering/backups/`.

## Repository Structure

```text
adapters/      provider projection metadata and Codex agent definitions
cli/           CLI runtime, generated dist output, tests, hooks, and shell tools
core/          shared policy, routing, schemas, templates, prompts, and workflows
docs/          migration records and implementation plans
providers/     MCP registry, config schemas, policies, and examples
plugins/       canonical installable plugin manifests, commands, and skills
```

Command Markdown in `plugins/<plugin>/commands/*.md` is the canonical command
source. `core/routing/command-registry.yaml` is a deterministic derived index
using schema version 2.

## Maintainer Commands

```bash
aie validate
aie build --all
aie artifact verify --all
aie registry generate
aie migrate --dry-run
aie migrate --delete-legacy
```

## Verification

```bash
npm test
npm run validate
npm run build:cli
```

Migration decisions are recorded in
[`docs/migration/legacy-review-matrix.md`](docs/migration/legacy-review-matrix.md).
