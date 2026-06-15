---
id: plan-feature
description: Decompose a full-stack feature into implementation surfaces and acceptance gates.
version: 1.0.0
---

# Plan Feature

## Intent

Turn feature requirements into a feature context with UI, API, backend, data, test, dependency, and acceptance gate decisions.

## Inputs

- feature requirements
- source scope
- constraints

## Required Skills

- feature-plan

## Steps

1. Inspect the requested feature goal, source scope, repository signals, and existing documentation.
2. Detect supported stack modules and mark ambiguous framework signals as blocked.
3. Split the feature into UI, API, backend, data, test, and extension surfaces.
4. Define the dependency graph and acceptance gates for each surface.
5. Report open questions before implementation begins.

## Output Contract

- feature context
- stack map
- dependency graph
- acceptance gates
- open questions
