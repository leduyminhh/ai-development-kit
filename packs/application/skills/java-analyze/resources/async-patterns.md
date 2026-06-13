# Async Patterns

## Use Async When

- The caller does not need immediate completion.
- External integration can be retried independently.
- Work is slow, bursty, or failure-prone.
- Events describe a committed business fact.

## Avoid Async When

- The caller requires immediate consistency.
- Ordering is strict and not designed.
- Idempotency is missing.
- Failures cannot be observed or replayed.

## Event And Queue Rules

- Publish events after transaction commit.
- Include event id, aggregate id, event type, occurred time, and version when useful.
- Consumers must be idempotent.
- Retry policies must have a dead-letter or manual recovery path.
- Do not use async to hide unclear ownership.

## Concurrency Risks

- Race conditions on status transitions.
- Duplicate messages or out-of-order events.
- Scheduled jobs running on multiple nodes.
- Lost updates without version checks.
- Thread-local context leaking into async execution.

## Review Questions

- What happens if the same message is processed twice?
- What happens if processing succeeds but acknowledgement fails?
- What observes failed async work?
- Is there a replay strategy?
