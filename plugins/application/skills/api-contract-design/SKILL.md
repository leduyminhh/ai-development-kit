---
name: api-contract-design
description: Use when designing or reviewing an API contract shared by React and Java/Spring, FastAPI, or Django DRF implementations.
---

# API Contract Design

## Overview

Use this skill to design or review API operations, schemas, error models, authorization behavior, and compatibility before implementation.

## When to Use

Use this skill when React and backend modules need a shared API contract, or when an existing contract must be reviewed for compatibility.

## Core Process

1. Read the feature context, consumer scope, provider scope, and existing API conventions.
2. Define operations, request schemas, response schemas, validation, errors, and authorization requirements.
3. Check backward compatibility and migration needs for existing consumers.
4. Write contract decisions back into the feature context.
5. Keep design and review mode read-only.

## Examples

- Use `design-api-contract` before React and backend implementation begin.
- Block the API gate when error handling or authorization behavior is undefined.

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

- Operations.
- Schemas.
- Error model.
- Compatibility.
- Verification.

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
