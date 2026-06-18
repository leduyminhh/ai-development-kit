---
id: architecture.review_architecture
slug: review-architecture
description: Review architecture boundaries and dependency direction.
version: 1.0.0
mcpTool: architecture.review_architecture
---

# Review Architecture

## Intent

Assess architecture quality and return evidence-backed design findings.

## Inputs

- source scope
- architecture constraints

## Required Skills

- java-analyze
- architecture-onion-design
- code-shared-design

## Steps

1. Inspect modules and dependency direction.
2. Review domain, application, and infrastructure boundaries.
3. Identify coupling, leakage, and shared contract risks.
4. Return prioritized recommendations.

## Output Contract

- architecture summary
- critical findings
- boundary findings
- recommended verification
