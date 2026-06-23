---
id: data.migration_plan
slug: migration-plan
description: Generate a safe data migration plan.
version: 1.0.0
outputSchema: schemas/data-migration-context.schema.json
---

# Data Migration Plan

## Intent

Plan a reversible data migration with explicit operational validation.

## Inputs

- current data contract
- target data contract
- availability constraints

## Required Skills

- data-migration

## Steps

1. Inspect the source and target schemas.
2. Identify compatibility and operational risks.
3. Define staged migration and rollback actions.
4. Define reconciliation and observability checks.

## Output Contract

- migration stages
- rollback procedure
- validation queries
- operational risks
