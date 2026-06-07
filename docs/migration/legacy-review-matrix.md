# Legacy Review Matrix

| Legacy Path | Type | New Path | Decision | Reason | Validation | Status |
|---|---|---|---|---|---|---|
| `aidk.config.yaml` | config | `ai-engineering.config.yaml` | MOVE_TO_NEW_STRUCTURE | Canonical product and CLI configuration | Platform tests load renamed config | Done |
| `AGENTS.md` | agent rules | `AGENTS.md`, `core/agents/` | MERGE_INTO_NEW_FLOW | Preserve repository rules and add safe bootstrap artifacts | Template, baseline, and merge policy exist | Done |
| `schemas/` | schemas | `core/schemas/` | MOVE_TO_NEW_STRUCTURE | Schemas are core contracts | Files copied and root folder absent | Done |
| `skills/` | skills | `packs/*/skills/` | MOVE_TO_NEW_STRUCTURE | Skills now have capability-pack ownership | Runtime resolves moved skills; full suite passes | Done |
| `packages/` | plugin contracts | `packs/*/pack.yaml`, `packs/*/commands/` | REPLACE_BY_NEW_FLOW | Seven capability packs replace six legacy plugin contracts | Seven-pack contract and runtime tests pass | Done |
| `platform/` | runtime | `packs/platform/` | MOVE_TO_NEW_STRUCTURE | Existing runtime belongs to the platform capability and is exposed through `cli/src` | TypeScript build and full runtime suite pass | Done |
| `registry/` | routing metadata | `core/routing/` | REPLACE_BY_NEW_FLOW | Canonical intent, command, and skill registries use capability-pack ids | Repository validation passes | Done |
| `scripts/` | automation | `cli/src/`, `cli/scripts/` | MERGE_INTO_NEW_FLOW | CLI behavior moved to TypeScript; distinct hook and output utilities remain under `cli/scripts/` | CLI build, Node tests, and focused PowerShell tests | Done |
| `hooks/` | hooks | `cli/hooks/` | MOVE_TO_NEW_STRUCTURE | Hooks are CLI-managed integration behavior | Files copied and root folder absent | Done |
| `.claude-plugin/` | adapter | `adapters/claude/` | REPLACE_BY_NEW_FLOW | Provider projection generates Claude commands and plugin metadata | Adapter lifecycle tests pass | Done |
| `.codex/` | adapter | `adapters/codex/` | MOVE_TO_NEW_STRUCTURE | Codex agents and configuration remain active inputs | Runtime reads agents from new path | Done |
| `.codex-plugin/` | adapter | `adapters/codex/` | REPLACE_BY_NEW_FLOW | Provider projection generates `.codex/` files and rejects deprecated target roots | Adapter and doctor tests pass | Done |
| `.cursor-plugin/` | adapter | `adapters/cursor/` | REPLACE_BY_NEW_FLOW | Provider projection generates `.cursor/rules/` | Adapter lifecycle tests pass | Done |
| `docs/` | documentation | `docs/` | REPLACE_BY_NEW_FLOW | Only the migration spec is carried into the new repository | Spec stored under `docs/migration/` | Done |
| `reports/` | generated output | none | DELETE_LEGACY_FLOW | Generated reports are not source inputs | Folder not imported | Done |

## Compatibility Status

Canonical routing and generated provider adapters no longer consume legacy
registry or static plugin descriptors.
