# AI Engineering CLI

`cli/` owns the published `ai-engineering` executable and the shell hook tools
that still need to ship with the platform. The command runtime and its tests
live in this package; capability packs contain only installable capability
content.

## Folder Map

| Path | Purpose |
| --- | --- |
| `src/index.ts` | Thin Node executable. It imports the sibling CLI runtime and forwards `process.argv`. |
| `src/*.mjs` | CLI command, lifecycle, validation, migration, state, transaction, and distribution runtime. |
| `dist/index.js` | Generated executable output from `npm run build:cli`; root and package bins point here. |
| `test/` | Node tests for CLI commands, contracts, lifecycle, providers, transactions, and distribution. |
| `scripts/bin/` | Runnable PowerShell hook tools: install, invoke, doctor, service, audit query, trace view, and output-path resolution. |
| `scripts/hooks/` | Hook runtime modules grouped by `core/`, `adapters/`, `transports/`, and test `fixtures/`. |
| `scripts/lib/` | Shared PowerShell helpers for Codex config and output-path parsing. |
| `scripts/tests/` | Focused PowerShell tests for hook runtime, installer, doctor, query, service, and script helpers. |
| `hooks/` | Provider-facing plugin hook launchers used by generated adapter/plugin artifacts. |
| `package.json` | CLI package metadata and `ai-engineering` bin mapping. |
| `tsconfig.json` | TypeScript build config for `src/` to `dist/`. |

Removed from the active CLI surface: the old `src/commands/`, `src/services/`,
and `src/utils/` TypeScript wrappers. They only delegated to platform modules and
created a duplicate-looking command tree without owning runtime behavior.

## Command Runtime

The executable delegates to the runtime in `cli/src`, which currently exposes:

```text
ai-engineering --help
ai-engineering --version
ai-engineering init
ai-engineering doctor
ai-engineering validate
ai-engineering build --all
ai-engineering artifact verify --all
ai-engineering registry generate
ai-engineering install <pack...> --target <agent>
ai-engineering install --all
ai-engineering uninstall <pack...>
ai-engineering remove --all
ai-engineering list
ai-engineering plugin list
ai-engineering plugin outdated
ai-engineering update <pack...>
ai-engineering update --all
ai-engineering upgrade
ai-engineering plugin update <plugin>
ai-engineering generate-adapter <pack...> --target <agent>
ai-engineering migrate --dry-run
ai-engineering migrate --delete-legacy
ai-engineering plugin install <plugin...>
ai-engineering plugin remove <plugin...>
```

## Verification

Build the executable wrapper:

```bash
npm run build:cli
```

Run repository checks from the root:

```bash
npm test
npm run validate
npm run build:cli
```

Run focused shell checks after changing `cli/scripts/`:

```powershell
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-resolve-output-file.ps1
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-hook-core.ps1
powershell -ExecutionPolicy Bypass -File cli/scripts/tests/test-install-hooks.ps1
```

## Change Rules

- Keep CLI command behavior and lifecycle runtime under `cli/src/`.
- Keep `packs/<pack>/` limited to capability commands, skills, templates,
  workflows, schemas, and pack metadata.
- Keep `src/index.ts` small enough to remain an executable bridge.
- Rebuild `dist/` after TypeScript or runtime JavaScript changes.
- Put runnable shell entrypoints under `scripts/bin/`, reusable hook modules under
  `scripts/hooks/`, shared helpers under `scripts/lib/`, and tests under
  `scripts/tests/`.
- Update `README.md` first, then synchronize `README_VI.md`.
