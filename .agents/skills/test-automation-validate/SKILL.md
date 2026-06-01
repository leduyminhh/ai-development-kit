---
name: test-automation-validate
description: Use when creating, updating, running, debugging, or planning automated tests across stacks, including unit tests, integration/API tests, end-to-end tests, test fixtures/data, coverage gap analysis, and flaky test stabilization. Use after QA review when the next step is executable automated test implementation or verification.
---

# Automation Testing

## Overview

Use this skill to turn requirements, QA review findings, bug reports, architecture notes, or code changes into executable automated tests. It covers unit, integration/API, Testcontainers-backed persistence, transactional test behavior, edge case analysis, concurrency tests, contract tests, E2E, fixtures, coverage gaps, and flaky test stabilization. Use `test-qa-review` first when the work is only independent review or manual test planning.

## Operating Mode

1. Identify the behavior under test, acceptance criteria, and affected files.
2. Detect the stack and existing test framework before adding tests.
3. Load only the relevant resource or subagent prompt.
4. Prefer test-first for bug fixes and new behavior:
   - write the smallest failing test
   - verify the failure is meaningful
   - implement or adjust code only when requested or required by the test task
   - verify the test passes
5. Reuse existing test helpers, fixtures, factories, page objects, mock servers, and CI commands.
6. Keep tests deterministic, isolated, and behavior-focused.
7. Run the narrowest useful command first, then broader commands when risk justifies it.
8. Report commands, results, coverage gaps, and any remaining manual checks in Vietnamese.

## Test Strategy Matrix

| Capability | Use When | Preferred Subagent |
|---|---|---|
| Unit test | deterministic logic, validators, reducers, formatters, pure services | [test-unit-validate.md](subagents/test-unit-validate.md) |
| Integration/API test | framework startup, HTTP serialization, repository behavior, adapter boundary | [test-api-validate.md](subagents/test-api-validate.md) |
| Testcontainers | real database, broker, cache, or service semantics matter more than mock speed | [test-container-validate.md](subagents/test-container-validate.md) |
| Transactional test | commit/rollback, propagation, isolation level, optimistic/pessimistic lock behavior matters | [test-transaction-validate.md](subagents/test-transaction-validate.md) |
| Edge case test | boundary values, null/empty/invalid input, limits, timezone, precision, overflow | [test-edge-validate.md](subagents/test-edge-validate.md) |
| Concurrency test | race condition, idempotency, duplicate request, lock, retry, parallel execution risk | [test-concurrency-validate.md](subagents/test-concurrency-validate.md) |
| Contract test | consumer/provider compatibility, schema drift, OpenAPI/Pact/mock server contract | [contract-test-validate.md](subagents/contract-test-validate.md) |

## Resource Map

- [resources/framework-detection.md](resources/framework-detection.md): identify stack, package manager, test runner, and command selection.
- [resources/test-implementation-rules.md](resources/test-implementation-rules.md): rules for deterministic, behavior-first automated tests.
- [resources/verification-report.md](resources/verification-report.md): final test result and evidence format.

## Must-Have Subagents

- [subagents/test-strategy-design.md](subagents/test-strategy-design.md): choose test level and execution order.
- [subagents/test-unit-validate.md](subagents/test-unit-validate.md): implement focused unit tests.
- [subagents/test-api-validate.md](subagents/test-api-validate.md): implement integration, persistence, and API contract tests.
- [subagents/test-container-validate.md](subagents/test-container-validate.md): implement real dependency integration tests with Testcontainers or equivalent managed containers.
- [subagents/test-transaction-validate.md](subagents/test-transaction-validate.md): verify transaction boundaries, rollback/commit semantics, propagation, and isolation.
- [subagents/test-edge-validate.md](subagents/test-edge-validate.md): identify and implement boundary, negative, malformed, and extreme-value tests.
- [subagents/test-concurrency-validate.md](subagents/test-concurrency-validate.md): expose race conditions, idempotency gaps, locking bugs, and retry hazards.
- [subagents/contract-test-validate.md](subagents/contract-test-validate.md): verify consumer/provider API contracts, schemas, and mock server compatibility.
- [subagents/test-e2e-validate.md](subagents/test-e2e-validate.md): implement browser/user-flow tests.
- [subagents/test-fixture-generate.md](subagents/test-fixture-generate.md): design fixtures, factories, mocks, and test data.
- [subagents/test-coverage-review.md](subagents/test-coverage-review.md): identify missing automated coverage.
- [subagents/test-flaky-fix.md](subagents/test-flaky-fix.md): stabilize nondeterministic tests.

## Anti-Overuse Rules

- Do not add E2E tests for logic that a unit or integration test can cover reliably.
- Do not mock the class under test.
- Do not assert private implementation order.
- Do not create large test frameworks when one focused test is enough.
- Do not rewrite production code unless the user asks for implementation or the test task requires a small fix.

## Output Format

```text
Pham vi automation:
Test level da chon:
Files changed:
Commands run:
Ket qua:
Coverage gaps:
Rui ro / manual checks:
```
