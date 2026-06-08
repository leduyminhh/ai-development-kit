# AI Engineering Platform

An MCP-first engineering platform built from installable capability packs, safe
project bootstrap, and generated adapters for Codex, Claude, and Cursor.

## Capabilities

- Seven capability packs: architecture, application, data, security, quality, platform, and knowledge.
- One MCP server contract per capability pack.
- Safe `AGENTS.md` creation and managed-block merge with backup.
- Dependency-aware pack installation and removal.
- Generated provider adapters and `.mcp.json`.
- Repository validation, target-project doctor, migration planning, and cleanup.

## Install

Requirements: Node.js 20 or newer.

```bash
npm install
npm run build
npm link
```

## CLI

```bash
ai-engineering init
ai-engineering install application
ai-engineering install platform security --target cursor
ai-engineering uninstall security
ai-engineering list
ai-engineering update application
ai-engineering upgrade
ai-engineering generate-adapter quality --target codex
ai-engineering validate
ai-engineering doctor
ai-engineering migrate --dry-run
ai-engineering migrate --delete-legacy
```

`init` never overwrites project-owned AGENTS content. It creates or updates only
the managed baseline block and writes state under `.ai-engineering/`.

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
