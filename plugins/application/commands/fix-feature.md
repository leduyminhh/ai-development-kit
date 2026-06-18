---
id: application.fix_feature
slug: fix-feature
description: Fix selected full-stack feature findings or failing tests.
version: 1.0.0
---

# Fix Feature

## Intent

Apply selected review findings or failing-test fixes within an approved source scope and rerun regression verification.

## Inputs

- selected findings
- approved source scope

## Required Skills

- feature-fix
- feature-implement
- test-automation-validate

## Steps

1. Inspect selected findings, failing tests, approved scope, and feature context.
2. Group fixes by module and route each group to the matching stack capability.
3. Apply the smallest fix that addresses the selected evidence.
4. Rerun focused regression verification for changed modules.
5. Report unresolved findings and residual risk.

## Output Contract

- fixed findings
- changed files
- verification
- unresolved findings
- residual risk
