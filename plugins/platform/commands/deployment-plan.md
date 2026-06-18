---
id: platform.deployment_plan
slug: deployment-plan
description: Produce a deployment and rollback plan.
version: 1.0.0
---

# Deployment Plan

## Intent

Prepare a production deployment with verification and rollback gates.

## Inputs

- release scope
- target environment
- operational constraints

## Required Skills

- using-workflow-kit

## Steps

1. Inspect release changes and dependencies.
2. Define rollout stages and readiness gates.
3. Define observability and verification checks.
4. Define rollback triggers and actions.

## Output Contract

- deployment stages
- readiness gates
- verification commands
- rollback procedure
