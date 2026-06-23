---
name: data-migration
description: Plan and review relational or document database migrations, including compatibility, rollback, verification, and operational safety.
---

# Data Migration

## Overview

Use this skill to produce evidence-based data migration plans with explicit
preconditions, rollout stages, validation queries, and rollback criteria. The
goal is a plan that can run against production data without data loss, extended
locking, or irreversible steps.

## When to Use

Use this skill when a change alters a database schema, indexes, stored data
shape, or data location, and the migration must stay backward compatible while
old and new code run together. Use it for relational stores (PostgreSQL, MySQL)
and document stores (MongoDB) alike.

## Core Process

1. Read the current and target data contracts, the consumers of each affected
   table or collection, and existing migration conventions in the repository.
2. Classify the change as additive, transitional, or destructive, and identify
   compatibility, data-volume, locking, and availability risks.
3. Design expand-and-contract stages when an online migration is required, so
   that each deploy stays compatible with the previous application version.
4. Define backfill batching, idempotency, backup, rollback, reconciliation, and
   observability checks for every stage.
5. Return executable verification steps and explicit go/no-go gates between
   stages.

## Expand-and-Contract Stages

1. **Expand** — add new columns, tables, or indexes as nullable or optional;
   never remove or rename in this step.
2. **Migrate** — backfill data in bounded batches; dual-write or dual-read while
   both shapes coexist.
3. **Contract** — switch reads to the new shape, then remove the old shape only
   after no consumer references it.

## Examples

- Split a `users.name` column into `first_name` and `last_name`: add new
  columns, backfill in batches, dual-write, switch reads, then drop the old
  column in a later release.
- Add a unique index on a large table: build it concurrently (e.g. `CREATE INDEX
  CONCURRENTLY`) to avoid blocking writes, and verify duplicate handling first.

## Red Flags

- A single migration both adds and drops or renames structures.
- A backfill runs as one unbounded statement over a large table.
- The rollback path is undefined or assumes the new shape already exists.
- A destructive step ships in the same release that introduces the new code.

## Verification

- Confirm the migration is reversible, or document why it is not and how data is
  preserved.
- Run the migration and its rollback against a representative dataset.
- Provide row-count and integrity reconciliation queries for before and after.
- Report locking behavior, estimated duration on production volume, and skipped
  checks.

## Output Format

- Change classification and risk summary.
- Ordered migration stages with per-stage rollback.
- Backfill and reconciliation queries.
- Observability and go/no-go gates.
- Residual risks and open questions.

## Notes

- Keep each deploy compatible with the previous application version.
- Return user-facing results in Vietnamese.
