# Persistence Checklist

## Modeling

- Separate domain model from JPA entity when the domain has non-trivial rules.
- Keep JPA annotations out of pure domain packages.
- Model ownership and cascade rules deliberately.
- Avoid bidirectional relationships unless queries require them.

## Queries

- Check for N+1 queries on collection access.
- Use fetch joins or entity graphs only where the read path needs them.
- Keep pagination stable with deterministic ordering.
- Avoid loading full aggregates for simple existence checks.

## Transactions And Locking

- Define what must commit atomically.
- Use optimistic locking for concurrent edits where possible.
- Use pessimistic locking only when contention and invariant risk justify it.
- Do not call slow external systems while holding database locks.

## Migrations

- Migrations should be backward compatible during rolling deploys.
- Add nullable columns before backfilling and enforcing not-null.
- Index foreign keys and high-cardinality search predicates.
- Review unique constraints for idempotency and duplicate prevention.

## Review Questions

- Which query grows with data size?
- Which path needs an index?
- Can this write be retried safely?
- Does rollback leave external systems inconsistent?
