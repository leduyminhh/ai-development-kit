# Workflow Command Alignment Design

## Goal

Align application commands with workflow runtime responsibilities by removing the
manual orchestration command, splitting feature delivery into backend, frontend,
and full-stack workflows, and documenting each remaining command's workflow role.

## Current State

`plugins/application/commands/deliver-feature.md` acts as a manual orchestration
entrypoint for a full feature lifecycle. `plugins/application/workflows/fullstack-feature.yaml`
also models a full feature lifecycle, but as workflow runtime data. Keeping both
surfaces creates ambiguity: users can choose either a command-level orchestrator
or a workflow runtime path for the same goal.

Application commands currently describe phase-level work well: planning, API
contract design, data change design, backend implementation, frontend
implementation, integration, review, tests, fixes, and backend review. They do
not enforce workflow order, persist run state, resume work, retry failed steps,
or decide skip gates. Those responsibilities belong to workflow runtime.

## Design

Remove `deliver-feature` as an installable command. The workflow runtime becomes
the orchestration surface for end-to-end feature delivery. Remaining application
commands stay as standalone phase entrypoints and as documentation for workflow
step responsibilities.

Split application feature workflows into three explicit paths:

- `backend-feature`: API/data/backend-focused delivery without frontend steps.
- `frontend-feature`: frontend-focused delivery against an API contract or
  approved feature context.
- `fullstack-feature`: full end-to-end delivery across backend, frontend,
  integration, review, test, and security review.

Do not add conditional workflow execution in this step. Separate workflow files
are simpler, easier to validate, and avoid changing workflow engine semantics
before the runtime is stabilized.

## Command Model

Commands remain provider-facing entrypoints. Each remaining application command
gets a `Workflow Role` section that states whether it can be used standalone and
which workflow steps it supports. This is intentionally documentation-level in
this step; machine-enforced `command -> workflow step` metadata can be added in a
later validator upgrade.

The command set after this change is:

- `plan-feature`
- `design-api-contract`
- `design-data-change`
- `fix-feature`
- `implement-backend`
- `implement-frontend`
- `integrate-feature`
- `review-backend`
- `review-feature`
- `test-feature`

## Workflow Definitions

`backend-feature` steps:

1. `plan-feature` using `application/feature-plan`
2. `design-api` using `application/api-contract-design`
3. `plan-data` using `data/data-migration`
4. `implement-backend` using `application/python-backend-engineer`
5. `review-backend` using `application/java-analyze`
6. `test-feature` using `quality/test-automation-validate`
7. `security-check` using `security/security-code-review`

`frontend-feature` steps:

1. `plan-feature` using `application/feature-plan`
2. `design-api` using `application/api-contract-design`
3. `implement-frontend` using `application/react-code-generate`
4. `review-feature` using `quality/test-qa-review`
5. `test-feature` using `quality/test-automation-validate`

`fullstack-feature` steps:

1. `plan-feature` using `application/feature-plan`
2. `design-arch` using `architecture/architecture-onion-design`
3. `design-api` using `application/api-contract-design`
4. `plan-data` using `data/data-migration`
5. `implement-backend` using `application/python-backend-engineer`
6. `implement-frontend` using `application/react-code-generate`
7. `integrate-feature` using `application/feature-integrate`
8. `review-feature` using `quality/test-qa-review`
9. `test-feature` using `quality/test-automation-validate`
10. `security-check` using `security/security-code-review`

## Validation

The implementation must update plugin metadata, command registry, tests, and
documentation so repository validation and the full test suite pass. Validation
must prove that deleted command references are gone, the three workflow assets
exist, workflow definitions parse, and README files remain UTF-8 readable.

## Non-Goals

- No conditional workflow syntax such as `when` or `scope`.
- No workflow engine state-machine changes.
- No machine-enforced command metadata schema.
- No MCP runtime changes.
