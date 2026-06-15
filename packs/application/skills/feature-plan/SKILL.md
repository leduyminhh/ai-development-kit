---
name: feature-plan
description: Use when decomposing a full-stack feature into UI, API, backend, data, test, dependencies, and acceptance gates before implementation.
---

# Feature Planning

## Overview

Use this skill to turn a feature request into a bounded feature context, stack map, dependency graph, and acceptance gates before implementation starts.

## When to Use

Use this skill when a request needs full-stack planning across React, API, backend, data, test, dependencies, or acceptance criteria.

## Core Process

1. Read the user request, source scope, repository signals, and existing documentation.
2. Detect stack signals and list affected modules without guessing ambiguous frameworks.
3. Normalize the feature context with acceptance criteria, source scopes, artifacts, verification, and residual risk placeholders.
4. Build a dependency graph for UI, API, backend, data, test, and requested extensions.
5. Stop at the planning gate when acceptance criteria or source ownership is ambiguous.

## Examples

- Use `plan-feature` to split a checkout feature into React, API, backend, data, and test work.
- Block planning when the request lacks observable acceptance criteria.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "The generic workflow is enough." | Route to the canonical stack skill or subagent when repository evidence identifies a supported stack. |
| "A missing gate can be filled in later." | Keep the phase blocked until the required evidence or user decision exists. |

## Red Flags

- Claims are not backed by source or command evidence.
- Work expands beyond the approved feature scope.
- A read-only mode changes production source.

## Verification

- Confirm the feature context fields used by this phase.
- Confirm selected source scopes and stack signals.
- Run the focused checks required by this phase.
- Report skipped checks and residual risks.

## Resource Map

None.

## Subagent Prompts

None.

## Scripts

None.

## Output Format

- Feature goal.
- Stack map.
- Dependency graph.
- Acceptance gates.
- Open questions.

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
