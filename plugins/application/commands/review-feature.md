---
id: application.review_feature
slug: review-feature
description: Review a full-stack feature for release readiness risks.
version: 1.0.0
---

# Review Feature

## Intent

Review a feature across correctness, maintainability, API and data compatibility, regression risk, and requested extensions.

## Inputs

- feature context
- changed-file scope
- requested extensions

## Required Skills

- feature-review
- java-analyze
- python-backend-engineer
- react-code-generate

## Steps

1. Inspect the feature context, changed files, implementation artifacts, and requested extensions.
2. Route Java, Python, and React review to the canonical stack skills.
3. Include data, quality, or security review only when requested and available.
4. Prioritize findings by severity with concrete evidence.
5. Report skipped reviews and residual release risk.

## Output Contract

- critical findings
- major findings
- test gaps
- skipped reviews
- residual risk
