---
id: quality.verify_quality
slug: verify-quality
description: Design and execute focused verification for a software change.
version: 1.0.0
outputSchema: schemas/quality-verification-context.schema.json
---

# Verify Quality

## Intent

Canonical quality verification for a software change, including feature-scoped verification delegated from application commands.

## Inputs

- change scope
- acceptance criteria
- optional feature context

## Required Skills

- test-qa-review
- test-automation-validate
- naming-rule-validate

## Steps

1. Identify behavior, boundaries, acceptance criteria, and regression risks.
2. Select the narrowest useful unit, integration, contract, or end-to-end checks.
3. Implement or run focused tests when the user requested executable automation; otherwise report the verification plan and manual checks.
4. Report evidence, skipped checks, and residual risk without duplicating feature-lifecycle orchestration.

## Output Contract

- scenario summary
- executed tests
- skipped checks
- failures
- residual risks
