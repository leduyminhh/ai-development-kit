# Multi-IDE Plugin Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize canonical plugins so the platform can emit provider-native packages for Codex, Claude Code, Cursor, and Google Antigravity from one source of truth.

**Architecture:** Keep `plugins/<plugin>/plugin.yaml` as the repository canonical manifest and extend it toward the portable spec fields instead of introducing a separate `plugin.spec.json` source. Provider-specific output remains isolated in `adapters/<provider>/projector.mjs`; shared validation and normalized projection input stay in `cli/src/*`.

**Tech Stack:** Node.js ESM, TypeScript build via `tsc`, Node test runner, JSON/YAML manifests, existing CLI projection contracts.

---

## File Structure

- Modify: `core/schemas/plugin-artifact.schema.json` to validate portable marketplace fields, target support, rules, assets, and mcp metadata.
- Modify: `cli/src/contracts.mjs` to normalize legacy and portable plugin manifest fields into one internal plugin model.
- Modify: `cli/src/projection-contracts.mjs` to include `antigravity` in supported providers and validate new asset types without weakening path containment.
- Modify: `cli/src/projection-input.mjs` to include rules, marketplace metadata, assets, hooks, and agents in provider-neutral input.
- Modify: `cli/src/providers.mjs` to load projectors through a provider registry and expose `projectAntigravity`.
- Modify: `cli/src/provider-detection.mjs` to detect Antigravity project markers.
- Create: `adapters/antigravity/projector.mjs` for Antigravity-native output.
- Create: `adapters/antigravity/hooks.json` if hooks are supported as install metadata.
- Modify: `adapters/codex/projector.mjs`, `adapters/claude/projector.mjs`, and `adapters/cursor/projector.mjs` to emit marketplace/package metadata from the normalized model.
- Modify: `ai-engineering.config.yaml` to add `antigravity` to enabled providers.
- Modify: all `plugins/*/plugin.yaml` to declare `compatibility.providers.antigravity` and portable metadata consistently.
- Modify: `README.md`, `README_VI.md`, `adapters/*/README.md` where present, and provider docs to document target layouts.
- Add/modify tests in `cli/test/projection-contracts.test.mjs`, `cli/test/providers.test.mjs`, `cli/test/provider-detection.test.mjs`, `cli/test/plugin-mapping.test.mjs`, and `cli/test/adapter-smoke.test.mjs`.

## Target Layout Decision

Use the external spec as the target contract, adapted to this repo's existing projection model:

| Canonical plugin asset | Codex | Claude Code | Cursor | Antigravity |
| --- | --- | --- | --- | --- |
| skills | `.agents/skills/<id>` for current install flow; package emitter may also expose `skills/<name>/SKILL.md` | `.claude/skills/<id>` | no first-class install until Cursor skill support is defined | `skills/<name>/SKILL.md` |
| commands | `.codex/workflows/commands.md` | `.claude/commands/<slug>.md` | `.cursor/rules/<slug>.mdc` | optional command copy, initially omitted unless command runtime is defined |
| rules | AGENTS managed baseline plus future `rules/*.md` package assets | optional | `.cursor/rules/*.mdc` | `rules/*.md` |
| hooks | provider metadata only until runtime hook execution is defined | provider metadata only | optional | `hooks/hooks.json` |
| MCP | `.codex/config.toml` | `.mcp.json` project / `.claude.json` global | `.cursor/mcp.json` | `mcp/mcp.json` |
| manifest | `.codex-plugin/plugin.json` for package mode; `.codex/agents/openai.yaml` remains current install manifest | `.claude-plugin/plugin.json` | `cursor-plugin.json` plus `.cursor/rules/provider.json` | `antigravity-plugin.json` |

## Phase 1: Normalize Canonical Plugin Metadata

### Task 1: Extend Plugin Schema

**Files:**
- Modify: `core/schemas/plugin-artifact.schema.json`
- Modify: `cli/test/contracts.test.mjs`

- [ ] Add schema properties for `displayName`, `developerName`, `category`, `icon`, `logo`, `assets.rules`, `assets.templates`, `assets.schemas`, `assets.workflows`, and provider compatibility keys `codex`, `claude`, `cursor`, `antigravity`.
- [ ] Require plugin ids to remain kebab-case and versions to remain semver-compatible with current tests.
- [ ] Add a failing schema test that loads a fixture with `compatibility.providers.antigravity: supported` and marketplace fields.
- [ ] Run `npm run build:cli` and the focused contract test; expected result before implementation is a schema validation failure.
- [ ] Implement schema changes until the focused test passes.

### Task 2: Normalize Plugin Loading

**Files:**
- Modify: `cli/src/contracts.mjs`
- Modify: `cli/test/plugin-mapping.test.mjs`

- [ ] Add a small normalization helper that maps existing `metadata.name` to `displayName` when no explicit `displayName` exists.
- [ ] Preserve current fields `metadata`, `compatibility`, `dependencies`, and `assets` so existing resolver behavior does not change.
- [ ] Add tests proving old manifests and enriched manifests both load into the same internal plugin shape.
- [ ] Run `node --test cli/test/plugin-mapping.test.mjs`.

## Phase 2: Promote Provider Registry

### Task 3: Replace Hard-Coded Provider Set

**Files:**
- Modify: `cli/src/projection-contracts.mjs`
- Modify: `cli/src/providers.mjs`
- Modify: `cli/test/projection-contracts.test.mjs`
- Modify: `cli/test/providers.test.mjs`

- [ ] Define one provider list containing `codex`, `claude`, `cursor`, and `antigravity`.
- [ ] Use that list in projection validation and projector loading.
- [ ] Keep error code `AI_ENGINEERING_INCOMPATIBLE` for unsupported providers.
- [ ] Add tests that `validateProjectionPlan` accepts `antigravity` and rejects an unknown provider.
- [ ] Add tests that `projectProviders(arrayInput)` can include `antigravity` without changing existing Codex/Claude/Cursor outputs.

### Task 4: Add Antigravity Detection

**Files:**
- Modify: `cli/src/provider-detection.mjs`
- Modify: `cli/test/provider-detection.test.mjs`

- [ ] Detect Antigravity with `.antigravity`, `antigravity-plugin.json`, or `ANTIGRAVITY.md` project markers.
- [ ] Keep provider detection sorted for deterministic output.
- [ ] Add tests for Antigravity-only and multi-provider detection.

## Phase 3: Add Antigravity Adapter

### Task 5: Implement Antigravity Projector

**Files:**
- Create: `adapters/antigravity/projector.mjs`
- Create: `adapters/antigravity/hooks.json`
- Modify: `cli/test/providers.test.mjs`
- Modify: `cli/test/adapter-smoke.test.mjs`

- [ ] Start with a failing test expecting project-scope Antigravity destinations: `antigravity-plugin.json`, `skills/<id>`, `rules/provider.json`, and `mcp/mcp.json`.
- [ ] Implement `project(input)` returning `schemaVersion: 1`, `provider: "antigravity"`, sorted assets, instruction destination `AGENTS.md`, and MCP config destination `mcp/mcp.json`.
- [ ] Render `antigravity-plugin.json` with `apiVersion`, `kind: "ProviderProjection"`, `provider`, `plugins`, `skills`, `commands`, `rules`, `hooks`, `agents`, and marketplace fields available from input.
- [ ] Do not claim official Antigravity marketplace compatibility beyond the version-sensitive fields from the spec.
- [ ] Run `node --test cli/test/providers.test.mjs cli/test/adapter-smoke.test.mjs`.

## Phase 4: Emit Marketplace Wrappers Per IDE

### Task 6: Codex Package Metadata

**Files:**
- Modify: `adapters/codex/projector.mjs`
- Modify: `cli/test/providers.test.mjs`

- [ ] Keep existing install destinations unchanged.
- [ ] Add package-mode render assets `.codex-plugin/plugin.json` and `.agents/plugins/marketplace.json` only if the install/projection mode supports package emission; otherwise add them behind an explicit projection option.
- [ ] Test that current install flow remains backward-compatible.

### Task 7: Claude Package Metadata

**Files:**
- Modify: `adapters/claude/projector.mjs`
- Modify: `cli/test/providers.test.mjs`

- [ ] Keep `.claude-plugin/plugin.json` current behavior.
- [ ] Add `.claude-plugin/marketplace.json` in package emission mode.
- [ ] Preserve project/global path split: `.mcp.json` for project, `.claude.json` for global.

### Task 8: Cursor Package Metadata

**Files:**
- Modify: `adapters/cursor/projector.mjs`
- Modify: `cli/test/providers.test.mjs`

- [ ] Continue rendering `.cursor/rules/provider.json` and `.cursor/rules/<slug>.mdc` for project scope.
- [ ] Add `cursor-plugin.json` package metadata when package emission is enabled.
- [ ] Keep global Cursor projection empty except MCP config unless a future Cursor global package path is defined.

## Phase 5: CLI Surface and Docs

### Task 9: Enable Antigravity in Config and Install Flow

**Files:**
- Modify: `ai-engineering.config.yaml`
- Modify: `cli/src/install-request.mjs`
- Modify: `cli/src/install-plan.mjs`
- Modify: related tests under `cli/test/install-*.test.mjs`

- [ ] Add `antigravity` to configured providers.
- [ ] Ensure `aie install --target antigravity` validates and plans provider-native assets.
- [ ] Ensure `aie install --all --target codex,claude,cursor,antigravity` remains deterministic.
- [ ] Add tests for explicit target and multi-target parsing.

### Task 10: Update Plugin Manifests

**Files:**
- Modify: `plugins/application/plugin.yaml`
- Modify: `plugins/architecture/plugin.yaml`
- Modify: `plugins/data/plugin.yaml`
- Modify: `plugins/knowledge/plugin.yaml`
- Modify: `plugins/platform/plugin.yaml`
- Modify: `plugins/quality/plugin.yaml`
- Modify: `plugins/security/plugin.yaml`

- [ ] Add `compatibility.providers.antigravity: supported` only after Task 5 and install-flow tests pass.
- [ ] Add portable metadata fields consistently: `displayName`, `developerName`, `category`, and optional asset references when files exist.
- [ ] Do not add nonexistent icon/logo paths.
- [ ] Run `npm run validate` after manifest updates.

### Task 11: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `README_VI.md`
- Modify: `plugins/README.md`
- Modify: `plugins/README_VI.md`
- Modify: `providers/README.md`
- Modify: `providers/README_VI.md`
- Modify/Create: `adapters/antigravity/README.md`

- [ ] Document the four IDE targets and output paths.
- [ ] Update English README first, then Vietnamese sibling in the same change per `AGENTS.md`.
- [ ] Preserve UTF-8 Vietnamese with diacritics; verify the file displays correctly outside mojibake-prone terminal output.

## Phase 6: Validation and Release Safety

### Task 12: Full Verification

**Files:**
- No source edits unless verification exposes a defect.

- [ ] Run `npm run build:cli`.
- [ ] Run `npm test`.
- [ ] Run `npm run validate`.
- [ ] Run `npm run doctor`.
- [ ] Run smoke test in a temporary target project: `ai-engineering init`, `ai-engineering install platform security --target antigravity --yes`, `ai-engineering doctor`.
- [ ] Report any skipped checks, especially if Antigravity official marketplace schema remains unverified.

## Residual Risks

- Google Antigravity marketplace schema is version-sensitive in the spec. Treat `antigravity-plugin.json` as a local package metadata contract until an official schema is confirmed.
- Cursor marketplace packaging is also version-sensitive; keep package metadata isolated from current project install behavior.
- The repo currently has generated `cli/dist/*` modifications in the worktree. Do not revert them; rebuild only when implementing and report generated-file churn explicitly.

## Execution Order

1. Phase 1: normalize canonical plugin metadata.
2. Phase 2: promote provider registry and add Antigravity as a valid provider.
3. Phase 3: implement Antigravity adapter.
4. Phase 4: add package/marketplace wrappers behind explicit projection behavior.
5. Phase 5: update manifests and docs.
6. Phase 6: run full validation and smoke tests.

## Self-Review

- Spec coverage: canonical source, target wrappers, Antigravity adapter, path mapping, validation checklist, CLI target support, and version-sensitive areas are covered.
- Scope decision: this plan implements standardization inside the existing `ai-engineering-platform` projection architecture, not a separate `plugin-generator/` package. A standalone generator should be a later plan if the CLI must emit distributable marketplace bundles outside install flow.
- Ambiguity resolved: Antigravity output uses `antigravity-plugin.json`, `skills/*/SKILL.md`, `rules/*.md`, `hooks/hooks.json`, and `mcp/mcp.json` per spec, but official marketplace claims remain explicitly out of scope until validated.
