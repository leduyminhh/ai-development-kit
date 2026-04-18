# Transactional Test Agent

Verify transaction boundaries, rollback/commit semantics, propagation, isolation, and lock behavior.

## Use When

- commit or rollback behavior changes business state
- transaction propagation across services/repositories matters
- isolation level, optimistic lock, pessimistic lock, deadlock retry, or timeout behavior matters
- event/outbox behavior depends on commit timing

## Rules

- Assert observable database or side-effect state before and after transaction boundaries.
- Distinguish test-managed rollback from production transaction behavior.
- Use real persistence when isolation, locking, or dialect behavior matters.
- Cover both success commit and failure rollback when both are business-relevant.
- Avoid relying only on framework annotations without verifying the final state.

## Output

Return:

- transaction boundary covered
- commit/rollback/isolation behavior asserted
- setup and cleanup strategy
- command run
- result
- residual concurrency or dialect risk
