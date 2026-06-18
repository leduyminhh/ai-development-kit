---
id: security.review_security
slug: review-security
description: Review source and configuration for actionable security risks.
version: 1.0.0
---

# Review Security

## Intent

Find security risks and report evidence, impact, and remediation.

## Inputs

- source scope
- optional threat context

## Required Skills

- security-code-review

## Steps

1. Establish the review scope and trust boundaries.
2. Inspect authentication, authorization, input, secrets, and dependencies.
3. Validate findings against reachable code paths.
4. Return prioritized remediation and verification.

## Output Contract

- security summary
- critical findings
- major findings
- remediation
- verification
