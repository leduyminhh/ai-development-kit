---
id: application.integrate_feature
slug: integrate-feature
description: Integrate frontend, API, backend, and data artifacts for a feature.
version: 1.0.0
---

# Integrate Feature

## Intent

Connect React, API, backend, and database changes and resolve evidence-backed contract mismatches.

## Inputs

- feature context
- backend/frontend artifacts

## Required Skills

- feature-integrate
- api-contract-design

## Steps

1. Inspect feature context, API contract, backend artifacts, frontend artifacts, and data notes.
2. Compare frontend calls, backend operations, schemas, authorization, errors, and UI states.
3. Identify contract mismatches with evidence.
4. Apply only approved integration fixes within the selected source scope.
5. Run contract or integration verification and report blocked gates.

## Output Contract

- integration map
- contract mismatches
- changes
- verification
- blocked gates
