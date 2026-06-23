---
name: python-implement
description: Use when designing, implementing, or reviewing Python backend features in FastAPI or Django REST Framework, including API contracts, validation, persistence, authorization, async behavior, and pytest verification.
---

# Python Implementation

## Overview

Use this skill to design, implement, and review Python backend feature work in FastAPI or Django REST Framework while keeping framework detection, boundaries, and verification explicit.

## When to Use

Use this skill when a Python backend feature targets FastAPI or Django REST Framework in an approved feature context.

## Core Process

1. Read the selected Python module, dependency manifest, framework config, API contract, persistence layer, and tests.
2. Reject ambiguous framework detection until the user or repository evidence selects FastAPI or Django REST Framework.
3. Route implementation to the matching framework subagent.
4. Keep transport, application, domain, and persistence responsibilities explicit within the existing project conventions.
5. Run focused pytest, type, lint, migration, and framework checks from the verification resource.
6. Return changed behavior, evidence, and residual risks in Vietnamese.

## Examples

- Use `fastapi-backend-implement` when the module has FastAPI dependency and an approved feature context.
- Use `django-drf-backend-implement` when the module has Django REST Framework dependency and an approved feature context.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "A Python backend is close enough regardless of framework." | FastAPI and Django REST Framework have different routing, dependency, permission, transaction, and verification patterns. |
| "Pydantic means FastAPI." | Pydantic alone is an ambiguous Python signal; require framework evidence before routing. |

## Red Flags

- Framework is guessed from package names, comments, or project metadata.
- Blocking I/O is introduced inside async FastAPI routes.
- ORM entities leak across API contracts without an explicit boundary.
- Authorization or object-level permission behavior is missing.
- Tests cover only the happy path.

## Verification

- Relevant Python module, dependency manifest, framework config, and tests were inspected.
- Framework routing is backed by dependency or config evidence.
- Verification commands are selected from the project tooling and reported with results.
- Skipped checks and residual risks are explicit.

## Resource Map

- [resources/python-backend-verification.md](resources/python-backend-verification.md): select deterministic verification for FastAPI and Django DRF projects.

## Subagent Prompts

- [subagents/fastapi-backend-implement.md](subagents/fastapi-backend-implement.md): implement an approved FastAPI feature.
- [subagents/django-drf-backend-implement.md](subagents/django-drf-backend-implement.md): implement an approved Django REST Framework feature.

## Scripts

None.

## Output Format

- Selected framework and module.
- Changed behavior.
- Boundary decisions.
- Verification commands and results.
- Residual risks.

## Notes

- Preserve feature context gates from the calling command.
- Keep write actions inside the approved source scope.
- Return user-facing results in Vietnamese.
