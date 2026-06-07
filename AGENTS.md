# AGENTS.md

## Overview

Repository: `ai-engineering-platform`

Purpose:
- Provide MCP-first AI engineering capabilities.
- Package reusable workflows as installable capability packs.
- Generate provider adapters without maintaining duplicate provider-specific flows.

Language:
- Use Vietnamese for user-facing repository work.

## Architecture

- `core/` owns shared agents policy, routing, standards, schemas, templates, prompts, and workflows.
- `packs/<pack>/` owns capability commands, skills, templates, workflows, and schemas.
- `mcp-servers/<pack>-mcp/` exposes namespaced tools for each capability pack.
- `adapters/` owns provider source templates and metadata.
- `cli/` owns the published `ai-engineering` CLI and retained shell utilities.
- `tests/` is reserved for cross-package integration tests.

## Workflow Rules

- Read the relevant pack, runtime code, and tests before editing.
- Keep dependencies directed toward shared `core/` contracts.
- Do not recreate active root `skills/`, `registry/`, `schemas/`, `scripts/`, or provider plugin folders.
- Add or update `pack.yaml` whenever pack commands, skills, dependencies, or adapters change.
- Keep command ids and MCP tool ids namespaced by capability.
- Preserve user content outside the managed AGENTS baseline block.
- Back up an existing `AGENTS.md` before updating its managed block.
- Update `README.md` and `README_VI.md` together.

## Verification

Run:

```powershell
npm test
npm run validate
npm run build:cli
```

For a target-project smoke test:

```powershell
ai-engineering init
ai-engineering install platform security --target cursor
ai-engineering doctor
```

## Safety

- Preserve unrelated user changes.
- Prefer migration dry-runs before deleting legacy paths.
- Do not keep duplicate legacy and canonical flows active.
- Report skipped checks and residual migration risk explicitly.
