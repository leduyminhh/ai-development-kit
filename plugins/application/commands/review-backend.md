---
id: application.review_backend
slug: review-backend
description: Review backend source code for production readiness.
version: 1.0.0
---

# Review Backend

## Intent

Review backend implementation and return prioritized findings.

## Inputs

- source scope
- optional changed-file set

## Required Skills

- java-analyze
- code-shared-design
- test-automation-validate

## Steps

1. Inspect project structure and stack.
2. Review architecture and API boundaries.
3. Review persistence, errors, logging, and tests.
4. Return evidence-backed findings.

## Output Contract

- summary
- critical findings
- major findings
- test gaps
- verification
