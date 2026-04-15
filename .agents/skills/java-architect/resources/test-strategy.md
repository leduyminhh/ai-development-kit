# Test Strategy

## Choose The Narrowest Useful Test

- Domain rule: plain unit test.
- Application orchestration: service test with mocked ports.
- Repository query: persistence slice or integration test.
- HTTP contract: controller slice or API integration test.
- Transaction or concurrency behavior: integration test with real persistence.
- Async behavior: consumer test plus retry/idempotency coverage.

## Verification Order

1. Changed class or use-case tests.
2. Module/package test.
3. Persistence or integration tests when boundaries are touched.
4. Full unit suite.
5. Full build only before release, PR, or risky merge.

## Assertions

- Assert observable behavior, not implementation details.
- Include negative paths and conflict paths.
- Test idempotency for retries.
- Test transaction rollback for partial failure when important.

## Smells

- Full Spring context for pure domain logic.
- Mocking the class under test.
- Tests that only assert no exception.
- Fragile assertions tied to private method order.
