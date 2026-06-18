# AI Engineering CLI

`cli/` owns the published `ai-engineering` and `aie` executables, lifecycle
runtime, provider projection, diagnostics, distribution tooling, and tests.

## Folder Map

| Path | Purpose |
| --- | --- |
| `src/index.ts` | Thin executable entrypoint compiled to `dist/index.js`. |
| `src/*.mjs` | Runtime for commands, contracts, lifecycle, projection, state, transactions, migration, doctor, registry, and distribution. |
| `dist/` | Generated CLI output from `npm run build:cli`. |
| `test/` | Node test suite, including install/update/remove and provider matrix checks. |
| `hooks/` | Provider-facing hook launchers. |
| `scripts/` | Retained PowerShell tools, helpers, fixtures, and focused tests. |

## Commands

```text
aie available
aie installed [--scope <project|global>|-g]
aie install <plugin...> --target <provider[,provider...]> [--yes]
aie install application --target codex --yes
aie install --all --target <provider[,provider...]> [--yes]
aie install application --with quality
aie update <plugin...> [--dry-run]
aie update --all
aie remove <plugin...>
aie remove --all
aie check [--scope <project|global>|-g]
aie doctor [--scope <project|global>|-g]
```

`project` is the default scope. Non-interactive installs require `--yes` with
explicit root plugins and providers. Compatibility aliases remain available
through `plugin`, `uninstall`, and `upgrade`.

## Provider Projections

| Provider | Project | Global |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md`, `.codex/config.toml` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md`, `~/.codex/config.toml` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json`, `.mcp.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands`, `~/.claude.json` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `~/.cursor/mcp.json` |

Runtime and lifecycle state are written under `.ai-engineering/` at the selected
scope root.

## Maintainer Commands

```text
aie init
aie validate
aie build --all
aie artifact verify --all
aie registry generate
aie migrate --dry-run
aie migrate --delete-legacy
aie generate-adapter <plugin...> --target <provider[,provider...]>
```

Command Markdown is canonical. `core/routing/command-registry.yaml` is a
deterministic derived index using schema version 2.

## Verification

```bash
npm test
npm run validate
npm run build:cli
```

After changing `cli/src/`, rebuild `dist/`.
