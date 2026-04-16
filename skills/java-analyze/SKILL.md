---
name: java-analyze
description: Use when analyzing Java backend architecture for Spring Boot or JVM services, especially flow design, clean code boundaries, architecture review, persistence choices, async/concurrency risks, test strategy, or Maven/Gradle verification.
---

# Java Analyze

## Overview

Use this skill to analyze and review Java backend changes before coding deeply. The agent should make flow, boundaries, persistence, async behavior, and verification explicit.

## Operating Mode

1. Identify the business flow, module boundary, and runtime stack.
2. If the user explicitly forces an architecture, apply that architecture skill before Java-specific design. Use `architecture-onion-design` when the user asks for Onion Architecture.
3. If the design includes reusable internal API, contract, or shared logic modules published through Nexus, apply `code-shared-design`.
4. Load only the resource checklist needed for the task.
5. Map the intended flow before proposing code changes.
6. Review clean code and architecture risks before implementation.
7. Choose targeted Maven or Gradle verification.
8. Report trade-offs, risks, and verification evidence in English.

## Resource Map

- `resources/java-review-checklist.md`: general Java architecture and clean code review.
- `resources/spring-patterns.md`: Spring Boot layering, dependency direction, controllers, services, transactions.
- `resources/persistence-checklist.md`: JPA, SQL, migration, N+1, locking, transaction risks.
- `resources/async-patterns.md`: events, queues, scheduling, concurrency, retries, idempotency.
- `resources/test-strategy.md`: test pyramid and verification selection.
- `resources/clean-code-review.md`: Clean Code inspired review heuristics for naming, functions, classes, errors, tests, and maintainability.
- `resources/api-contract-design.md`: backend API contract shaping for frontend integration.
- `resources/workflow-handoff.md`: handoff from architecture to implementation and independent testing.

## Scripts

- `scripts/changed-files-summary.sh`: summarize changed Java/build files.
- `scripts/verify-maven.sh`: run Maven wrapper or Maven verification.
- `scripts/verify-gradle.sh`: run Gradle wrapper or Gradle verification.

Run scripts from a Java project root. They are read-only except for normal build/test outputs.

## Subagent Prompts

Use files in `subagents/` as role prompts when delegating or simulating specialist review:

- `subagents/java-review.md`: code quality and architecture review.
- `subagents/sql-optimize.md`: query, indexing, and persistence review.
- `subagents/java-concurrency-review.md`: async, transaction, and race-condition review.
- `subagents/java-spring-boundary-review.md`: Spring controller/service/domain/infrastructure boundary review.
- `subagents/java-api-contract-review.md`: request/response, validation, and frontend integration contract review.
- `subagents/test-strategy-review.md`: Java test level, Maven/Gradle verification, and regression strategy review.

## Architecture Defaults

- Prefer feature/module boundaries over technical buckets.
- Keep domain and application logic independent from web and persistence frameworks when the codebase allows it.
- When `architecture-onion-design` is forced, use the rings `domain`, `application`, `infrastructure`, and `bootstrap`, and keep dependencies pointing inward.
- When shared internal API, contract, or shared logic is required, keep those modules versioned, Nexus-published, and compatible with the selected architecture boundary.
- Put transaction boundaries in application services, not controllers.
- Avoid hidden side effects in mappers, getters, validators, or logging helpers.
- Use ports/adapters for external systems when the dependency is volatile or hard to test.
- Follow existing project conventions unless they conflict with correctness or maintainability.

## Output Format

For design or review tasks, return:

- Flow summary.
- Boundary decisions.
- Data and transaction notes.
- Clean code risks.
- Test and verification plan.
- Open questions or trade-offs.





