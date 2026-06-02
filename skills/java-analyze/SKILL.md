---
name: java-analyze
description: Use when acting as a Java backend architect for Spring Boot or JVM services, especially for flow design, clean code boundaries, architecture review, persistence choices, async/concurrency risks, test strategy, or Maven/Gradle verification.
---

# Java Architect

## Overview

Use this skill to design and review Java backend changes before coding deeply. The architect should make flow, boundaries, persistence, async behavior, and verification explicit.

## Operating Mode

1. Identify the business flow, module boundary, and runtime stack.
2. If the user explicitly forces an architecture, apply that architecture skill before Java-specific design. Use `architecture-onion-design` when the user asks for Onion Architecture.
3. If the design includes reusable internal API, contract, or shared logic modules published through Nexus, apply `code-shared-design`.
4. Load only the resource checklist needed for the task.
5. Map the intended flow before proposing code changes.
6. Review clean code and architecture risks before implementation.
7. Choose targeted Maven or Gradle verification.
8. Report trade-offs, risks, and verification evidence in Vietnamese.

## Resource Map

- [resources/java-review-checklist.md](resources/java-review-checklist.md): general Java architecture and clean code review.
- [resources/spring-patterns.md](resources/spring-patterns.md): Spring Boot layering, dependency direction, controllers, services, transactions.
- [resources/persistence-checklist.md](resources/persistence-checklist.md): JPA, SQL, migration, N+1, locking, transaction risks.
- [resources/async-patterns.md](resources/async-patterns.md): events, queues, scheduling, concurrency, retries, idempotency.
- [resources/test-strategy.md](resources/test-strategy.md): test pyramid and verification selection.
- [resources/clean-code-review.md](resources/clean-code-review.md): Clean Code inspired review heuristics for naming, functions, classes, errors, tests, and maintainability.
- [resources/api-contract-design.md](resources/api-contract-design.md): backend API contract shaping for frontend integration.
- [resources/workflow-handoff.md](resources/workflow-handoff.md): handoff from architecture to implementation and independent testing.

## Task To Resource Routing

- Boundary or layering review: start with [resources/java-review-checklist.md](resources/java-review-checklist.md), then load [resources/spring-patterns.md](resources/spring-patterns.md) when Spring controller/service/transaction boundaries matter.
- Persistence or query risk review: load [resources/persistence-checklist.md](resources/persistence-checklist.md).
- Async, retry, scheduling, or concurrency review: load [resources/async-patterns.md](resources/async-patterns.md).
- API request/response or frontend contract review: load [resources/api-contract-design.md](resources/api-contract-design.md).
- Test planning or regression scope review: load [resources/test-strategy.md](resources/test-strategy.md).
- General maintainability review: load [resources/clean-code-review.md](resources/clean-code-review.md).
- Handoff from architecture to implementation or QA: load [resources/workflow-handoff.md](resources/workflow-handoff.md).

## Scripts

- [scripts/changed-files-summary.sh](scripts/changed-files-summary.sh): summarize changed Java/build files.
- [scripts/verify-maven.sh](scripts/verify-maven.sh): run Maven wrapper or Maven verification.
- [scripts/verify-gradle.sh](scripts/verify-gradle.sh): run Gradle wrapper or Gradle verification.

Run scripts from a Java project root. Start with [scripts/changed-files-summary.sh](scripts/changed-files-summary.sh) when the task begins from an existing diff and you need to scope the Java/build impact before reading code deeply. Scripts are read-only except for normal build/test outputs.

## Subagent Prompts

Use files in `subagents/` as role prompts when delegating or simulating specialist review:

- [subagents/java-review.md](subagents/java-review.md): code quality and architecture review.
- [subagents/sql-optimize.md](subagents/sql-optimize.md): query, indexing, and persistence review.
- [subagents/java-concurrency-review.md](subagents/java-concurrency-review.md): async, transaction, and race-condition review.
- [subagents/java-spring-boundary-review.md](subagents/java-spring-boundary-review.md): Spring controller/service/domain/infrastructure boundary review.
- [subagents/java-api-contract-review.md](subagents/java-api-contract-review.md): request/response, validation, and frontend integration contract review.
- [subagents/test-strategy-review.md](subagents/test-strategy-review.md): Java test level, Maven/Gradle verification, and regression strategy review.

## Architecture Defaults

- Prefer feature/module boundaries over technical buckets.
- Keep domain and application logic independent from web and persistence frameworks when the codebase allows it.
- When `architecture-onion-design` is forced, use the rings `domain`, `application`, `infrastructure`, and `bootstrap`, and keep dependencies pointing inward.
- When shared internal API, contract, or shared logic is required, keep those modules versioned, Nexus-published, and compatible with the selected architecture boundary.
- Put transaction boundaries in application services, not controllers.
- Avoid hidden side effects in mappers, getters, validators, or logging helpers.
- Use ports/adapters for external systems when the dependency is volatile or hard to test.
- Follow existing project conventions unless they conflict with correctness or maintainability.

## Validation Commands

- `powershell -ExecutionPolicy Bypass -File skills/java-analyze/scripts/test-architecture-skills.ps1`
- `powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root .`

## Output Format

For design or review tasks, return:

- Flow summary.
- Boundary decisions.
- Data and transaction notes.
- Clean code risks.
- Test and verification plan.
- Open questions or trade-offs.

## When to Use

Use this skill when acting as a Java backend architect for Spring Boot or JVM services, especially for flow design, clean code boundaries, architecture review, persistence choices, async/concurrency risks, API contracts, or Maven/Gradle verification.

## Core Process

1. Identify the target flow, module, or diff and read the relevant Java/package context.
2. Route to the right resource: API contract, persistence, async, Spring patterns, clean code, or test strategy.
3. Use Onion or shared-module companion skills when the request explicitly crosses those architecture boundaries.
4. Review domain, application, infrastructure, and API boundaries before recommending code changes.
5. Provide verification commands such as Maven, Gradle, or selected tests that match the touched module.

## Examples

- Use `resources/persistence-checklist.md` when reviewing repository queries, transactions, or JPA mappings.
- Use `resources/async-patterns.md` when reviewing events, futures, thread pools, schedulers, or retries.
- Use `architecture-onion-design` when the user requests Palermo-style inward dependencies.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "Controller logic is faster to implement." | Business decisions belong in application/domain layers, not transport adapters. |
| "The repository can return entities directly everywhere." | Persistence choices must respect boundaries and consumer contracts. |
| "Concurrency bugs are unlikely." | Async paths need explicit ownership, timeouts, retries, and verification. |

## Red Flags

- Framework imports leak into domain or application contracts.
- Transactions, retries, or async boundaries are implicit.
- Tests only cover happy paths while persistence or concurrency changed.
- Package structure hides unclear ownership.

## Verification

- Relevant Java files and package boundaries were inspected.
- Architecture risks are tied to concrete files or flows.
- Recommended commands match Maven/Gradle/project layout.
- Test strategy covers changed behavior, edge cases, and integration risk.

