---
name: agent-operating-rules
description: Use when applying repository-wide agent execution rules, especially before planning, editing, validating, or reconciling conflicting instructions; enforces must-have operating rules and applies optional rules to strengthen weak spots without replacing domain skills.
---

# Agent Operating Rules

## Overview

Use this skill as the repository-wide execution layer before domain-specific skills. It defines mandatory behavior for all agent work and optional upgrades for weaker areas such as checkpointing, goal framing, token discipline, and deterministic/tool-vs-judgment boundaries.

This skill is the execution discipline layer for repository work. It does not replace domain skills; it forces the agent to read relevant context, choose the smallest useful action, validate intent, and report evidence before claiming completion.

## When to Use

Use this skill before broad planning, multi-file edits, structure validation, conflict resolution, skill authoring, protected-path decisions, or any task where the agent might otherwise skip reading, testing, or surfacing trade-offs.

Also use this skill when the user invokes `init` or `agents.md` with this skill; those commands run the project-start `AGENTS.md`/`CLAUDE.md` setup flow.

## Core Process

1. Classify the task and identify the minimum relevant files, skills, and repo rules.
2. Read before writing, including target instruction files such as `AGENTS.md` or `CLAUDE.md`.
3. Apply `mustHave` rules first; apply optional rules only when they improve safety or clarity.
4. Keep edits surgical and preserve unrelated user changes.
5. Run deterministic validation that proves the request, then report exact commands and residual risk.

## Examples

- Before editing a skill, read its `SKILL.md`, owned `resources/`, and mapped tests.
- Before writing under `docs/` or `reports/`, present the protected-path confirmation block and wait.
- Before finalizing a structure move, run the validator and selected tests.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "This is small, so I can skip reading." | Small edits still break conventions when the local pattern is unknown. |
| "The validator passed before." | Validation must reflect the current diff, not a previous state. |
| "I can clean up unrelated files while here." | Unrelated changes increase review risk and violate surgical-change discipline. |

## Red Flags

- The agent edits before reading the target file.
- The response claims success without command evidence.
- A protected path is written without explicit confirmation.
- Optional rules are used as filler instead of improving the task.

## Verification

- Relevant files were read before editing.
- Edits are limited to the requested scope.
- Conflicts, skipped checks, and uncertainty are reported.
- Required validators or selected tests were run after structure, skill, config, or code changes.

## Resource Map

- [resources/agents-project-start-template.md](resources/agents-project-start-template.md): project-start `AGENTS.md` template and merge procedure for repositories that already have `AGENTS.md` or `CLAUDE.md`.

## Subagent Prompts

- None; this skill does not require dedicated subagent prompts.

## Scripts

- None; this skill does not require dedicated scripts.

## Output Format

Report concise findings, actions, verification, and remaining risk.

## Notes

### Rule Levels

- `mustHave`: enforce on every task unless a higher-priority instruction explicitly conflicts.
- `optional`: apply when it improves clarity, safety, or long-running execution without adding noise.
- `none`: do not carry the rule into this repository.

### Commands

- `init`: run the project-start setup flow from [resources/agents-project-start-template.md](resources/agents-project-start-template.md). Check the target root for `AGENTS.md` and `CLAUDE.md`, merge missing sections when an instruction file exists, or create `AGENTS.md` from the template when none exists.
- `agents.md`: same as `init`; use this alias when the user's intent is specifically to create, inspect, or update project agent instructions.

Command execution must still follow protected-path confirmation rules, preserve existing project-specific instructions, and avoid silent overwrites.

### Must-Have Rules

1. Think before coding.
   Inspect the relevant code, config, skill, or test path before editing. For multi-step work, state the approach briefly once enough context is known.

2. Prefer simplicity first.
   Choose the smallest clear change that satisfies the request. Avoid new abstractions unless they remove real complexity or match an established repo pattern.

3. Make surgical changes.
   Touch only files needed for the current goal. Preserve unrelated user changes and avoid broad restructuring.

4. Surface conflicts.
   When instructions, configs, tests, or references disagree, identify the conflict and choose by priority or ask only when the decision is risky and cannot be inferred.

5. Read before writing.
   Read targeted source files before modifying them. Do not bulk-scan protected paths or external references.

6. Test intent, not only behavior.
   Prefer tests and validation that prove the requested requirement, regression risk, or invariant. Reuse selected tests and mapped skill tests. For production-facing changes, report relevant operational, security, rollback, and maintainability risks.

7. Match codebase conventions.
   Follow local naming, folder placement, validation, commit, and protected-path rules before introducing a new convention.

8. Generated code comment discipline.
   For each generated function or method, evaluate complexity before finalizing it. For simple functions, add a concise comment describing purpose when the purpose is not obvious from the name and surrounding context. For complex functions, add a concise purpose comment and inline comments at each major flow so readers can follow the logic. Do not add comments that merely restate the implementation.

9. Keep solutions production-ready.
   For production-facing work, do not present a solution as production-ready unless validation, residual risks, and rollback considerations have been addressed or explicitly scoped out.

10. Fail loud.
   Do not claim completion without evidence. Report blockers, skipped verification, uncertainty, and residual risk explicitly.

### Optional Rules

1. Goal-driven execution.
   Define the success condition for ambiguous or long-running tasks before implementation, then keep actions aligned to that condition.

2. Use deterministic tools before judgment.
   Use scripts, validators, tests, parsers, and structured repo signals for mechanical checks. Use model judgment for trade-offs, ambiguity, design, and risk assessment.

3. Token discipline.
   Prefer targeted reads, summaries, and progressive disclosure. Avoid fixed token budgets unless the user gives one; treat token limits as a reason to narrow scope, not to skip verification.

4. Checkpoint significant steps.
   For long tasks, report concise checkpoints after planning, editing, verification, and publishing. Skip noisy checkpoints for small single-step requests.

### Apply To Other Projects

Use this action when the user wants to apply these operating rules to another repository's `AGENTS.md` or `CLAUDE.md`.

For project-start setup, load [resources/agents-project-start-template.md](resources/agents-project-start-template.md). Check the target root for `AGENTS.md` and `CLAUDE.md`; if an instruction file exists, read it and merge only missing template sections; if none exists, create `AGENTS.md` from the template. Never overwrite existing instruction files silently.

Choose one of three modes:

1. Inline patch mode.
   Update the target `AGENTS.md` or `CLAUDE.md` directly with a concise section that lists `mustHave` rules and a short `optional` rule note. Use this when the target project has no skill system or wants a self-contained instruction file.

2. Skill reference mode.
   Add a short instruction in the target file that references this skill by name or path, then keep the detailed rules in `agent-operating-rules/SKILL.md`. Use this when the target project supports reusable skills and should avoid duplicating long operating guidance.

3. Hybrid mode.
   Add a short `mustHave` summary inline and reference the skill for `optional` rules, examples, and update guidance. Use this when the target project needs immediate baseline behavior in `AGENTS.md` or `CLAUDE.md` but still wants centralized rule maintenance.

Before writing to another project:

- Read the target instruction file first.
- Preserve existing project-specific language, safety rules, and workflow commands.
- Avoid duplicating rules already present; merge or reference them.
- If both `AGENTS.md` and `CLAUDE.md` exist, update only the file the user requested, or explain the precedence if the project defines one.
- If the target path is protected by that project, request confirmation before writing.

### Operating Order

1. Confirm the task type and relevant skill set.
2. Read the smallest useful local context.
3. Apply `mustHave` rules before editing.
4. Apply `optional` rules where the task is ambiguous, long-running, high-risk, or validation-heavy.
5. Run the repo-required validator or selected tests when structure, skill, config, or code changed.
6. Report results in Vietnamese with evidence and remaining risk.
