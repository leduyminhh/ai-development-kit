# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`ai-engineering-platform` (CLI: `ai-engineering` / `aie`) is a tool that projects **canonical AI-agent capability content** into **provider-native files** for Codex, Claude Code, Cursor, and Google Antigravity. You author capabilities once under `plugins/`; the CLI generates the per-provider skills, commands, agents, workflows, managed instruction blocks, and MCP registrations into a target project.

There is no application runtime to start — the deliverable is the CLI and the content it projects.

## Commands

Node.js 20+ required. The CLI build is the only build step.

```bash
npm run build          # tsc -p cli/tsconfig.json  -> compiles cli/src -> cli/dist
npm test               # build:cli, then node --test cli/test/*.mjs
npm run validate       # aie validate (repository contract validation)
npm run doctor         # aie doctor
```

Run a **single test file** (must build first — tests spawn the compiled `cli/dist/index.js`):

```bash
npm run build:cli
node --test cli/test/lifecycle.test.mjs
```

End-user lifecycle (run from inside a *target* project, after `npm link`):

```bash
aie init            # scaffold managed instruction file + .ai-engineering/ state
aie install         # interactive wizard; or: aie install application --target codex --yes
aie check           # verify installed assets
aie remove          # interactive uninstall wizard
aie upgrade         # interactive upgrade wizard
```

Maintainer commands: `aie build --all`, `aie artifact verify --all`, `aie registry generate`, `aie migrate --dry-run`, `aie generate-adapter <plugin...> --target <provider>`.

## Architecture

### Build/runtime mix
`cli/src/index.ts` is the only TypeScript file (thin entry that calls `run()`). All real logic lives in `cli/src/*.mjs` (plain ESM). `tsconfig.json` has `allowJs: true` and includes `**/*.mjs`, so `tsc` type-checks the `.mjs` modules and emits everything to `cli/dist/`. **Tests and the `bin` entry both run from `cli/dist/`, so a build is required before they reflect source changes.**

### The projection pipeline (the core idea)
Content flows one direction: **canonical source → resolved graph → projection input → per-provider plan → files on disk.**

1. **Canonical source** lives in `plugins/<plugin>/` (`plugin.yaml` manifest + `skills/`, `commands/*.md`, `workflows/`, `templates/`, `schemas/`, `rules/`) and shared content in `core/` (AGENTS policy, routing, schemas, standards, templates, workflows). `plugins/<plugin>/commands/*.md` is the **canonical command source**; `core/routing/command-registry.yaml` is a derived index.
2. **`resolver.mjs`** — `resolvePluginGraph()` takes requested plugins, pulls in required dependencies, checks platform/provider compatibility, and computes **ownership** (which plugin owns each skill/command/etc.).
3. **`projection-input.mjs`** — `buildProjectionInput()` turns the resolved graph into a provider-agnostic, schema-validated input (commands, skills, owners, MCP servers).
4. **`providers.mjs`** — dispatches to the per-provider **projector** at `adapters/<provider>/projector.mjs`. Each projector is a pure function `project(input) -> plan` that maps the canonical input into that provider's native file layout (see provider path table in [README.md](README.md)). Input and output are validated by `projection-contracts.mjs`.
5. **`transaction.mjs`** — `planTransaction()` / `applyTransaction()` write the plan atomically, record file checksums + **ownership** in `.ai-engineering/`, create backups, and (on remove) prune now-empty directories. This is what makes install/remove/upgrade safe and reversible.

`builder.mjs` is the maintainer-side path (build artifacts per plugin); `lifecycle.mjs` is the end-user path (install/check/outdated/update/remove against a target project). Both share the resolver + projection layers.

### State and ownership
All managed state lives under `<scope-root>/.ai-engineering/` (see `state.mjs`): `platform.lock`, `ownership.json`, `install-state.json`, plus `backups/` and `install/session.json`. **Ownership tracking is central** — it lets the CLI distinguish platform-managed files (safe to overwrite/remove) from user-owned content (must be preserved). Managed instruction files (`AGENTS.md`, `CLAUDE.md`) are updated *in place*: only the "AI Engineering" baseline block is rewritten (`init.mjs` → `prepareInstructionFileContent`); content outside it is preserved. By default, fully-managed (non-merge-managed) files are written into `<scope-root>/.ai-engineering/build/<relativePath>` and symlinked from their provider destination; on platforms where symlink creation fails (e.g. Windows without Developer Mode), the CLI falls back to a direct copy and emits a warning. The `linkMode` field in `platform.lock` records which mode was used (`"symlink"` or `"copy"`).

### Scope
Every lifecycle command takes a scope: **project** (default) or **global** (`-g` / `--scope global`), which selects different provider file roots. MCP registrations embed absolute local runtime paths, so install must run on each machine.

### Interactive wizards
`install-wizard.mjs`, `uninstall-wizard.mjs`, `upgrade-wizard.mjs` drive terminal UIs. Selection/plan logic is separated from terminal I/O (`install-detection.mjs`, `install-plan.mjs`, `install-request.mjs`, `provider-detection.mjs`) so it is unit-testable without a TTY. `--yes` with explicit choices is the non-interactive/CI path.

### Adding capability content
- New skill/command/workflow → add files under `plugins/<plugin>/` **and** register them in that plugin's `plugin.yaml` (`assets` + `skills` lists). Run `aie validate`.
- New provider behavior → edit `adapters/<provider>/projector.mjs`; keep it a pure projection function and respect `projection-contracts.mjs` schemas.
- Changes affecting projection should be covered by `cli/test/*.test.mjs` (e.g. `projection-contracts.test.mjs`, `plugin-mapping.test.mjs`, `lifecycle.test.mjs`, `*-wizard.test.mjs`).

## Conventions

- The repository-wide agent execution baseline (read-before-write, surgical changes, fail-loud, verification contract) is defined in [AGENTS.md](AGENTS.md) and applies here.
- **Language:** user-facing repository work is written in Vietnamese (proper UTF-8 with diacritics). Most docs ship as paired `README.md` / `README_VI.md`.
- Many source files and fixtures are UTF-8 **with BOM**; preserve existing encoding when editing.
- The PowerShell hook tooling under `cli/scripts/` is a separate subsystem (provider hook adapters, audit, transports) with its own Pester-style tests in `cli/scripts/tests/`.
