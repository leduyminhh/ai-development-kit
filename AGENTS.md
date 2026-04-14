# AGENTS.md

## Repository Overview

This repository is `codex-workflow-kit`: a Codex workflow kit for validators, agents, skills, references, reports, and future domain workflow packs.

Use Vietnamese for user-facing responses.

## Key Components

- `.agents/skills/codex-best-practice-validator/` contains the core validation skill and deterministic structure script.
- `.codex/agents/codex-structure-validator.toml` is the read-only validator agent entry point.
- `docs/specs/` stores approved design specs.
- `docs/plans/` stores implementation plans.
- `reports/` stores validation reports and other generated review artifacts.
- `references/external/codex-cli-best-practice/` is reference material only.

## Critical Patterns

- Keep the core validator independent from domain workflow packs.
- Domain workflows such as `java-spring-expert` must be validated by `codex-best-practice-validator` before being treated as complete.
- Do not put long domain procedures in this file; create focused skills under `.agents/skills/<name>/SKILL.md`.
- Do not treat `.codex/commands/` as a stable custom command system.
- Read only targeted files from `references/external/`; do not bulk-load or modify the reference clone unless explicitly requested.

## Workflow Rules

- Run the validator after structure changes:
  `powershell -ExecutionPolicy Bypass -File .agents/skills/codex-best-practice-validator/scripts/validate-codex-structure.ps1 -Root .`
- Keep `AGENTS.md` concise, ideally under 150 lines.
- Use `.codex/config.toml` for deterministic model, sandbox, approval, profile, and agent registration settings.

## Git Commit Convention

Use the user's conventional commit roles, for example:

- `feat (validator): add structure validator`
- `docs (readme): update workspace structure`
- `refactor (structure): reorganize docs and references`

## Do Not

- Do not implement `java-spring-expert` while working on the validator core unless explicitly requested.
- Do not vendor external references into core source without approval.
- Do not use unsafe config defaults such as `danger-full-access` with `approval_policy = "never"` for normal development.
