---
name: feature-test
description: Use when turning feature acceptance criteria into unit, integration, contract, and end-to-end verification through the canonical quality skills.
---

# Feature Testing

## Overview

Use this skill to turn acceptance criteria into a test matrix and executable verification while keeping quality automation owned by the quality pack.

## When to Use

Use this skill when a feature needs unit, integration, contract, or end-to-end verification derived from acceptance criteria.

## Core Process

1. Read acceptance criteria, feature context, changed files, and existing tests.
2. Route scenario design to `test-qa-review`.
3. Route executable test creation or execution to `test-automation-validate`.
4. Keep production source unchanged in test mode.
5. Report added tests, executed tests, failures, and exit criteria.

## Examples

- Use `test-feature` after integration to verify acceptance gates.
- Block the test gate when a repeatable high-risk scenario has no executable or manual verification.

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

- Test matrix.
- Added tests.
- Executed tests.
- Failures.
- Exit criteria.

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
