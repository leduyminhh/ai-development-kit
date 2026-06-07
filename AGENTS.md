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
- At the repository root and in immediate child directories only (depth 0-1),
  every `README.md` must have a sibling `README_VI.md`.
- Update the English `README.md` first, then synchronize the sibling
  `README_VI.md` in the same change.
- This bilingual README rule does not apply below depth 1.

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

<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->
## AI Engineering Baseline

This managed block is the repository-wide execution baseline for AI agents. It
does not replace domain skills; it makes agents read the right context, preserve
user work, validate deterministically, and report evidence before claiming
completion.

### Core Process

1. Classify the task and identify the minimum relevant files, skills, and repo
   rules.
2. Read before writing, including target instruction files such as `AGENTS.md`
   or `CLAUDE.md`.
3. Apply `mustHave` rules first; apply optional rules only when they improve
   safety or clarity.
4. Keep edits surgical and preserve unrelated user changes.
5. Run deterministic validation that proves the request, then report exact
   commands, skipped checks, blockers, and residual risk.

### Must-Have Rules

1. Think before coding. Inspect relevant code, config, skill, or test paths
   before editing. For multi-step work, state the approach once enough context is
   known.
2. Prefer simplicity first. Choose the smallest clear change that satisfies the
   request. Avoid new abstractions unless they remove real complexity or match an
   established repo pattern.
3. Make surgical changes. Touch only files needed for the current goal. Preserve
   unrelated user changes and avoid broad restructuring.
4. Surface conflicts. When instructions, configs, tests, or references disagree,
   identify the conflict and choose by priority or ask only when the decision is
   risky and cannot be inferred.
5. Read before writing. Read targeted source files before modifying them. Do not
   bulk-scan protected paths or external references.
6. Test intent, not only behavior. Prefer tests and validation that prove the
   requested requirement, regression risk, or invariant. For production-facing
   changes, report operational, security, rollback, and maintainability risks.
7. Match codebase conventions. Follow local naming, folder placement,
   validation, commit, and protected-path rules before introducing a new
   convention.
8. Use generated code comments sparingly. Add comments only where purpose or flow
   is not obvious, especially around complex generated functions.
9. Keep solutions production-ready. Do not present work as production-ready
   unless validation, residual risks, and rollback considerations are addressed
   or explicitly scoped out.
10. Fail loud. Do not claim completion without evidence. Report blockers,
    skipped verification, uncertainty, and residual risk explicitly.

### Optional Rules

1. Goal-driven execution. Define the success condition for ambiguous or
   long-running tasks before implementation.
2. Use deterministic tools before judgment. Use scripts, validators, tests,
   parsers, and structured repo signals for mechanical checks.
3. Token discipline. Prefer targeted reads, summaries, and progressive
   disclosure. Treat token limits as a reason to narrow scope, not to skip
   validation.
4. Checkpoint significant steps. For long tasks, report concise checkpoints after
   planning, editing, verification, and publishing.

### Project-Start Commands

- `init` or `-init`: copy the canonical project-start template first, then merge
  compatible existing project-specific instructions without silently overwriting
  user-owned content.
- `agents.md` or `-agents.md`: use the same flow when the task is specifically
  to create, inspect, or update project agent instructions.

### Verification Contract

- Relevant files were read before editing.
- Edits are limited to the requested scope.
- Conflicts, skipped checks, uncertainty, and residual risks are reported.
- Required validators or selected tests were run after structure, skill, config,
  code, or documentation changes.
<!-- AI-ENGINEERING:END AGENTS_BASELINE -->
