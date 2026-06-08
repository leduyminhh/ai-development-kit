---
name: using-workflow-kit
description: Use when starting an AI coding session, choosing whether a repository workflow applies, installing workflow-kit adapters, or checking skill/workflow activation before task execution.
---

# Using Workflow Kit

## Overview

Use this skill as the bootstrap entry point for this repository's skill and workflow system. It keeps agents from jumping straight into implementation when a reusable skill or registered workflow should guide the work.

The workflow registry may be empty. When no workflow is registered, fall back to the most relevant skill and the repository instructions.

## When to Use

Use this skill when:

- A session starts and the agent needs the workflow-kit operating context.
- A task might match an installed skill, workflow, hook adapter, or plugin adapter.
- The user asks how Codex, Claude Code, Cursor, or another IDE should invoke this kit.
- A new workflow is added to `.codex/workflows/registry.toml`.

Do not use it as a replacement for domain skills such as `java-analyze`, `react-code-generate`, or `security-code-review`.

## Core Process

1. Read the user's request and identify whether the task is planning, implementation, review, validation, hook work, git work, or documentation.
2. Check `.codex/workflows/registry.toml` when workflows are relevant; if it has no workflow entries, continue with skill routing only.
3. Select the most specific matching workflow when a registry entry exists; otherwise select the most specific matching skill.
4. Load only the chosen workflow or skill, then follow its steps and required verification.
5. Emit or preserve audit evidence when hook support is available, then report the selected workflow or skill and verification evidence.

## Examples

- For a backend bug investigation before concrete workflows exist, use `agent-operating-rules`, then the relevant backend/security/test skills.
- For a future `workflow-backend-maintain` registry entry, load its `WORKFLOW.md` before selecting supporting skills.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "I can just start coding." | Check registered workflows and matching skills before implementation. |
| "The registry is empty, so the kit does nothing." | Empty registry means use skill routing and repository rules until workflows are registered. |
| "Claude slash commands and Codex skills are the same." | Treat Codex, Claude Code, and Cursor as adapters over the same source workflow contract. |

## Red Flags

- The agent implements before checking whether a workflow or skill applies.
- A provider adapter duplicates long workflow content instead of pointing to the source workflow.
- A workflow registry entry names skills that do not exist.
- The response claims a workflow ran without audit, trace, or verification evidence.

## Verification

- `.codex/workflows/registry.toml` parses successfully.
- Referenced workflow paths and skill names exist when registry entries are present.
- Provider adapters point to this bootstrap or to a concrete workflow source.
- Selected tests or validators run before claiming setup is complete.

## Resource Map

- `.codex/workflows/registry.toml`: workflow registry and adapter roots.
- `scripts/validate-workflows.ps1`: deterministic workflow registry validator.

## Subagent Prompts

- `subagents/workflow-safety-review.md`: review whether a task selected the right workflow or skill.

## Scripts

- None.

## Output Format

```text
Selected workflow:
Selected skill(s):
Reason:
Verification:
Remaining risk:
```

## Notes

- Keep workflow source files in `workflows/<name>/WORKFLOW.md` when they are introduced.
- Keep provider-specific command, hook, and plugin files thin; adapters should not become the workflow source of truth.
- User instructions and repository `AGENTS.md` rules take precedence over this bootstrap.
