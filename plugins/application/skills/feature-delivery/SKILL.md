---
name: feature-delivery
description: Use when orchestrating an entire full-stack feature lifecycle from planning through implementation, integration, review, test, optional fix, and release-readiness reporting.
---

# Feature Delivery

## Overview

Use this skill as the full-stack lifecycle orchestrator for one bounded feature, from planning through release-readiness reporting.

## When to Use

Use this skill when the user wants one command to coordinate feature planning, implementation, integration, review, testing, optional fixes, and requested extensions.

## Core Process

1. Validate feature goal, source scope, requested extensions, and starting evidence.
2. Call phase skills in gate order: plan, design, implement, integrate, review, test, and optional fix.
3. Do not bypass blocked gates or invent missing phase evidence.
4. Run security, deployment, runtime, or documentation extensions only when requested and installed.
5. Summarize phase status, artifacts, verification, blocked gates, and release readiness.

## Examples

- Use `deliver-feature` for a bounded checkout feature spanning React and backend work.
- Block delivery when integration tests fail and fix mode is not approved.

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

- `subagents/feature-delivery-gate-review.md`: independently review phase evidence before declaring the next gate open.

## Scripts

None.

## Output Format

- Phase status.
- Artifacts.
- Verification.
- Blocked gates.
- Release readiness.

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
