---
id: application.design_data_change
slug: design-data-change
description: Capture feature data impact and hand off operational migration planning.
version: 1.0.0
---

# Design Data Change

## Intent

Identify the data impact of a full-stack feature, define the application-facing data contract, and hand off migration execution details to `data.plan_migration` when persistent data must change.

## Inputs

- feature context
- current data contract
- target application behavior
- availability constraints

## Required Skills

- data-migration

## Steps

1. Inspect the feature context, current data contract, target behavior, and consumers.
2. Identify required schema, index, query, retention, compatibility, and data-shape changes.
3. Define the application-facing contract and data assumptions needed by frontend and backend work.
4. Produce a handoff for `data.plan_migration` when staged migration, backfill, reconciliation, or rollback is required.
5. Report feature blockers when the data contract, compatibility, or migration handoff cannot be proven.

## Output Contract

- schema changes
- application data contract
- migration handoff
- compatibility risks
- feature blockers
