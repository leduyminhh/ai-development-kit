# AI Engineering CLI

`cli/` owns the published `ai-engineering` and `aie` executables, lifecycle
runtime, provider projection, diagnostics, distribution tooling, and tests.

## Folder Map

| Path | Purpose |
| --- | --- |
| `src/index.ts` | Thin executable entrypoint compiled to `dist/index.js`. |
| `src/*.mjs` | Commands, contracts, lifecycle, provider projection, state, transaction, migration, doctor, registry, and distribution runtime. |
| `dist/` | Generated CLI output from `npm run build:cli`. |
| `test/` | Node test suite, including install/update/remove and adapter smoke matrices. |
| `hooks/` | Provider-facing hook launchers. |
| `scripts/` | Retained PowerShell hook tools, helpers, fixtures, and focused tests. |

## User Commands

```text
aie available
aie installed [--scope <project|global>|-g]
aie install <plugin...> --target <provider[,provider...]>
aie install --all --target <provider[,provider...]>
aie update <plugin...> [--dry-run]
aie update --all
aie remove <plugin...>
aie remove --all
aie check [--scope <project|global>|-g]
aie doctor [--scope <project|global>|-g]
```

Compatibility aliases remain available through `plugin install`, `plugin
remove`, `plugin list`, `plugin outdated`, `plugin update`, `uninstall`, and
`upgrade`.

`project` is the default scope. `update` compares installed versions with the
canonical manifests available in the current CLI source and preserves every
installed root plugin while rebuilding the desired state.

## Provider Projections

| Provider | Project | Global |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md`, `.codex/config.toml` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md`, `~/.codex/config.toml` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json`, `.mcp.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands`, `~/.claude.json` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `~/.cursor/mcp.json` |

Runtime and lifecycle state are written under `.ai-engineering/` at the selected
scope root. Managed instruction files are backed up before their baseline block
is refreshed.

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

## Verification

```bash
npm test
npm run validate
npm run build:cli
```

After changing `cli/src/`, rebuild `dist/`. Keep canonical plugin content under
`plugins/`; provider-specific generation belongs in `cli/src/providers.mjs`,
`cli/src/lifecycle.mjs`, and `adapters/`.

## Hybrid Install Contract

Interactive install collects only missing choices, renders the exact projection
preview, and ends with `Install / Back / Cancel`. CI must provide explicit
plugins and providers:

```bash
aie install application --target codex --yes
aie install application --with quality
```

Command Markdown is canonical. `core/routing/command-registry.yaml` is a
deterministic derived index using schema version 2; it is not a second semantic
source.
