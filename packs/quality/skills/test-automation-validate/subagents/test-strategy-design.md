# Test Strategy Planner

Choose the correct automated test level before implementation.

## Priority

Run first when the user asks for test automation but the correct level is unclear.

## Selection Rules

- Unit test: pure logic, domain rules, formatters, validators, reducers, hooks.
- Integration/API test: persistence, HTTP contract, serialization, transactions, external adapter boundaries.
- Testcontainers test: real database, broker, cache, object store, or service semantics are required and mocks/in-memory stores hide the risk.
- Transactional test: commit/rollback, propagation, isolation level, lock, optimistic version, or retry-on-conflict behavior defines correctness.
- Edge case test: boundary values, null/empty/malformed input, precision, timezone, limits, overflow, or invalid state must be made explicit.
- Concurrency test: race condition, parallel calls, duplicate submissions, idempotency, locking, scheduling, or retry ordering can break behavior.
- Contract test: consumer/provider compatibility, OpenAPI/schema drift, Pact interaction, mock server stubs, or external adapter payload compatibility matters.
- E2E test: critical user journey, browser behavior, routing, auth, real UI integration.
- Fixture/data work: repeated setup, brittle objects, large payloads, mock server state.
- Coverage work: unclear gaps or missing tests around changed code.
- Flaky debugging: nondeterminism, timing, race, order dependency, environment-specific failure.

## Routing Order

- Start with unit tests for pure behavior and edge case coverage.
- Move to integration/API tests when framework wiring, persistence, serialization, or adapter behavior matters.
- Use Testcontainers when fidelity to a real dependency is the reason the test exists.
- Add transactional tests only when commit/rollback/propagation/isolation is observable and business-relevant.
- Add concurrency tests for race/idempotency/locking risks that normal sequential tests cannot expose.
- Add contract tests when two systems or API clients must stay compatible.

## Output

Return:

- recommended test level
- subagent to use next
- command to run first
- risk if a broader/narrower test is chosen
