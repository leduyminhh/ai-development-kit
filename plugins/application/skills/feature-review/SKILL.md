---
name: feature-review
description: Use when reviewing a full-stack feature across correctness, maintainability, API and data compatibility, regression risk, and requested security scope.
---

# Feature Review

## Overview

Use this skill to aggregate full-stack feature review findings while preserving the ownership of Java, Python, React, quality, data, and security review logic.

## When to Use

Use this skill when a feature diff or implementation summary needs cross-stack correctness, maintainability, compatibility, regression, or requested security review.

## Core Process

1. Read the feature context, changed files, implementation artifacts, and requested extensions.
2. Route stack-specific review to canonical application skills.
3. Route quality, data, or security review to the owning pack only when installed and requested.
4. Aggregate findings by severity without duplicating rule engines from other packs.
5. Report skipped reviews, test gaps, and residual risk.

## Examples

- Use `review-feature` before release readiness.
- Block review completion when security review was requested but the security pack is not installed.

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

- Critical findings.
- Major findings.
- Test gaps.
- Skipped reviews.
- Residual risk.

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
