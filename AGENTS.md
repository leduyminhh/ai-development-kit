# AGENTS.md

## Overview
Repository: `codex-workflow-kit`

Purpose:
- Organize Codex validators, agents, skills, references, and generated artifacts.
- Keep the core validation workflow reusable and independent from domain-specific skills.

Language:
- Use Vietnamese for all user-facing responses.

## Repository Structure
Core validator:
- `skills/codex-structure-validate/` contains the core validation skill and deterministic structure validation script.
- `.codex/agents/codex-structure-validate.toml` is the read-only validator agent entry point.

Runtime skills:
- `skills/<name>/SKILL.md` contains a single discoverable skill.
- Keep skill folders flat under `skills/`; do not nest runtime skills under domain folders.
- Use descriptive skill names such as `java-analyze` for domain grouping.
- Place `scripts/`, `tests/`, and `resources/` under `skills/<name>/` when they are owned by one skill only.
- Reserve root `scripts/` for shared project-wide helpers, selectors, and runners used across multiple skills.

Documents and reports:
- `docs/specs/` stores approved design specifications.
- `docs/plans/` stores implementation plans.
- `reports/` stores validation reports and generated review artifacts.

## Architecture Rules
- Keep the core validator independent from any domain skill.
- Do not place long domain procedures in this file.
- Put domain-specific reusable behavior in focused skills under `skills/<name>/SKILL.md`.
- Avoid hidden coupling between the validator, domain skills, and external references.

## External References Policy
- Read only targeted files from `references/external/`.
- Do not bulk-load external references.
- Do not modify the external reference clone unless explicitly requested.
- Do not vendor external references into core source without approval.

## Protected Paths Policy
The following paths are protected:
- `docs/`
- `reports/`

Scan policy:
- Do not recursively scan `docs/` or `reports/` by default.
- Scan protected paths only after explicit user permission or when a command is intentionally run with an allow flag such as `-IncludeProtectedPaths`.
- Prefer targeted reads over broad traversal to reduce token usage.

Any action that creates, updates, overwrites, or deletes files under protected paths MUST require explicit user confirmation before execution.

Before any write action under protected paths, the agent MUST present:
- target path
- purpose
- short content summary

Confirmation template:

```text
Proposed change:
- Path: docs/specs/payment-flow.md
- Purpose: document payment orchestration design
- Summary: scope, sequence flow, API contract, failure handling

Confirm? (yes/no)
```

Execution rules:
- Proceed only after explicit confirmation from the user.
- No implicit approval.
- No approval by assumption.
- If confirmation is not granted, do not write files; return the draft inline in chat instead.

Strict prohibitions:
- No silent file generation.
- No background file writes.
- No auto-overwrite in protected paths.
- No delete or cleanup in protected paths without confirmation.

## Workflow Rules
- After any structure change, run the validator:
  `powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix`
- Use selected tests instead of running every test by default:
  `powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit`
- When adding any `*test*.ps1` file, map it in `.codex/test-map.toml` under exactly one group: `test.always`, `test.core`, or `test.skill`.
- Assign one ownership role for each new `scripts/`, `tests/`, or `resources/` artifact:
  `shared-project` for root `scripts/`; `skill-owned` for `skills/<skill>/...`.
- Keep `AGENTS.md` concise, ideally under 150 lines.
- Use `.codex/config.toml` for deterministic settings such as model, sandbox, approval policy, profile, and agent registration.

## Change Safety Rules
- Prefer non-destructive behavior by default.
- Prefer inline drafts before persistent writes.
- Prefer focused edits over broad restructuring.
- Do not modify unrelated files.
- Do not read more files than necessary for the current task.

## Git Commit Convention

Use the `git-workflow-design` skill for branch, commit, merge, revert, release, hotfix, staging, push, and PR preparation workflows.

If the user does not provide a commit message, automatically generate:
- a conventional commit title
- a Vietnamese commit description

Worktree rule:
- Do not create or use a git worktree unless the user explicitly requests it.
- By default, work directly in the current repository checkout and current branch.

## Do Not

- Do not mix domain workflow logic into the core validator.
- Do not bypass confirmation for protected paths.
- Do not use unsafe config defaults such as `danger-full-access` with `approval_policy = "never"` for normal development.
- Do not modify external references without approval.
- Do not generate persistent artifacts in protected paths without explicit confirmation.

## Enforcement Intent

Agents MUST:
- follow confirmation rules for protected paths
- default to safe and non-destructive behavior
- keep the validator modular and domain-agnostic
- avoid assumptions when a persistent change requires approval
