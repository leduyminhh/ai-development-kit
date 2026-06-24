---
id: data.plan_migration
slug: plan-migration
description: Generate the canonical operational data migration plan.
version: 1.0.0
outputSchema: schemas/data-migration-context.schema.json
---

# Data Migration Plan

## Intent

Plan a reversible operational data migration with explicit stages, validation, observability, and rollback. This is the canonical command for migration execution details, including handoffs from application feature design.

## Inputs

- current data contract
- target data contract
- optional application data-change handoff
- availability constraints

## Required Skills

- data-migration

## Steps

1. Inspect the source and target schemas, existing migration conventions, and any application data-change handoff.
2. Identify compatibility, locking, data-volume, rollback, and operational risks.
3. Define staged migration, backfill, reconciliation, and rollback actions.
4. Define validation queries, observability checks, and go/no-go gates.

## Output Contract

- migration stages
- rollback procedure
- validation queries
- observability checks
- operational risks
