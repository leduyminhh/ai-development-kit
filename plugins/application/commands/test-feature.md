---
id: application.test_feature
slug: test-feature
description: Route full-stack feature verification through the canonical quality command.
version: 1.0.0
---

# Test Feature

## Intent

Scope a full-stack feature for verification, then delegate executable quality verification to `quality.verify_quality` so feature testing and general change verification share one canonical quality flow.

## Inputs

- feature context
- changed-file scope
- acceptance criteria

## Required Skills

- test-qa-review
- test-automation-validate

## Steps

1. Inspect the feature context, acceptance criteria, changed files, existing tests, and integration points.
2. Convert the feature scope into a `quality.verify_quality` change scope with acceptance criteria and integration boundaries.
3. Run QA review and automated verification through the canonical quality flow.
4. Keep production source unchanged unless the user explicitly asks to add or repair tests.
5. Report quality evidence, feature-specific gaps, and release exit criteria.

## Output Contract

- test matrix
- executed tests
- failures
- feature-specific gaps
- exit criteria
