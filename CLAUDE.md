# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`ai-engineering-platform` (CLI: `ai-engineering` / `aie`) is a tool that projects **canonical AI-agent capability content** into **provider-native files** for Codex, Claude Code, Cursor, and Google Antigravity. You author capabilities once under `plugins/`; the CLI generates the per-provider skills, commands, agents, workflows, managed instruction blocks, and MCP registrations into a target project.

There is no application runtime to start — the deliverable is the CLI and the content it projects.

## Commands

Node.js 20+ required. Pure ESM — no build step.

```bash
npm test               # node --test "cli/test/*.test.mjs"
npm run build          # node cli/build.mjs  (ghi đầu ra adapter vào build/)
npm run check          # node cli/index.mjs check
```

Run a **single test file** directly (no build required):

```bash
node --test cli/test/build.test.mjs
```

End-user lifecycle (run from inside a *target* project, after `npm link`):

```bash
aie                    # menu wizard tổng
aie install   --provider claude --plugin application --yes
aie uninstall --provider claude [-g] [--yes]
aie build     --provider all
aie check     [-g]
aie list                # liệt kê provider + plugin
aie --help
```

Mọi lệnh trên đều chạy `node cli/index.mjs` — không cần tsc/dist.

## Architecture

### Build/runtime mix
Pure ESM — no TypeScript compilation. `cli/index.mjs` is the entry point (`parseArgs` + `run`). All logic lives in `cli/lib/*.mjs` and `cli/build.mjs`. The `bin` entry and tests all run directly from source — no build step required.

### The projection pipeline (the core idea)
Content flows one direction: **canonical source → model → adapter → files on disk.**

1. **Canonical source** lives in `plugins/<plugin>/` (`plugin.yaml` manifest + `skills/`, `commands/*.md`, `workflows/`, `templates/`, `schemas/`, `rules/`) and shared content in `core/` (AGENTS policy, routing, schemas, standards, templates, workflows).
2. **`cli/lib/plugins.mjs`** — `loadModel()` reads plugin.yaml manifests, resolves dependencies, and builds a flat model (skills, commands, agents, workflows, hooks).
3. **`cli/build.mjs`** — `runBuild()` / `buildProvider()` dispatch to the per-provider adapter at `adapters/<provider>/adapter.mjs`. Each adapter is a pure function `build(model, ctx) -> { files, instruction, mcp }`.
4. **`cli/lib/install.mjs`** — `install()` / `uninstall()` / `check()` apply adapter output to the target project, write files (or symlinks), merge managed blocks in instruction files, and record everything in `.ai-engineering/manifest.json`.

State lives in `<scope-root>/.ai-engineering/manifest.json` (flat JSON). Scope is either **project** (cwd / `AIE_INSTALL_ROOT`) or **global** (home dir).

### State and ownership
All managed state lives under `<scope-root>/.ai-engineering/` (see `state.mjs`): `platform.lock`, `ownership.json`, `install-state.json`, plus `backups/` and `install/session.json`. **Ownership tracking is central** — it lets the CLI distinguish platform-managed files (safe to overwrite/remove) from user-owned content (must be preserved). Managed instruction files (`AGENTS.md`, `CLAUDE.md`) are updated *in place*: only the "AI Engineering" baseline block is rewritten (`init.mjs` → `prepareInstructionFileContent`); content outside it is preserved. By default, fully-managed (non-merge-managed) files are written into `<scope-root>/.ai-engineering/build/<relativePath>` and symlinked from their provider destination; on platforms where symlink creation fails (e.g. Windows without Developer Mode), the CLI falls back to a direct copy and emits a warning. The `linkMode` field in `platform.lock` records which mode was used (`"symlink"` or `"copy"`).

### Scope
Every lifecycle command takes a scope: **project** (default) or **global** (`-g` / `--scope global`), which selects different provider file roots. MCP registrations embed absolute local runtime paths, so install must run on each machine.

### Interactive wizards
`install-wizard.mjs`, `uninstall-wizard.mjs`, `upgrade-wizard.mjs` drive terminal UIs. Selection/plan logic is separated from terminal I/O (`install-detection.mjs`, `install-plan.mjs`, `install-request.mjs`, `provider-detection.mjs`) so it is unit-testable without a TTY. `--yes` with explicit choices is the non-interactive/CI path.

### Adding capability content
- New skill/command/workflow → add files under `plugins/<plugin>/` **and** register them in that plugin's `plugin.yaml` (`assets` + `skills` lists). Run `npm run build` to verify output.
- New provider behavior → edit `adapters/<provider>/adapter.mjs`; keep it a pure function `build(model, ctx) -> { files, instruction, mcp }`.
- Changes affecting projection should be covered by `cli/test/*.test.mjs` (e.g. `adapters.test.mjs`, `build.test.mjs`, `install.test.mjs`, `wizard.test.mjs`).

## Conventions

- The repository-wide agent execution baseline (read-before-write, surgical changes, fail-loud, verification contract) is defined in [AGENTS.md](AGENTS.md) and applies here.
- **Language:** user-facing repository work is written in Vietnamese (proper UTF-8 with diacritics). Most docs ship as paired `README.md` / `README_VI.md`.
- Many source files and fixtures are UTF-8 **with BOM**; preserve existing encoding when editing.
- The PowerShell hook tooling under `cli/scripts/` is a separate subsystem (provider hook adapters, audit, transports) with its own Pester-style tests in `cli/scripts/tests/`.
