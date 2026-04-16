# Test Prompt Selector

Use this selector after identifying the behavior under test and the current stack. Load only the resource and subagent prompt that match the immediate test task.

## Resource Selection

| Trigger | Load |
|---|---|
| Unknown stack, package manager, runner, or command | `resources/framework-detection.md` |
| Adding or modifying automated tests | `resources/test-implementation-rules.md` |
| Reporting command evidence or residual gaps | `resources/verification-report.md` |

## Test Level Selection

| Capability | Use When | Preferred Subagent |
|---|---|---|
| Strategy | test level or execution order is unclear | `subagents/test-strategy-design.md` |
| Unit test | deterministic logic, validators, reducers, formatters, pure services | `subagents/test-unit-validate.md` |
| Integration/API test | framework startup, HTTP serialization, repository behavior, adapter boundary | `subagents/test-api-validate.md` |
| Testcontainers | real database, broker, cache, or service semantics matter more than mock speed | `subagents/test-container-validate.md` |
| Transactional test | commit/rollback, propagation, isolation level, optimistic/pessimistic lock behavior matters | `subagents/test-transaction-validate.md` |
| Edge case test | boundary values, null/empty/invalid input, limits, timezone, precision, overflow | `subagents/test-edge-validate.md` |
| Concurrency test | race condition, idempotency, duplicate request, lock, retry, parallel execution risk | `subagents/test-concurrency-validate.md` |
| Contract test | consumer/provider compatibility, schema drift, OpenAPI/Pact/mock server contract | `subagents/test-contract-validate.md` |
| E2E test | browser or user journey behavior must be verified end to end | `subagents/test-e2e-validate.md` |
| Fixture design | factories, mocks, seed data, or reusable test data are the bottleneck | `subagents/test-fixture-generate.md` |
| Coverage gap | missing automated coverage needs analysis | `subagents/test-coverage-analyze.md` |
| Flaky test | nondeterministic failure or timing-sensitive test needs stabilization | `subagents/test-flaky-fix.md` |

Default to the narrowest test level that can prove the behavior. Do not load E2E, concurrency, contract, or fixture prompts unless the task specifically needs them.
