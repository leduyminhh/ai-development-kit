---
name: feature-implement
description: Use when implementing backend or frontend work for a planned feature and routing detailed work to Java/Spring, FastAPI, Django DRF, or React subagents.
---

# Feature Implementation

## Overview

Use this skill to route an approved feature context to the right canonical stack skill or implementation subagent while keeping source scope and verification explicit.

## When to Use

Use this skill when a planned feature needs backend or frontend implementation across Java/Spring, FastAPI, Django DRF, or React.

## Core Process

1. Read the approved feature context, source scopes, stack signals, and acceptance gates.
2. Run the deterministic stack detector before selecting implementation routes.
3. Reject ambiguous Python signals until the user or repository evidence selects FastAPI or Django REST Framework.
4. Route implementation to the canonical Java, Python, or React skill and the matching subagent.
5. Keep edits inside the approved source scope and run focused verification for each module.

## Examples

- Use `implement-backend` to route a backend feature to Java/Spring, FastAPI, or Django DRF.
- Block implementation when stack detection finds only `python-ambiguous`.

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

- `scripts/detect-feature-stack.mjs`: detect Java/Spring, FastAPI, Django DRF, ambiguous Python, and React modules before routing implementation.

## Subagent Prompts

None.

## Scripts

- `scripts/detect-feature-stack.mjs`: deterministic stack detector used before implementation routing.

## Output Format

- Selected modules.
- Selected subagents.
- Changes.
- Verification.
- Residual risks.

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
