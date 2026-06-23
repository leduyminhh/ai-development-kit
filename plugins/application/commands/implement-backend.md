---
id: application.implement_backend
slug: implement-backend
description: Implement backend work for an approved feature context.
version: 1.0.0
---

# Implement Backend

## Intent

Detect Java/Spring, FastAPI, or Django REST Framework modules and implement the approved backend feature scope through the matching canonical skill.

## Inputs

- approved feature context
- backend source scope

## Required Skills

- feature-implement
- java-implement
- python-implement

## Steps

1. Inspect the approved feature context, backend source scope, and stack signals.
2. Run stack detection and stop on ambiguous Python routing.
3. Route Java/Spring, FastAPI, or Django REST Framework implementation to the matching subagent.
4. Implement the smallest backend change that satisfies the approved API, data, and permission contract.
5. Run focused backend verification and report residual risk.

## Output Contract

- selected stack
- changed behavior
- changed files
- verification
- residual risks
