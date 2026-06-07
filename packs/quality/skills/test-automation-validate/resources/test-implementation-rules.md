# Test Implementation Rules

Use this resource when adding or modifying tests.

## Test Quality

- Test observable behavior, not private implementation details.
- Give tests names that explain the behavior and expected outcome.
- Keep one main assertion concept per test.
- Use real code whenever practical.
- Mock external systems, time, randomness, and network boundaries deliberately.
- Keep fixtures small and named by intent.

## Test Isolation

- Avoid shared mutable state between tests.
- Reset mocks, fake timers, databases, and temporary files.
- Use transaction rollback, isolated schemas, temp directories, or factories when available.
- Do not depend on test execution order.
- For transactional tests, assert the behavior that matters: transaction rollback, committed state, propagation boundary, isolation level, lock timeout, or retry semantics.
- If Testcontainers are used, keep container lifecycle centralized and reuse existing project conventions for startup, cleanup, ports, and migrations.
- For concurrency tests, design the test around the race window, parallel trigger, idempotency key, lock, retry, or duplicate request risk.
- For contract tests, prefer the existing consumer/provider tooling; verify schema, OpenAPI examples, Pact interactions, or mock-server stubs against real serialization.

## Test Data

- Prefer builders/factories over large inline objects.
- Keep required fields explicit.
- Avoid production secrets or real user data.
- Use stable clocks and deterministic IDs when assertions depend on time or identity.

## Regression Tests

For bug fixes:

- reproduce the bug with a failing test
- verify the failure is the expected symptom
- make the smallest fix
- rerun the test and relevant surrounding suite
