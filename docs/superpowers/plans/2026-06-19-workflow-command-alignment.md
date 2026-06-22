# Workflow Command Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the duplicate `deliver-feature` orchestration command, split application delivery into backend/frontend/full-stack workflows, and document workflow roles on remaining commands.

**Architecture:** Commands remain provider-facing phase entrypoints. Workflow YAML files become the orchestration source for backend-only, frontend-only, and full-stack delivery. This change updates canonical plugin metadata, derived registry, tests, and docs without changing workflow engine semantics.

**Tech Stack:** Node.js 20, ESM `.mjs`, Node test runner, JSON plugin manifests, YAML workflow definitions, Markdown command contracts.

---

## File Structure

- Delete: `plugins/application/commands/deliver-feature.md`
- Create: `plugins/application/workflows/backend-feature.yaml`
- Create: `plugins/application/workflows/frontend-feature.yaml`
- Modify: `plugins/application/workflows/fullstack-feature.yaml`
- Modify: `plugins/application/plugin.yaml`
- Modify: `core/routing/command-registry.yaml`
- Modify: application command Markdown files except deleted `deliver-feature.md`
- Modify: `plugins/application/skills/feature-delivery/SKILL.md`
- Modify: `cli/test/contracts.test.mjs`, `cli/test/command-contracts.test.mjs`, `cli/test/workflow.test.mjs`
- Modify: `README.md`, `README_VI.md`, `plugins/README.md`, `plugins/README_VI.md`

---

## Tasks

### Task 1: Make Tests Expect the New Command and Workflow Set

**Files:**
- Modify: `cli/test/contracts.test.mjs`
- Modify: `cli/test/command-contracts.test.mjs`
- Modify: `cli/test/workflow.test.mjs`

- [ ] **Step 1: Update application command list**

In `cli/test/contracts.test.mjs`, rename `application defines ten parseable deliverable command files` to `application defines ten parseable phase command files` and use:

```js
const commandIds = [
  'design-api-contract',
  'design-data-change',
  'fix-feature',
  'implement-backend',
  'implement-frontend',
  'integrate-feature',
  'plan-feature',
  'review-backend',
  'review-feature',
  'test-feature',
];
```

- [ ] **Step 2: Update manifest command expectation**

In `cli/test/contracts.test.mjs`, assert:

```js
assert.deepEqual(application.assets.commands, [
  'commands/design-api-contract.md',
  'commands/design-data-change.md',
  'commands/fix-feature.md',
  'commands/implement-backend.md',
  'commands/implement-frontend.md',
  'commands/integrate-feature.md',
  'commands/plan-feature.md',
  'commands/review-backend.md',
  'commands/review-feature.md',
  'commands/test-feature.md',
]);
```

- [ ] **Step 3: Replace deleted command fixture**

In `cli/test/command-contracts.test.mjs`, make `accepts a command without MCP metadata` load `plugins/application/commands/plan-feature.md` and assert `application.plan_feature`.

- [ ] **Step 4: Assert three workflow installs**

In `cli/test/workflow.test.mjs`, update `workflowInstall copies workflow definitions from plugin`:

```js
assert.deepEqual(result.installed.sort(), [
  backend-feature,
  frontend-feature,
  fullstack-feature,
]);
const validation = await workflowValidate({ target });
assert.equal(validation.status, pass, JSON.stringify(validation.errors));
```

- [ ] **Step 5: Run focused tests and confirm failures before implementation**

Run: `node --test cli/test/contracts.test.mjs cli/test/command-contracts.test.mjs cli/test/workflow.test.mjs`

Expected before implementation: failures mention stale `deliver-feature` references and missing workflow files.

### Task 2: Remove `deliver-feature` From Active Source

**Files:**
- Delete: `plugins/application/commands/deliver-feature.md`
- Modify: `plugins/application/plugin.yaml`
- Modify: `core/routing/command-registry.yaml`
- Modify: `plugins/application/skills/feature-delivery/SKILL.md`

- [ ] **Step 1: Delete command file**

Delete `plugins/application/commands/deliver-feature.md`.

- [ ] **Step 2: Remove manifest asset**

Remove `commands/deliver-feature.md` from `plugins/application/plugin.yaml` under `assets.commands`.

- [ ] **Step 3: Remove registry object**

Remove the `application.deliver_feature` object from `core/routing/command-registry.yaml`.

- [ ] **Step 4: Update feature-delivery example**

In `plugins/application/skills/feature-delivery/SKILL.md`, replace the `deliver-feature` example with:

```md
- Use `aie workflow run fullstack-feature` for a bounded checkout feature spanning React and backend work after installing workflow definitions.
- Use `aie workflow run backend-feature` when the approved feature scope is backend-only.
- Use `aie workflow run frontend-feature` when the approved feature scope is frontend-only.
```

### Task 3: Add Backend and Frontend Workflows

**Files:**
- Create: `plugins/application/workflows/backend-feature.yaml`
- Create: `plugins/application/workflows/frontend-feature.yaml`
- Modify: `plugins/application/plugin.yaml`

- [ ] **Step 1: Create backend workflow**

Create `backend-feature.yaml` with steps: `plan-feature`, `design-api`, `plan-data`, `implement-backend`, `review-backend`, `test-feature`, `security-check`. Use skill IDs: `application/feature-plan`, `application/api-contract-design`, `data/data-migration`, `application/python-backend-engineer`, `application/java-analyze`, `quality/test-automation-validate`, `security/security-code-review`.

- [ ] **Step 2: Create frontend workflow**

Create `frontend-feature.yaml` with steps: `plan-feature`, `design-api`, `implement-frontend`, `review-feature`, `test-feature`. Use skill IDs: `application/feature-plan`, `application/api-contract-design`, `application/react-code-generate`, `quality/test-qa-review`, `quality/test-automation-validate`.

- [ ] **Step 3: Update manifest workflows**

Set `plugins/application/plugin.yaml` `assets.workflows` to:

```json
[
  workflows/backend-feature.yaml,
  workflows/frontend-feature.yaml,
  workflows/fullstack-feature.yaml
]
```

### Task 4: Align Fullstack Workflow With Command Phases

**Files:**
- Modify: `plugins/application/workflows/fullstack-feature.yaml`
- Modify: `core/workflows/fullstack-feature.yaml`

- [ ] **Step 1: Update step order**

Set both fullstack workflow files to this exact step sequence: `plan-feature`, `design-arch`, `design-api`, `plan-data`, `implement-backend`, `implement-frontend`, `integrate-feature`, `review-feature`, `test-feature`, `security-check`.

- [ ] **Step 2: Keep valid skill IDs**

Use these skill IDs in order: `application/feature-plan`, `architecture/architecture-onion-design`, `application/api-contract-design`, `data/data-migration`, `application/python-backend-engineer`, `application/react-code-generate`, `application/feature-integrate`, `quality/test-qa-review`, `quality/test-automation-validate`, `security/security-code-review`.

- [ ] **Step 3: Validate workflow tests**

Run: `node --test cli/test/workflow.test.mjs`

Expected: workflow tests pass after Task 3 and Task 4 are complete.

### Task 5: Add Workflow Role Sections to Remaining Commands

**Files:**
- Modify all remaining application command Markdown files.

- [ ] **Step 1: Insert role section after `## Inputs`**

Each command gets a `## Workflow Role` section before `## Required Skills`.

- [ ] **Step 2: Use exact workflow mapping**

Use this mapping in the relevant command files:

```text
plan-feature: backend-feature/plan-feature, frontend-feature/plan-feature, fullstack-feature/plan-feature
design-api-contract: backend-feature/design-api, frontend-feature/design-api, fullstack-feature/design-api
design-data-change: backend-feature/plan-data, fullstack-feature/plan-data
fix-feature: repair loop for failed workflow gates
implement-backend: backend-feature/implement-backend, fullstack-feature/implement-backend
implement-frontend: frontend-feature/implement-frontend, fullstack-feature/implement-frontend
integrate-feature: fullstack-feature/integrate-feature
review-backend: backend-feature/review-backend
review-feature: frontend-feature/review-feature, fullstack-feature/review-feature
test-feature: backend-feature/test-feature, frontend-feature/test-feature, fullstack-feature/test-feature
```

- [ ] **Step 3: Run command contract tests**

Run: `node --test cli/test/command-contracts.test.mjs cli/test/contracts.test.mjs`

Expected: all tests pass.

### Task 6: Update Documentation

**Files:**
- Modify: `README.md`, `README_VI.md`, `plugins/README.md`, `plugins/README_VI.md`

- [ ] **Step 1: Update quick workflow examples**

Add these examples next to `aie workflow build fullstack-feature` in both root README files:

```bash
aie workflow build backend-feature
aie workflow build frontend-feature
```

- [ ] **Step 2: Update plugin application row**

In both plugin README files, replace the single workflow reference with: `workflows: backend-feature, frontend-feature, fullstack-feature`.

- [ ] **Step 3: Run docs tests**

Run: `node --test cli/test/distribution.test.mjs`

Expected: all tests pass and Vietnamese UTF-8 checks pass.

### Task 7: Final Verification

**Files:**
- Inspect all modified files.

- [ ] **Step 1: Confirm active deleted-command references are gone**

Run: `rg deliver-feature plugins core cli README.md README_VI.md`

Expected: no matches in active source, tests, or root docs.

- [ ] **Step 2: Validate repository**

Run: `npm run validate`

Expected: `Validated 7 plugins for 3 providers.`

- [ ] **Step 3: Run full tests**

Run: `npm test`

Expected: fail count is 0.

- [ ] **Step 4: Inspect git state**

Run: `git status --short` and `git diff --stat`.

Expected: changes are limited to command removal, workflow additions, command role docs, metadata/registry/tests/docs updates, plus pre-existing unrelated dirty files preserved.

---

## Self-Review

Spec coverage: The plan removes `deliver-feature`, creates backend/frontend/fullstack workflows, updates command workflow roles, and updates validation/tests/docs. It avoids conditional workflow syntax, workflow engine changes, MCP changes, and machine-enforced command metadata.

Placeholder scan: The plan contains concrete file paths, command arrays, workflow step IDs, skill IDs, and verification commands.

Type consistency: Workflow IDs are consistently `backend-feature`, `frontend-feature`, and `fullstack-feature`. Deleted command IDs are consistently `deliver-feature` and `application.deliver_feature`.
