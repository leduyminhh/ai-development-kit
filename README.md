# AI Engineering Platform

An MCP-first engineering platform built from installable capability packs, safe
project bootstrap, and generated adapters for Codex, Claude, and Cursor.

## Capabilities

- Seven capability packs: architecture, application, data, security, quality, platform, and knowledge.
- One MCP server contract per capability pack.
- Safe `AGENTS.md` creation and managed-block merge with backup.
- Dependency-aware pack installation and removal.
- Native MCP configuration for Codex, Claude, and Cursor.
- Project-scoped and user-global installation.
- Repository validation, target-project doctor, migration planning, and cleanup.

## Install

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/leduyminhh/ai-development-kit.git
cd ai-development-kit
npm install
npm run build
npm link
```

## CLI

```bash
ai-engineering init
ai-engineering install application --target cursor --scope project
ai-engineering install --all --target codex,claude,cursor --scope global
ai-engineering doctor --scope project
ai-engineering doctor --scope global
ai-engineering uninstall security --scope project
ai-engineering list --scope global
ai-engineering update application
ai-engineering upgrade
ai-engineering generate-adapter quality --target codex
ai-engineering validate
ai-engineering migrate --dry-run
ai-engineering migrate --delete-legacy
```

`init` never overwrites project-owned AGENTS content. It creates or updates only
the managed baseline block and writes state under `.ai-engineering/`.

Project scope writes runtime files below `<project>/.ai-engineering/`. Global
scope writes them below `<home>/.ai-engineering/` and does not generate project
commands, skills, rules, or `AGENTS.md`.

Each machine must run the install command because stdio MCP registrations use
absolute entrypoint paths on that machine.

## Structure

```text
core/          shared contracts, routing, policy, templates, and schemas
packs/         installable capability packs
mcp-servers/   namespaced MCP server skeletons
adapters/      provider source templates and metadata
cli/           TypeScript CLI and retained shell utilities
docs/          migration and architecture documentation
tests/         cross-package integration tests
```

Each pack contains:

```text
README.md
pack.yaml
commands/
skills/
templates/
workflows/
schemas/
```

## Development

```bash
npm test
npm run validate
npm run build:cli
```

The migration decision record is
[`docs/migration/legacy-review-matrix.md`](docs/migration/legacy-review-matrix.md).
