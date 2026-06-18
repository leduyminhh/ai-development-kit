# AI Engineering Platform

AI IDE plugin platform for Codex, Claude Code, and Cursor. Canonical capability
content lives in `plugins/`; provider-specific projections are produced by the
CLI and `adapters/`. MCP servers are an optional runtime layer.

## Capabilities

- Seven installable plugins: architecture, application, data, security, quality,
  platform, and knowledge.
- Dependency-aware install, update, remove, listing, and diagnostics.
- Project and user-global projections for Codex, Claude, and Cursor.
- Managed instruction files that preserve user-owned content and create backups.
- Transactional ownership tracking for generated files and merged MCP configs.

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

## Project Workflow

```bash
cd /path/to/project

# Initialize the managed AGENTS baseline.
aie init

# Install one provider or all supported providers.
aie install --all --target codex
aie install --all --target claude
aie install --all --target cursor
aie install --all --target codex,claude,cursor

# Verify the completed installation.
aie doctor
aie check

# Inspect, update, and remove plugins.
aie available
aie installed
aie update application
aie update --all
aie remove security
aie remove --all

# Install a smaller plugin set when needed.
aie install application --target codex
aie install security quality --target cursor

# Install into user-global provider locations.
aie install --all --target codex -g
aie install --all --target claude -g
aie install --all --target cursor -g
```

`update` compares installed versions with the canonical plugin manifests in the
current CLI source, then rebuilds the complete installed root-plugin set. Remote
registry artifact download is not part of the current lifecycle.

Generated MCP registrations contain absolute local runtime paths, so installation
must be run on each machine.

## Native Provider Paths

All scopes store runtime, ownership, lock, and backup data under
`<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md`, `.codex/config.toml` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md`, `~/.codex/config.toml` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json`, `.mcp.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands`, `~/.claude.json` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `~/.cursor/mcp.json` |

Managed instruction updates preserve content outside the AI Engineering baseline
block and write backups below `.ai-engineering/backups/`.

## Repository Structure

```text
adapters/      provider-owned source metadata and Codex agent definitions
cli/           CLI runtime, generated dist output, tests, hooks, and shell tools
core/          shared policy, routing, schemas, templates, prompts, and workflows
docs/          migration records and implementation plans
mcp-servers/   optional namespaced MCP runtime servers
plugins/       canonical installable plugin manifests, commands, and skills
```

Each `plugins/<plugin-id>/` uses this canonical boundary:

```text
plugin.yaml
commands/
skills/
agents/
rules/
templates/
workflows/
schemas/
```

Unused asset groups are declared as `none` in `plugin.yaml`. Do not add
placeholder README files solely to keep directories alive. The deprecated
`packs/` source root is no longer active.

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
