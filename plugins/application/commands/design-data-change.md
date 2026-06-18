---
id: application.design_data_change
slug: design-data-change
description: Design a safe data change for a full-stack feature.
version: 1.0.0
---

# Design Data Change

## Intent

Design schema, index, migration, backfill, reconciliation, rollback, and data gates for a feature that changes persistent data.

## Inputs

- feature context
- current data contract
- availability constraints

## Required Skills

- feature-plan
- data-migration

## Steps

1. Inspect the feature context and current data contract.
2. Identify schema, index, query, retention, and migration impact.
3. Define staged migration, backfill, reconciliation, and rollback actions.
4. Define availability constraints and operational data gates.
5. Report blockers when rollback or reconciliation cannot be proven.

## Output Contract

- schema changes
- migration stages
- rollback
- reconciliation
- data gates
