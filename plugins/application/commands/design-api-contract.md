---
id: design-api-contract
description: Design a shared API contract for a full-stack feature.
version: 1.0.0
---

# Design API Contract

## Intent

Define endpoint operations, schemas, validation, errors, authorization, and compatibility rules before frontend or backend implementation.

## Inputs

- feature context
- consumer/provider scope
- compatibility constraints

## Required Skills

- api-contract-design

## Steps

1. Inspect the feature context and existing consumer/provider API conventions.
2. Define operations, request schemas, response schemas, validation, and error model.
3. Define authorization and permission behavior for each operation.
4. Check compatibility with existing consumers and migration constraints.
5. Record verification expectations for contract, integration, and regression checks.

## Output Contract

- operations
- schemas
- error model
- authorization
- compatibility checks
