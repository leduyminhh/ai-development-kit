---
name: feature-fix
description: Use when applying selected review findings or failing-test fixes within an approved source scope and rerunning regression verification.
---

# Feature Fixing

## Overview

Use this skill to apply selected findings or failing-test fixes within an approved scope, then rerun targeted regression verification.

## When to Use

Use this skill when review findings or failing tests have been selected for implementation and the user has approved the source scope.

## Core Process

1. Read selected findings, failing tests, approved source scope, and feature context.
2. Group fixes by module and route to the canonical stack skill or subagent.
3. Apply the smallest behavior-preserving fix that addresses the selected evidence.
4. Rerun focused regression verification for changed modules.
5. Report unresolved findings and residual risk.

## Examples

- Use `fix-feature` to resolve selected review findings after `review-feature`.
- Block fix mode when the requested finding has no approved source scope.

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

- Selected findings.
- Changes.
- Verification.
- Unresolved findings.
- Residual risk.

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
