---
name: codex-best-practice-validator
description: Validate Codex repository concepts and structure, including AGENTS.md, skills, agents, config, hooks, docs, and workflow orchestration boundaries.
---

# Codex Best-Practice Validator

Use this skill when asked to validate a Codex workflow repo, agent repo, skill repo, or best-practice structure.

## Scope

Validate the repository's Codex concepts and structure. Do not implement domain workflows while validating. Domain workflows such as `java-spring-expert` must depend on this validator, not the other way around.

## Validation Categories

- `AGENTS.md`: concise guidance, setup/test commands, no domain-heavy procedure dumps, no contradictions.
- Skills: `.agents/skills/<name>/SKILL.md`, trigger-style `description`, progressive disclosure through `references/`, `scripts/`, `assets/`, and optional `agents/openai.yaml`.
- Agents: `.codex/agents/<name>.toml` with `name`, `description`, and `developer_instructions`; agents orchestrate and skills hold reusable procedures.
- Config: `.codex/config.toml` for deterministic harness settings, profiles, sandbox, approval policy, MCP, and agent registration.
- Hooks: optional guardrails, not a replacement for core instructions.
- Orchestration: prefer Codex Agent -> Skill; do not design around `.codex/commands/` as stable.
- Domain separation: Java, React, DevOps, and other domain workflow packs stay outside the validator core.

## Report Format

Return Markdown with `Summary`, `Pass`, `Warning`, `Fail`, and `Next Actions` sections.

## Severity Rules

- `fail`: missing required skill frontmatter, missing required agent fields, domain workflow embedded into validator core, or unsafe config defaults for normal development.
- `warning`: missing optional config, long docs, absent hooks, absent report artifact, or script validation skipped.
- `pass`: expected structure exists and aligns with Codex best-practice boundaries.

## Process

1. Inspect the repo structure.
2. Run the deterministic script if it exists and command execution is allowed.
3. Apply model-reviewed checks from this skill.
4. Separate deterministic findings from judgment-based findings.
5. Return the report without changing files unless explicitly asked.
