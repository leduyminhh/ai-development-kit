---
name: skill-maintenance-review
description: Use when reviewing skill and agent maintenance drift from repository evidence, and from audit logs or feedback notes when those inputs are available.
---

# Skill Maintenance Review

## Overview

Use this skill to review how runtime skills and agents age over time. Prefer audit output and explicit feedback when those inputs are available.

If audit or feedback flows are not yet implemented, perform a focused static review using the smallest useful set of repository evidence such as skill files, agent entries, config, and related test or automation scripts. In that case, clearly state that the review is based on repository evidence rather than runtime history.

## Operating Mode

1. Identify the target skill or agent.
2. Collect only the relevant audit and feedback evidence when that flow exists.
3. If runtime evidence is unavailable, collect only the smallest useful static repository evidence needed for the review.
4. Separate signals into:
   - correct guidance that should be preserved
   - incorrect guidance that should be removed or tightened
   - missing guidance that should be added
   - one-off noise that should not change the skill
5. Require pattern evidence before proposing an upgrade; do not learn from a single anecdote unless the failure is severe and reproducible.
6. Keep the proposal focused on one capability area per review.
7. Recommend the smallest patch that resolves the observed drift.
8. Produce validation steps for the proposed patch.
9. Stop at proposal and approval status; do not auto-apply the upgrade.

## Resource Map

- `subagents/skill-drift-review.md`: classify repeated patterns, drift, and safe patch scope.
- `scripts/test-run-skill-upgrade-cycle.ps1`: validate proposal generation flow from feedback intake to pending approval output.
- `scripts/test-apply-skill-upgrade-proposal.ps1`: validate approval gate and in-scope apply behavior for approved proposals.

## Validation Commands

- `powershell -ExecutionPolicy Bypass -File skills/skill-maintenance-review/scripts/test-run-skill-upgrade-cycle.ps1`
- `powershell -ExecutionPolicy Bypass -File skills/skill-maintenance-review/scripts/test-apply-skill-upgrade-proposal.ps1`

## Output Format

Return Markdown with:

- Summary
- Evidence Scope
- Observed Patterns
- Correct Guidance
- Incorrect Guidance
- Missing Guidance
- Proposed Changes
- Validation Plan
- Approval Status: Pending User Approval
