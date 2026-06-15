---
name: feature-integrate
description: Use when connecting React, API, backend, and database changes and resolving evidence-backed contract mismatches.
---

# Feature Integration

## Overview

Use this skill to connect implementation artifacts across UI, API, backend, and data layers, then resolve only evidence-backed contract mismatches.

## When to Use

Use this skill after backend, frontend, API, or data artifacts exist and the feature needs integration checks across layers.

## Core Process

1. Read the feature context, API contract, implementation artifacts, and data change notes.
2. Compare frontend calls, backend operations, serialization, authorization, errors, and UI states.
3. Identify mismatches with evidence and keep unrelated improvements out of scope.
4. Apply the smallest integration fix only when the command mode permits writes.
5. Run contract or integration verification and report blocked gates.

## Examples

- Use `integrate-feature` after backend and frontend implementation summaries exist.
- Block integration when React expects a response field that the API contract does not define.

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

- Integration map.
- Mismatches.
- Changes.
- Verification.
- Blocked gates.

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
