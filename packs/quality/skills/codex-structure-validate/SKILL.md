---
name: codex-structure-validate
description: Validate Codex repository concepts and structure, including AGENTS.md, skills, agents, config, hooks, docs, and workflow orchestration boundaries.
---

# Codex Best-Practice Validator

## Overview

Use this skill when asked to validate a Codex workflow repo, agent repo, skill repo, or best-practice structure.

This skill validates that a Codex workflow repository has clear instruction boundaries, flat runtime skills, safe configuration, mapped tests, and deterministic validation scripts.

## When to Use

Use this skill after moving skills, editing `.codex/`, changing `AGENTS.md`, adding tests, modifying hooks, updating manifests, or before declaring repository structure production-ready.

## Core Process

1. Resolve the repository root and configured `skills_root`.
2. Validate `AGENTS.md`, `.codex/config.toml`, `.codex/agents`, `.codex/agent-metadata`, hooks, MCP scaffolds, skills, and test map.
3. Enforce skill frontmatter, name format, flat folder layout, no BOM, and metadata path rules.
4. With `-Fix`, create only missing scaffold directories and sync agent registry entries.
5. Report failures before warnings, with exact paths and commands.

## Examples

- After moving `.agents/skills` to `skills`, run the validator and selected tests.
- A skill named `security-code-review` must live at `skills/security-code-review/SKILL.md`.
- A `*test*.ps1` file must be mapped in `.codex/test-map.toml`.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "The folder exists, so structure is fine." | Structure also includes metadata, test mapping, config safety, and skill spec rules. |
| "I can skip ignored-output policy during validation." | Ignored output paths should not be committed, but they are not protected by default. |
| "A warning is harmless." | Warnings indicate drift that should be understood before publishing. |

## Red Flags

- Runtime skills are nested under domain folders.
- Agent entries do not reference known skills.
- Test files exist but are not mapped.
- Config combines unsafe defaults or commits ignored local output.

## Verification

- `validate-codex-structure.ps1 -Root .` exits 0.
- `validate-codex-structure.ps1 -Root . -Fix` does not introduce unrelated changes.
- New tests are mapped in `.codex/test-map.toml`.
- Failures include exact file paths and remediation guidance.

## Resource Map

- None; this skill does not require additional resource files.

## Subagent Prompts

- [subagents/skill-structure-review.md](subagents/skill-structure-review.md): inspect skill frontmatter, progressive disclosure, resources, and UI metadata.
- [subagents/agent-config-review.md](subagents/agent-config-review.md): inspect [.codex/agents/*.toml](../../../.codex/agents/*.toml) and agent-to-skill boundaries.
- [subagents/config-safety-review.md](subagents/config-safety-review.md): inspect [.codex/config.toml](../../../.codex/config.toml), sandbox, approval, audit, and agent registration.
- [subagents/hook-audit-review.md](subagents/hook-audit-review.md): inspect hooks, audit behavior, retention, and generated artifacts.
- [subagents/ignored-output-review.md](subagents/ignored-output-review.md): review ignored local-output policy for docs/report artifacts.

## Scripts

- None; this skill does not require dedicated scripts.

## Output Format

Return Markdown with `Summary`, `Pass`, `Warning`, `Fail`, and `Next Actions` sections.

## Notes

### Scope

Validate the repository's Codex concepts and structure. Do not implement domain skills while validating. Domain skills such as `java-analyze` must depend on this validator, not the other way around.

### Validation Categories

- [AGENTS.md](../../../AGENTS.md): concise guidance, setup/test commands, no domain-heavy procedure dumps, no contradictions.
- Skills: `skills/<name>/SKILL.md`, trigger-style `description`, progressive disclosure through `references/`, `scripts/`, `assets/`, and optional `agents/openai.yaml`.
- Workflows: `workflows/<name>/WORKFLOW.md` with frontmatter `name`, `description`, and a stable entry contract for tasks or automation.
- Agents: `.codex/agents/<name>.toml` with `name`, `description`, and `developer_instructions`; agents orchestrate and skills hold reusable procedures.
- Agent metadata: `.codex/agent-metadata/<name>.toml` for repo governance such as `read_only`, hook gate, scope, or rules that should not break Desktop parsing.
- Config: [.codex/config.toml](../../../.codex/config.toml) for deterministic harness settings, profiles, sandbox, approval policy, MCP, and `agent_registry` sync.
- Hooks: optional guardrails, not a replacement for core instructions.
- Orchestration: prefer Codex Agent -> Skill; do not design around `.codex/commands/` as stable.
- Domain separation: Java, React, DevOps, and other domain skills stay outside the validator core; the validator may check skill shape but must not embed domain procedures.

### Severity Rules

- `fail`: missing required skill frontmatter, missing required agent fields, domain workflow embedded into validator core, or unsafe config defaults for normal development.
- `warning`: missing optional config, long docs, absent hooks, absent report artifact, or script validation skipped.
- `pass`: expected structure exists and aligns with Codex best-practice boundaries.

### Process

1. Inspect the repo structure.
2. Run the deterministic script if it exists and command execution is allowed.
3. Apply model-reviewed checks from this skill.
4. Separate deterministic findings from judgment-based findings.
5. Return the report without changing files unless explicitly asked.
