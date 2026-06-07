# AGENTS.md

## Overview
Repository: `ai-development-kit`

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
- `report/` and `reports/` are ignored by Git by default.

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

## Generated Documentation Policy
- `docs/` is tracked project documentation.
- `report/` and `reports/` are generated or local-output paths and are ignored by Git.
- `docs/`, `report/`, and `reports/` are not protected paths in this repository.
- Prefer targeted reads and writes for these paths to keep scans and diffs focused.
- Do not rely on ignored generated files as the only record of an implementation decision that must be reviewed in Git.

## Workflow Rules
- Use the `agent-operating-rules` skill for repository-wide execution discipline before broad planning, editing, validation, or conflict resolution.
- Enforce its `mustHave` rules: think before coding, prefer simplicity, make surgical changes, surface conflicts, read before writing, test intent, match conventions, generated code comment discipline, keep solutions production-ready, and fail loud.
- Apply its `optional` rules to strengthen weak spots in ambiguous or long-running work: goal framing, deterministic checks before judgment, token discipline, and significant-step checkpoints.
- After any structure change, run the validator:
  `powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix`
- Use selected tests instead of running every test by default:
  `powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit`
- If `README.md` changes, update `README_VI.md` in the same change so the Vietnamese version stays aligned.
- When adding any `*test*.ps1` file, map it in `.codex/test-map.toml` under exactly one group: `test.always`, `test.core`, or `test.skill`.
- New or updated skills must follow `skills/SKILL_TEMPLATE.md` exactly for top-level H2 order.
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
- Do not use unsafe config defaults such as `danger-full-access` with `approval_policy = "never"` for normal development.
- Do not modify external references without approval.
- Do not commit generated local output from ignored report paths.

## Enforcement Intent

Agents MUST:
- default to safe and non-destructive behavior
- keep the validator modular and domain-agnostic
- avoid assumptions when a destructive or user-visible change requires approval

