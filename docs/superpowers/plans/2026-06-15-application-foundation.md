# Application Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng nền tảng Phase 1 cho full-stack feature delivery bằng 10 command theo deliverable, orchestration skills dùng chung và subagent chuyên Java/Spring, FastAPI, Django DRF và React.

**Architecture:** Pack `application` sở hữu command và orchestration workflow. Canonical skill giữ logic dùng chung, subagent giữ hướng dẫn theo framework, còn MCP handlers cung cấp structured planning output và không trực tiếp sửa source. Một JSON schema chuẩn hóa feature context; một script deterministic phát hiện stack/module trước khi skill phân công subagent.

**Tech Stack:** Markdown skill/command contracts, JSON manifests và schemas, Node.js ESM, MCP stdio runtime, Node built-in test runner, TypeScript CLI build.

---

## Phạm Vi Phase 1

Plan này chỉ triển khai `Application Foundation`:

- feature context contract;
- deterministic stack detection;
- 8 orchestration skills;
- canonical Python backend skill;
- refactor Java và React skills để hỗ trợ routing;
- 10 application commands;
- application pack/registry/MCP synchronization;
- CLI contract, artifact, install và MCP tests;
- application README.

Không triển khai sâu các thay đổi thuộc Phase 2-5 như data subagents, security
rules cho Python, platform runtime verification, knowledge command hoặc legacy
alias lifecycle.

## File Map

### Context Và Routing

- Create: `packs/application/schemas/feature-context.schema.json`
- Create: `packs/application/skills/feature-implement/scripts/detect-feature-stack.mjs`
- Create: `cli/test/application-feature-routing.test.mjs`

### Orchestration Skills

- Create: `packs/application/skills/feature-plan/SKILL.md`
- Create: `packs/application/skills/api-contract-design/SKILL.md`
- Create: `packs/application/skills/feature-implement/SKILL.md`
- Create: `packs/application/skills/feature-integrate/SKILL.md`
- Create: `packs/application/skills/feature-review/SKILL.md`
- Create: `packs/application/skills/feature-test/SKILL.md`
- Create: `packs/application/skills/feature-fix/SKILL.md`
- Create: `packs/application/skills/feature-delivery/SKILL.md`
- Create: `packs/application/skills/feature-delivery/subagents/feature-delivery-gate-review.md`

### Stack Skills Và Subagents

- Modify: `packs/application/skills/java-analyze/SKILL.md`
- Create: `packs/application/skills/java-analyze/subagents/java-spring-implement.md`
- Modify: `packs/application/skills/react-code-generate/SKILL.md`
- Create: `packs/application/skills/react-code-generate/subagents/react-frontend-implement.md`
- Create: `packs/application/skills/python-backend-engineer/SKILL.md`
- Create: `packs/application/skills/python-backend-engineer/resources/python-backend-verification.md`
- Create: `packs/application/skills/python-backend-engineer/subagents/fastapi-backend-implement.md`
- Create: `packs/application/skills/python-backend-engineer/subagents/django-drf-backend-implement.md`

### Commands

- Create: `packs/application/commands/plan-feature.md`
- Create: `packs/application/commands/design-api-contract.md`
- Create: `packs/application/commands/design-data-change.md`
- Create: `packs/application/commands/implement-backend.md`
- Modify: `packs/application/commands/implement-frontend.md`
- Create: `packs/application/commands/integrate-feature.md`
- Create: `packs/application/commands/review-feature.md`
- Create: `packs/application/commands/test-feature.md`
- Create: `packs/application/commands/fix-feature.md`
- Create: `packs/application/commands/deliver-feature.md`
- Delete: `packs/application/commands/review-backend.md`

### Metadata Và Runtime

- Modify: `packs/application/pack.yaml`
- Modify: `core/routing/skill-registry.yaml`
- Modify: `core/routing/command-registry.yaml`
- Modify: `mcp-servers/application-mcp/mcp.json`
- Modify: `mcp-servers/application-mcp/src/tools/handlers.js`

### Tests Và Documentation

- Modify: `cli/test/contracts.test.mjs`
- Modify: `cli/test/mcp-tools.test.mjs`
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/test/builder.test.mjs`
- Modify: `packs/application/README.md`

---

### Task 1: Feature Context Schema Và Stack Detector

**Files:**
- Create: `packs/application/schemas/feature-context.schema.json`
- Create: `packs/application/skills/feature-implement/scripts/detect-feature-stack.mjs`
- Create: `cli/test/application-feature-routing.test.mjs`

- [ ] **Step 1: Viết test đỏ cho stack detection**

Tạo `cli/test/application-feature-routing.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  detectFeatureStacks,
} from "../../packs/application/skills/feature-implement/scripts/detect-feature-stack.mjs";

async function fixture(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "feature-stack-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const pathname = path.join(root, relativePath);
    await mkdir(path.dirname(pathname), { recursive: true });
    await writeFile(pathname, content);
  }
  return root;
}

test("detects Spring, FastAPI, Django DRF, and React modules", async () => {
  const root = await fixture({
    "java-service/pom.xml": "<artifactId>spring-boot-starter-web</artifactId>",
    "fastapi-service/pyproject.toml": 'dependencies = ["fastapi", "uvicorn"]',
    "django-service/requirements.txt": "Django==5.2\ndjangorestframework==3.16\n",
    "web/package.json": '{"dependencies":{"react":"^19.0.0"}}',
  });
  try {
    assert.deepEqual(await detectFeatureStacks(root), [
      { module: "django-service", stack: "django-drf" },
      { module: "fastapi-service", stack: "fastapi" },
      { module: "java-service", stack: "java-spring" },
      { module: "web", stack: "react" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("returns an ambiguous Python signal without guessing a framework", async () => {
  const root = await fixture({
    "api/pyproject.toml": 'dependencies = ["pydantic"]',
  });
  try {
    assert.deepEqual(await detectFeatureStacks(root), [
      { module: "api", stack: "python-ambiguous" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("feature context schema requires routing and evidence fields", async () => {
  const schema = JSON.parse(
    await readFile(
      path.join(
        process.cwd(),
        "packs/application/schemas/feature-context.schema.json",
      ),
      "utf8",
    ),
  );
  assert.deepEqual(schema.required, [
    "featureGoal",
    "acceptanceCriteria",
    "sourceScopes",
    "stackSignals",
    "artifacts",
    "verification",
    "residualRisks",
  ]);
  assert.equal(schema.properties.stackSignals.items.additionalProperties, false);
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run:

```powershell
node --test cli/test/application-feature-routing.test.mjs
```

Expected: FAIL với `ERR_MODULE_NOT_FOUND` cho
`detect-feature-stack.mjs`.

- [ ] **Step 3: Tạo feature context schema**

Tạo `packs/application/schemas/feature-context.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-engineering.dev/schemas/application/feature-context.schema.json",
  "title": "Application Feature Context",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "featureGoal",
    "acceptanceCriteria",
    "sourceScopes",
    "stackSignals",
    "artifacts",
    "verification",
    "residualRisks"
  ],
  "properties": {
    "featureGoal": { "type": "string", "minLength": 1 },
    "acceptanceCriteria": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "minLength": 1 }
    },
    "sourceScopes": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "minLength": 1 }
    },
    "stackSignals": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["module", "stack"],
        "properties": {
          "module": { "type": "string", "minLength": 1 },
          "stack": {
            "enum": [
              "java-spring",
              "fastapi",
              "django-drf",
              "python-ambiguous",
              "react"
            ]
          }
        }
      }
    },
    "uiStates": { "type": "array", "items": { "type": "string" } },
    "apiOperations": { "type": "array", "items": { "type": "string" } },
    "dataChanges": { "type": "array", "items": { "type": "string" } },
    "securityRequirements": { "type": "array", "items": { "type": "string" } },
    "testMatrix": { "type": "array", "items": { "type": "string" } },
    "artifacts": { "type": "array", "items": { "type": "string" } },
    "verification": { "type": "array", "items": { "type": "string" } },
    "residualRisks": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **Step 4: Implement stack detector tối thiểu**

Tạo `packs/application/skills/feature-implement/scripts/detect-feature-stack.mjs`:

```js
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SIGNAL_FILES = new Set([
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "pyproject.toml",
  "requirements.txt",
  "package.json",
]);

async function walk(root, current = root) {
  const matches = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "build", "target", ".venv"].includes(entry.name)) {
      continue;
    }
    const pathname = path.join(current, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await walk(root, pathname)));
    } else if (SIGNAL_FILES.has(entry.name)) {
      matches.push(pathname);
    }
  }
  return matches;
}

function relativeModule(root, pathname) {
  const relative = path.relative(root, path.dirname(pathname));
  return relative === "" ? "." : relative.replaceAll("\\", "/");
}

export async function detectFeatureStacks(root) {
  const byModule = new Map();
  for (const pathname of await walk(root)) {
    const module = relativeModule(root, pathname);
    const content = (await readFile(pathname, "utf8")).toLowerCase();
    const filename = path.basename(pathname);
    const stacks = byModule.get(module) ?? new Set();
    if (
      ["pom.xml", "build.gradle", "build.gradle.kts"].includes(filename) &&
      content.includes("spring")
    ) {
      stacks.add("java-spring");
    }
    if (["pyproject.toml", "requirements.txt"].includes(filename)) {
      if (content.includes("fastapi")) stacks.add("fastapi");
      if (content.includes("django") || content.includes("djangorestframework")) {
        stacks.add("django-drf");
      }
      if (!content.includes("fastapi") && !content.includes("django")) {
        stacks.add("python-ambiguous");
      }
    }
    if (filename === "package.json" && /["']react["']\s*:/.test(content)) {
      stacks.add("react");
    }
    byModule.set(module, stacks);
  }
  return [...byModule.entries()]
    .flatMap(([module, stacks]) =>
      [...stacks].map((stack) => ({ module, stack })),
    )
    .sort((left, right) =>
      `${left.module}:${left.stack}`.localeCompare(`${right.module}:${right.stack}`),
    );
}
```

- [ ] **Step 5: Chạy test để xác nhận đạt**

Run:

```powershell
node --test cli/test/application-feature-routing.test.mjs
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add packs/application/schemas/feature-context.schema.json packs/application/skills/feature-implement/scripts/detect-feature-stack.mjs cli/test/application-feature-routing.test.mjs
git commit -m "feat(application): add feature context and stack detection"
```

---

### Task 2: Orchestration Skill Contracts

**Files:**
- Create: `packs/application/skills/feature-plan/SKILL.md`
- Create: `packs/application/skills/api-contract-design/SKILL.md`
- Create: `packs/application/skills/feature-implement/SKILL.md`
- Create: `packs/application/skills/feature-integrate/SKILL.md`
- Create: `packs/application/skills/feature-review/SKILL.md`
- Create: `packs/application/skills/feature-test/SKILL.md`
- Create: `packs/application/skills/feature-fix/SKILL.md`
- Create: `packs/application/skills/feature-delivery/SKILL.md`
- Create: `packs/application/skills/feature-delivery/subagents/feature-delivery-gate-review.md`
- Modify: `cli/test/contracts.test.mjs`

- [ ] **Step 1: Viết test đỏ cho orchestration skill ownership**

Thêm vào `cli/test/contracts.test.mjs`:

```js
test("application owns the full-stack orchestration skill set", async () => {
  const plugins = await loadPlugins(repoRoot);
  const application = plugins.get("application");
  const owned = application.skills.map((item) => path.basename(path.dirname(item.path)));

  assert.deepEqual(
    [
      "api-contract-design",
      "feature-delivery",
      "feature-fix",
      "feature-implement",
      "feature-integrate",
      "feature-plan",
      "feature-review",
      "feature-test",
    ].filter((skill) => !owned.includes(skill)),
    [],
  );
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run:

```powershell
node --test cli/test/contracts.test.mjs
```

Expected: FAIL vì application manifest chưa khai báo orchestration skills.

- [ ] **Step 3: Tạo 8 `SKILL.md` theo skill authoring standard**

Mỗi file dùng chính xác cấu trúc sau, với giá trị tương ứng trong bảng:

```markdown
---
name: SKILL_NAME
description: DESCRIPTION
---

# DISPLAY_NAME

## Overview

OVERVIEW

## When to Use

WHEN_TO_USE

## Core Process

CORE_PROCESS

## Examples

- EXAMPLE_ONE
- EXAMPLE_TWO

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "The generic workflow is enough." | Route to the canonical stack skill or subagent when repository evidence identifies a supported stack. |
| "A missing gate can be filled in later." | Keep the phase blocked until the required evidence or user decision exists. |

## Red Flags

- Claims are not backed by source or command evidence.
- Work expands beyond the approved feature scope.
- A read-only mode changes production source.

## Verification

- Confirm the feature context fields used by this phase.
- Confirm selected source scopes and stack signals.
- Run the focused checks required by this phase.
- Report skipped checks and residual risks.

## Resource Map

RESOURCE_MAP

## Subagent Prompts

SUBAGENT_MAP

## Scripts

SCRIPT_MAP

## Output Format

OUTPUT_FORMAT

## Notes

- Preserve canonical ownership when calling shared skills.
- Return user-facing results in Vietnamese.
```

Dùng dữ liệu contract sau; `None.` là nội dung literal cho section không có
resource/subagent/script:

| File | `DISPLAY_NAME` | `description` | Core Process | Output Format |
| --- | --- | --- | --- | --- |
| `feature-plan/SKILL.md` | `Feature Planning` | `Use when decomposing a full-stack feature into UI, API, backend, data, test, dependencies, and acceptance gates before implementation.` | Đọc requirement/source scope; phát hiện stack; chuẩn hóa feature context; lập dependency graph; dừng khi acceptance criteria mơ hồ. | `Feature goal`, `Stack map`, `Dependency graph`, `Acceptance gates`, `Open questions`. |
| `api-contract-design/SKILL.md` | `API Contract Design` | `Use when designing or reviewing an API contract shared by React and Java/Spring, FastAPI, or Django DRF implementations.` | Đọc consumer/provider; định nghĩa operation/schema/error/auth; kiểm compatibility; ghi contract vào feature context; chỉ đọc. | `Operations`, `Schemas`, `Error model`, `Compatibility`, `Verification`. |
| `feature-implement/SKILL.md` | `Feature Implementation` | `Use when implementing backend or frontend work for a planned feature and routing detailed work to Java/Spring, FastAPI, Django DRF, or React subagents.` | Đọc approved feature context; chạy detector; reject ambiguous Python; chọn canonical skill/subagent; giới hạn source scope; chạy focused verification. | `Selected modules`, `Selected subagents`, `Changes`, `Verification`, `Residual risks`. |
| `feature-integrate/SKILL.md` | `Feature Integration` | `Use when connecting React, API, backend, and database changes and resolving evidence-backed contract mismatches.` | Đọc artifacts; so contract; kiểm serialization/auth/error/state; chỉ sửa mismatch được chứng minh; chạy contract/integration checks. | `Integration map`, `Mismatches`, `Changes`, `Verification`, `Blocked gates`. |
| `feature-review/SKILL.md` | `Feature Review` | `Use when reviewing a full-stack feature across correctness, maintainability, API and data compatibility, regression risk, and requested security scope.` | Đọc diff/context; route stack reviews; tổng hợp findings không nhân bản domain rules; sort severity; report skipped extension. | `Critical findings`, `Major findings`, `Test gaps`, `Skipped reviews`, `Residual risk`. |
| `feature-test/SKILL.md` | `Feature Testing` | `Use when turning feature acceptance criteria into unit, integration, contract, and end-to-end verification through the canonical quality skills.` | Đọc acceptance; gọi QA review; chọn executable tests; gọi test automation; không sửa production source; trả evidence. | `Test matrix`, `Added tests`, `Executed tests`, `Failures`, `Exit criteria`. |
| `feature-fix/SKILL.md` | `Feature Fixing` | `Use when applying selected review findings or failing-test fixes within an approved source scope and rerunning regression verification.` | Validate findings; group by module; chọn stack subagent; sửa nhỏ nhất; chạy regression; giữ unresolved findings. | `Selected findings`, `Changes`, `Verification`, `Unresolved findings`, `Residual risk`. |
| `feature-delivery/SKILL.md` | `Feature Delivery` | `Use when orchestrating an entire full-stack feature lifecycle from planning through implementation, integration, review, test, optional fix, and release-readiness reporting.` | Validate inputs; gọi phase skills theo gate; không bypass blocked gate; chỉ chạy extension khi requested/installed; tổng hợp artifacts/evidence. | `Phase status`, `Artifacts`, `Verification`, `Blocked gates`, `Release readiness`. |

`OVERVIEW` là một câu diễn đạt responsibility trong cột Core Process.
`WHEN_TO_USE` lặp lại trigger của description dưới dạng một đoạn văn.
`EXAMPLE_ONE` là command chính của skill; `EXAMPLE_TWO` là tình huống blocked
gate tương ứng. `RESOURCE_MAP`, `SUBAGENT_MAP`, `SCRIPT_MAP` mặc định là
`None.` ngoại trừ hai references bắt buộc bên dưới.

Trong `feature-implement/SKILL.md`, `Resource Map` phải tham chiếu:

```markdown
- `scripts/detect-feature-stack.mjs`: detect Java/Spring, FastAPI, Django DRF, ambiguous Python, and React modules before routing implementation.
```

Trong `feature-delivery/SKILL.md`, `Subagent Prompts` phải tham chiếu:

```markdown
- `subagents/feature-delivery-gate-review.md`: independently review phase evidence before declaring the next gate open.
```

- [ ] **Step 4: Tạo gate reviewer prompt**

Tạo `feature-delivery/subagents/feature-delivery-gate-review.md`:

```markdown
# Feature Delivery Gate Reviewer

Review one completed delivery phase independently.

Inputs:
- phase name
- feature context
- changed artifacts
- verification evidence
- declared residual risks

Checks:
1. Confirm outputs match the phase contract.
2. Reject claims without source or command evidence.
3. Confirm blocked acceptance criteria remain blocked.
4. Confirm write actions matched the phase permission.
5. Return `open`, `blocked`, or `needs-user-decision` with reasons.
```

- [ ] **Step 5: Tạm thời cập nhật manifest/registry để validator nhận skill folders**

Trong `packs/application/pack.yaml`, thêm 8 skill names vào `assets.skills` và
8 canonical entries vào `skills`. Trong
`core/routing/skill-registry.yaml`, thêm đúng 8 names vào `application`.

Không đổi command catalog trong task này.

- [ ] **Step 6: Chạy test và validator**

Run:

```powershell
node --test cli/test/contracts.test.mjs
npm run validate
```

Expected: tests PASS; validator PASS.

- [ ] **Step 7: Commit**

```powershell
git add packs/application/skills/feature-* packs/application/skills/api-contract-design packs/application/pack.yaml core/routing/skill-registry.yaml cli/test/contracts.test.mjs
git commit -m "feat(application): add feature orchestration skills"
```

---

### Task 3: Java Và React Implementation Subagents

**Files:**
- Modify: `packs/application/skills/java-analyze/SKILL.md`
- Create: `packs/application/skills/java-analyze/subagents/java-spring-implement.md`
- Modify: `packs/application/skills/react-code-generate/SKILL.md`
- Create: `packs/application/skills/react-code-generate/subagents/react-frontend-implement.md`

- [ ] **Step 1: Viết test đỏ cho subagent references**

Thêm vào `cli/test/contracts.test.mjs`:

```js
test("Java and React canonical skills expose implementation subagents", async () => {
  const java = await readFile(
    path.join(repoRoot, "packs/application/skills/java-analyze/SKILL.md"),
    "utf8",
  );
  const react = await readFile(
    path.join(repoRoot, "packs/application/skills/react-code-generate/SKILL.md"),
    "utf8",
  );
  assert.match(java, /subagents\/java-spring-implement[.]md/);
  assert.match(react, /subagents\/react-frontend-implement[.]md/);
});
```

Đồng thời thêm `readFile` vào import hiện có từ `node:fs/promises`.

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run:

```powershell
node --test cli/test/contracts.test.mjs
```

Expected: FAIL vì hai references chưa tồn tại.

- [ ] **Step 3: Tạo Java implementation subagent**

Tạo `java-spring-implement.md`:

```markdown
# Java Spring Implementation

Implement an approved feature context in one Spring module.

1. Read the module build file, package conventions, API contract, persistence
   boundary, and existing tests.
2. Keep controllers limited to transport mapping and validation.
3. Put orchestration and transaction boundaries in application services.
4. Keep domain decisions independent from Spring and persistence types where
   the existing architecture supports it.
5. Implement request/response mapping, authorization, errors, persistence, and
   async behavior required by the approved contract.
6. Run the narrowest Maven or Gradle tests proving the change.

Return changed behavior, files, commands, results, and residual risks.
Do not broaden scope beyond the selected module.
```

- [ ] **Step 4: Refactor `java-analyze/SKILL.md`**

Thêm `implement` vào description/When to Use, thêm bước route
`java-spring-implement` trong Core Process, và thêm reference:

```markdown
- [subagents/java-spring-implement.md](subagents/java-spring-implement.md): implement an approved Spring feature within one module and run focused Maven or Gradle verification.
```

Giữ nguyên resources, scripts và review subagents hiện có.

- [ ] **Step 5: Tạo React implementation subagent**

Tạo `react-frontend-implement.md`:

```markdown
# React Frontend Implementation

Implement an approved feature context in one React application.

1. Read route, component, styling, state, API client, and test conventions.
2. Implement the smallest complete user flow.
3. Cover loading, empty, success, validation, permission, and error states
   required by the contract.
4. Reuse the existing component system and accessibility patterns.
5. Keep API schemas and error handling aligned with the approved contract.
6. Run focused typecheck, lint, component tests, and browser verification when
   available.

Return changed behavior, files, commands, results, and residual risks.
Do not replace real integration with undeclared mock behavior.
```

- [ ] **Step 6: Refactor `react-code-generate/SKILL.md`**

Thêm reference:

```markdown
- [subagents/react-frontend-implement.md](subagents/react-frontend-implement.md): implement an approved React feature context with API integration, UX states, accessibility, and focused verification.
```

Trong Core Process, route approved feature-context work tới subagent này trước
các specialist review subagents.

- [ ] **Step 7: Chạy tests**

Run:

```powershell
node --test cli/test/contracts.test.mjs
npm run validate
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add packs/application/skills/java-analyze packs/application/skills/react-code-generate cli/test/contracts.test.mjs
git commit -m "feat(application): add Java and React implementation routing"
```

---

### Task 4: Python Backend Canonical Skill

**Files:**
- Create: `packs/application/skills/python-backend-engineer/SKILL.md`
- Create: `packs/application/skills/python-backend-engineer/resources/python-backend-verification.md`
- Create: `packs/application/skills/python-backend-engineer/subagents/fastapi-backend-implement.md`
- Create: `packs/application/skills/python-backend-engineer/subagents/django-drf-backend-implement.md`
- Modify: `packs/application/pack.yaml`
- Modify: `core/routing/skill-registry.yaml`
- Modify: `cli/test/contracts.test.mjs`

- [ ] **Step 1: Viết test đỏ cho Python ownership**

Thêm:

```js
test("application owns one Python backend skill with FastAPI and Django routing", async () => {
  const skill = await readFile(
    path.join(
      repoRoot,
      "packs/application/skills/python-backend-engineer/SKILL.md",
    ),
    "utf8",
  );
  assert.match(skill, /fastapi-backend-implement[.]md/);
  assert.match(skill, /django-drf-backend-implement[.]md/);
  assert.match(skill, /python-backend-verification[.]md/);
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run:

```powershell
node --test cli/test/contracts.test.mjs
```

Expected: FAIL với `ENOENT` cho Python skill.

- [ ] **Step 3: Tạo `python-backend-engineer/SKILL.md`**

Frontmatter:

```yaml
---
name: python-backend-engineer
description: Use when designing, implementing, or reviewing Python backend features in FastAPI or Django REST Framework, including API contracts, validation, persistence, authorization, async behavior, and pytest verification.
---
```

Core Process:

```markdown
1. Read the selected Python module, dependency manifest, framework config, API
   contract, persistence layer, and tests.
2. Reject ambiguous framework detection until the user or repository evidence
   selects FastAPI or Django REST Framework.
3. Route implementation to the matching framework subagent.
4. Keep transport, application, domain, and persistence responsibilities
   explicit within the existing project conventions.
5. Run focused pytest, type, lint, migration, and framework checks from the
   verification resource.
6. Return changed behavior, evidence, and residual risks in Vietnamese.
```

Resource/Subagent map:

```markdown
- [resources/python-backend-verification.md](resources/python-backend-verification.md): select deterministic verification for FastAPI and Django DRF projects.
- [subagents/fastapi-backend-implement.md](subagents/fastapi-backend-implement.md): implement an approved FastAPI feature.
- [subagents/django-drf-backend-implement.md](subagents/django-drf-backend-implement.md): implement an approved Django REST Framework feature.
```

Hoàn thiện các headings còn lại theo template với red flags:
framework guessing, blocking I/O trong async route, ORM leakage, missing
authorization và tests chỉ có happy path.

- [ ] **Step 4: Tạo FastAPI subagent**

```markdown
# FastAPI Backend Implementation

1. Read routers, dependency injection, Pydantic models, service boundaries,
   persistence adapters, exception handlers, and pytest fixtures.
2. Implement the approved request/response and error contract.
3. Keep business logic outside route functions.
4. Preserve async boundaries; do not call blocking I/O from async routes
   without an explicit adapter.
5. Apply authentication, authorization, validation, transaction, and
   idempotency requirements from the feature context.
6. Run focused pytest and configured lint/type checks.

Return changed files, behavior, verification evidence, and residual risks.
```

- [ ] **Step 5: Tạo Django DRF subagent**

```markdown
# Django DRF Backend Implementation

1. Read apps, URLs, serializers, views/viewsets, permissions, services, models,
   migrations, and pytest/Django test conventions.
2. Implement the approved request/response and error contract.
3. Keep serializers focused on transport validation and representation.
4. Put business orchestration in the existing service/application boundary.
5. Apply object-level permissions, transaction boundaries, query optimization,
   and migration safety required by the feature context.
6. Run focused pytest and Django system checks.

Return changed files, behavior, verification evidence, and residual risks.
```

- [ ] **Step 6: Tạo verification resource**

```markdown
# Python Backend Verification

## Detection

- Prefer the repository's configured task runner and lockfile.
- FastAPI signals: `fastapi` dependency, router imports, ASGI app.
- Django DRF signals: `django`, `djangorestframework`, settings module.

## Focused Commands

- Tests: `pytest tests/api/test_orders.py -q`
- Ruff: `ruff check src/orders tests/api/test_orders.py`
- Mypy: `mypy src/orders` when configured
- FastAPI import smoke: run the repository's ASGI import/test command
- Django checks: `python manage.py check`
- Django migration drift: `python manage.py makemigrations --check --dry-run`

Report commands that are unavailable or unconfigured as skipped.
```

- [ ] **Step 7: Đồng bộ manifest và registry**

Thêm `python-backend-engineer` vào:

- `pack.yaml.assets.skills`;
- `pack.yaml.skills` với ID `application.python_backend_engineer`;
- `core/routing/skill-registry.yaml` application list.

Không thêm top-level Codex agent trong Phase 1; skill được gọi qua
`feature-implement`.

- [ ] **Step 8: Chạy tests và commit**

```powershell
node --test cli/test/contracts.test.mjs
npm run validate
git add packs/application/skills/python-backend-engineer packs/application/pack.yaml core/routing/skill-registry.yaml cli/test/contracts.test.mjs
git commit -m "feat(application): add Python backend engineering skill"
```

Expected: tests và validator PASS.

---

### Task 5: Ten Deliverable Commands

**Files:**
- Create/Modify/Delete: `packs/application/commands/*.md`
- Modify: `cli/test/contracts.test.mjs`

- [ ] **Step 1: Viết test đỏ cho 10 command files**

Thêm:

```js
test("application defines ten parseable deliverable command files", async () => {
  const commandIds = [
    "deliver-feature",
    "design-api-contract",
    "design-data-change",
    "fix-feature",
    "implement-backend",
    "implement-frontend",
    "integrate-feature",
    "plan-feature",
    "review-feature",
    "test-feature",
  ];
  for (const commandId of commandIds) {
    const command = await loadCanonicalCommand(
      path.join(repoRoot, "packs/application/commands", `${commandId}.md`),
    );
    assert.equal(command.id, commandId);
    assert.ok(command.intent.length > 0);
    assert.ok(command.inputs.length > 0);
    assert.ok(command.requiredSkills.length > 0);
    assert.ok(command.steps.length > 0);
    assert.ok(command.outputContract.length > 0);
  }
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run:

```powershell
node --test cli/test/contracts.test.mjs
```

Expected: FAIL vì command files mới chưa tồn tại.

- [ ] **Step 3: Tạo command contracts**

Mỗi command dùng frontmatter `version: 1.0.0` và đủ `Intent`, `Inputs`,
`Required Skills`, `Steps`, `Output Contract`.

| File / id | Required Skills | Inputs | Output Contract |
| --- | --- | --- | --- |
| `plan-feature.md` / `plan-feature` | `feature-plan` | `feature requirements`, `source scope`, `constraints` | `feature context`, `stack map`, `dependency graph`, `acceptance gates`, `open questions` |
| `design-api-contract.md` / `design-api-contract` | `api-contract-design` | `feature context`, `consumer/provider scope`, `compatibility constraints` | `operations`, `schemas`, `error model`, `authorization`, `compatibility checks` |
| `design-data-change.md` / `design-data-change` | `feature-plan`, `data-migration` | `feature context`, `current data contract`, `availability constraints` | `schema changes`, `migration stages`, `rollback`, `reconciliation`, `data gates` |
| `implement-backend.md` / `implement-backend` | `feature-implement`, `java-analyze`, `python-backend-engineer` | `approved feature context`, `backend source scope` | `selected stack`, `changed behavior`, `changed files`, `verification`, `residual risks` |
| `implement-frontend.md` / `implement-frontend` | `feature-implement`, `react-code-generate` | `approved feature context`, `frontend source scope` | `implemented user flow`, `API integration`, `UX states`, `accessibility`, `verification` |
| `integrate-feature.md` / `integrate-feature` | `feature-integrate`, `api-contract-design` | `feature context`, `backend/frontend artifacts` | `integration map`, `contract mismatches`, `changes`, `verification`, `blocked gates` |
| `review-feature.md` / `review-feature` | `feature-review`, `java-analyze`, `python-backend-engineer`, `react-code-generate` | `feature context`, `changed-file scope`, `requested extensions` | `critical findings`, `major findings`, `test gaps`, `skipped reviews`, `residual risk` |
| `test-feature.md` / `test-feature` | `feature-test`, `test-qa-review`, `test-automation-validate` | `feature context`, `changed-file scope` | `test matrix`, `added tests`, `executed tests`, `failures`, `exit criteria` |
| `fix-feature.md` / `fix-feature` | `feature-fix`, `feature-implement`, `test-automation-validate` | `selected findings`, `approved source scope` | `fixed findings`, `changed files`, `verification`, `unresolved findings`, `residual risk` |
| `deliver-feature.md` / `deliver-feature` | `feature-delivery`, `feature-plan`, `feature-implement`, `feature-integrate`, `feature-review`, `feature-test` | `feature requirements`, `source scope`, `include extensions` | `phase status`, `artifacts`, `verification`, `blocked gates`, `release readiness` |

Steps của từng command phải dùng động từ cụ thể theo đúng responsibility trong
bảng, không ghi “perform the workflow”.

- [ ] **Step 4: Giữ command cũ chưa kích hoạt**

Chưa xóa `review-backend.md` và chưa đổi `pack.yaml` trong task này. Mười command
mới tồn tại nhưng chưa được activate, nhờ đó repository validator vẫn xanh
trước khi metadata và MCP được chuyển atomically ở Task 6.

- [ ] **Step 5: Chạy command parser tests**

Run:

```powershell
node --test cli/test/contracts.test.mjs
```

Expected: PASS; `npm run validate` vẫn PASS vì catalog active chưa thay đổi.

- [ ] **Step 6: Commit command files**

```powershell
git add packs/application/commands cli/test/contracts.test.mjs
git commit -m "feat(application): define full-stack delivery commands"
```

---

### Task 6: Activate Commands, Routing Và Application MCP Atomically

**Files:**
- Modify: `packs/application/pack.yaml`
- Modify: `core/routing/command-registry.yaml`
- Modify: `core/routing/skill-registry.yaml`
- Modify: `cli/test/contracts.test.mjs`
- Modify: `mcp-servers/application-mcp/mcp.json`
- Modify: `mcp-servers/application-mcp/src/tools/handlers.js`
- Modify: `cli/test/mcp-tools.test.mjs`
- Delete: `packs/application/commands/review-backend.md`

- [ ] **Step 1: Viết test đỏ cho catalog và namespaced mapping**

Thêm:

```js
test("application exposes ten commands mapped one-to-one to MCP tools", async () => {
  const plugins = await loadPlugins(repoRoot);
  const application = plugins.get("application");
  assert.deepEqual(application.assets.commands, [
    "deliver-feature",
    "design-api-contract",
    "design-data-change",
    "fix-feature",
    "implement-backend",
    "implement-frontend",
    "integrate-feature",
    "plan-feature",
    "review-feature",
    "test-feature",
  ]);
  const commands = application.commands;
  assert.equal(commands.length, 10);
  for (const command of commands) {
    assert.equal(command.id, command.mcp_tool);
    assert.match(command.id, /^application[.]/);
  }
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run:

```powershell
node --test cli/test/contracts.test.mjs
```

Expected: FAIL vì canonical command metadata vẫn dùng mapping legacy.

- [ ] **Step 3: Thay application MCP cases bằng 10 failing cases**

Trong `CASES` của `cli/test/mcp-tools.test.mjs`, thay ba application cases bằng:

```js
["application", "application.plan_feature", {
  featureGoal: "Add checkout confirmation",
  sourceScope: "services/checkout and web",
}, ["featureContext", "stackMap", "dependencyGraph", "acceptanceGates"], "featureGoal"],
["application", "application.design_api_contract", {
  featureContext: "checkout confirmation",
  consumerProviderScope: "React to checkout API",
}, ["operations", "schemas", "errorModel", "compatibilityChecks"], "featureContext"],
["application", "application.design_data_change", {
  featureContext: "checkout confirmation",
  currentDataContract: "orders v1",
}, ["schemaChanges", "migrationStages", "rollbackPlan", "dataGates"], "currentDataContract"],
["application", "application.implement_backend", {
  featureContext: "approved checkout feature",
  backendScope: "services/checkout",
}, ["selectedStack", "changedBehavior", "changedFiles", "verification"], "backendScope"],
["application", "application.implement_frontend", {
  featureContext: "approved checkout feature",
  frontendScope: "web",
}, ["implementedFlow", "apiIntegration", "uxStates", "verification"], "frontendScope"],
["application", "application.integrate_feature", {
  featureContext: "checkout feature",
  implementationArtifacts: "backend and frontend summaries",
}, ["integrationMap", "contractMismatches", "verification", "blockedGates"], "implementationArtifacts"],
["application", "application.review_feature", {
  featureContext: "checkout feature",
  changedFileScope: "checkout diff",
}, ["criticalFindings", "majorFindings", "testGaps", "residualRisk"], "changedFileScope"],
["application", "application.test_feature", {
  featureContext: "checkout feature",
  changedFileScope: "checkout diff",
}, ["testMatrix", "executedTests", "failures", "exitCriteria"], "featureContext"],
["application", "application.fix_feature", {
  selectedFindings: "CHK-001",
  approvedSourceScope: "services/checkout",
}, ["fixedFindings", "changedFiles", "verification", "unresolvedFindings"], "selectedFindings"],
["application", "application.deliver_feature", {
  featureGoal: "Add checkout confirmation",
  sourceScope: "services/checkout and web",
}, ["phaseStatus", "artifacts", "verification", "releaseReadiness"], "sourceScope"],
```

- [ ] **Step 4: Chạy MCP tests để xác nhận thất bại**

Run:

```powershell
node --test cli/test/mcp-tools.test.mjs
```

Expected: FAIL vì tools mới chưa được declared.

- [ ] **Step 5: Chuẩn hóa `pack.yaml`**

Đặt `assets.commands` theo danh sách Task 5.

Đặt canonical commands:

```json
[
  { "id": "application.deliver_feature", "file": "commands/deliver-feature.md", "mcp_tool": "application.deliver_feature" },
  { "id": "application.design_api_contract", "file": "commands/design-api-contract.md", "mcp_tool": "application.design_api_contract" },
  { "id": "application.design_data_change", "file": "commands/design-data-change.md", "mcp_tool": "application.design_data_change" },
  { "id": "application.fix_feature", "file": "commands/fix-feature.md", "mcp_tool": "application.fix_feature" },
  { "id": "application.implement_backend", "file": "commands/implement-backend.md", "mcp_tool": "application.implement_backend" },
  { "id": "application.implement_frontend", "file": "commands/implement-frontend.md", "mcp_tool": "application.implement_frontend" },
  { "id": "application.integrate_feature", "file": "commands/integrate-feature.md", "mcp_tool": "application.integrate_feature" },
  { "id": "application.plan_feature", "file": "commands/plan-feature.md", "mcp_tool": "application.plan_feature" },
  { "id": "application.review_feature", "file": "commands/review-feature.md", "mcp_tool": "application.review_feature" },
  { "id": "application.test_feature", "file": "commands/test-feature.md", "mcp_tool": "application.test_feature" }
]
```

Đảm bảo `assets.skills` chứa mọi Required Skill của 10 commands, gồm shared
skills `data-migration`, `test-qa-review`, `test-automation-validate`.

- [ ] **Step 6: Chuẩn hóa command registry**

Thay ba application entries legacy bằng 10 entries có ID/file giống canonical
list ở trên. Registry ID phải chính là MCP tool ID.

- [ ] **Step 7: Xác nhận skill registry**

Application skill registry phải gồm chính xác:

```json
[
  "api-contract-design",
  "doc-write",
  "feature-delivery",
  "feature-fix",
  "feature-implement",
  "feature-integrate",
  "feature-plan",
  "feature-review",
  "feature-test",
  "java-analyze",
  "python-backend-engineer",
  "react-code-generate"
]
```

- [ ] **Step 8: Thay `mcp.json` bằng 10 structured tools**

Mỗi tool dùng:

```json
"annotations": {
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

Input required fields và output required fields phải khớp chính xác với CASES
ở Step 1. `additionalProperties` đặt `false`; optional `constraints` và
`includeExtensions` dùng array of strings khi phù hợp.

Phase 1 MCP tools là workflow-oriented read-only tools. Quyền ghi source nằm
trong skill execution mode, không nằm trong MCP handler.

- [ ] **Step 9: Thay handler definitions**

Trong `handlers.js`, khai báo đủ 10 keys, ví dụ:

```js
"application.plan_feature": {
  required: ["featureGoal", "sourceScope"],
  focus: "a bounded full-stack feature plan with explicit acceptance gates",
  listOutputs: ["featureContext", "stackMap", "dependencyGraph", "acceptanceGates"],
},
```

Thêm chín handler definitions còn lại với `required` và `listOutputs` chính xác
theo từng CASES ở Step 3. Tập key cuối cùng phải bằng đúng:

```js
[
  "application.deliver_feature",
  "application.design_api_contract",
  "application.design_data_change",
  "application.fix_feature",
  "application.implement_backend",
  "application.implement_frontend",
  "application.integrate_feature",
  "application.plan_feature",
  "application.review_feature",
  "application.test_feature",
]
```

Không giữ ba legacy handler keys.

- [ ] **Step 10: Xóa command legacy**

Delete:

```text
packs/application/commands/review-backend.md
```

- [ ] **Step 11: Chạy MCP và repository tests**

Run:

```powershell
node --test cli/test/mcp-contracts.test.mjs cli/test/mcp-tools.test.mjs
npm run validate
```

Expected: PASS; validator tìm thấy 10 command registry IDs trong MCP contracts.

- [ ] **Step 12: Commit atomic activation**

```powershell
git add packs/application/pack.yaml packs/application/commands/review-backend.md core/routing/command-registry.yaml core/routing/skill-registry.yaml mcp-servers/application-mcp/mcp.json mcp-servers/application-mcp/src/tools/handlers.js cli/test/contracts.test.mjs cli/test/mcp-tools.test.mjs
git commit -m "feat(application): activate feature delivery contracts"
```

---

### Task 7: Artifact, Catalog Và Install Expectations

**Files:**
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/test/builder.test.mjs`

- [ ] **Step 1: Cập nhật failing lifecycle assertions**

Trong catalog test:

```js
assert.ok(application.assets.skills.includes("python-backend-engineer"));
assert.ok(application.assets.skills.includes("feature-delivery"));
assert.ok(application.assets.commands.includes("deliver-feature"));
assert.equal(application.assets.commands.includes("review-backend"), false);
```

Trong installed check test:

```js
assert.equal(check.commands.count, 11);
assert.ok(
  check.commands.installed.some((item) => item.id === "deliver-feature"),
);
assert.ok(
  check.commands.installed.some((item) => item.id === "implement-backend"),
);
assert.ok(
  check.skills.installed.some((item) => item.id === "python-backend-engineer"),
);
assert.ok(
  check.skills.installed.some((item) => item.id === "feature-delivery"),
);
```

Count là 10 application commands + 1 architecture command.

- [ ] **Step 2: Cập nhật builder checksum assertions**

Thay:

```js
"commands/review-backend.md",
```

bằng:

```js
"commands/deliver-feature.md",
"commands/implement-backend.md",
"skills/feature-delivery/SKILL.md",
"skills/python-backend-engineer/SKILL.md",
```

- [ ] **Step 3: Chạy tests**

Run:

```powershell
node --test cli/test/lifecycle.test.mjs cli/test/builder.test.mjs
```

Expected: PASS; application artifact/install chứa command và skills mới.

- [ ] **Step 4: Commit**

```powershell
git add cli/test/lifecycle.test.mjs cli/test/builder.test.mjs
git commit -m "test(application): cover feature delivery installation"
```

---

### Task 8: Application README

**Files:**
- Modify: `packs/application/README.md`

- [ ] **Step 1: Viết nội dung README tiếng Anh**

Thay README một dòng bằng:

```markdown
# Application Pack

The Application pack owns full-stack feature delivery across React,
Java/Spring, Python/FastAPI, Python/Django REST Framework, APIs, and application
integration.

## Public Commands

- `plan-feature`
- `design-api-contract`
- `design-data-change`
- `implement-backend`
- `implement-frontend`
- `integrate-feature`
- `review-feature`
- `test-feature`
- `fix-feature`
- `deliver-feature`

Commands are thin public contracts. Orchestration lives in feature skills, and
framework-specific implementation lives in Java, Python, and React subagents.

## Execution Modes

- Plan, design, and review are read-only.
- Implement and fix may edit only the approved source scope.
- Test may edit tests and fixtures but not production source.
- Deliver preserves the permissions of each delegated phase.

## Canonical Stack Skills

- `java-analyze`
- `python-backend-engineer`
- `react-code-generate`

Shared quality, data, architecture, security, and documentation capabilities
retain ownership in their canonical packs.
```

Không tạo `packs/application/README_VI.md`, vì bilingual rule chỉ áp dụng depth
0-1; `packs/application` ở depth 2.

- [ ] **Step 2: Chạy documentation-related tests**

Run:

```powershell
node --test cli/test/distribution.test.mjs cli/test/contracts.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add packs/application/README.md
git commit -m "docs(application): document full-stack delivery commands"
```

---

### Task 9: Full Verification Và Phase 1 Handoff

**Files:**
- Verify only; modify files only when a failing check reveals a Phase 1 defect.

- [ ] **Step 1: Chạy focused tests**

```powershell
node --test cli/test/application-feature-routing.test.mjs
node --test cli/test/contracts.test.mjs
node --test cli/test/mcp-contracts.test.mjs cli/test/mcp-tools.test.mjs
node --test cli/test/lifecycle.test.mjs cli/test/builder.test.mjs
```

Expected: tất cả PASS.

- [ ] **Step 2: Chạy required repository verification**

```powershell
npm test
npm run validate
npm run build:cli
```

Expected:

- `npm test`: PASS;
- `npm run validate`: `Validated 7 plugins for 3 providers.`;
- `npm run build:cli`: exit code 0.

- [ ] **Step 3: Chạy target-project smoke test trong temp directory**

```powershell
$target = Join-Path $env:TEMP "aie-application-foundation-smoke"
if (Test-Path $target) { Remove-Item -LiteralPath $target -Recurse -Force }
New-Item -ItemType Directory -Path $target | Out-Null
Push-Location $target
try {
  node "E:\Mine\AI\ai-codex-workflow-kit\cli\dist\index.js" init
  node "E:\Mine\AI\ai-codex-workflow-kit\cli\dist\index.js" install application quality --target cursor
  node "E:\Mine\AI\ai-codex-workflow-kit\cli\dist\index.js" doctor
} finally {
  Pop-Location
}
```

Expected: init/install/doctor đều exit 0; target có 10 application commands,
feature skills và Python skill.

- [ ] **Step 4: Kiểm tra legacy flow không còn active**

```powershell
rg -n "review-backend|application[.]review_backend|application[.]review_source_code|application[.]generate_service" packs/application core/routing mcp-servers/application-mcp cli/test
```

Expected: không có match. Nếu changelog/migration docs lịch sử chứa tên cũ thì
không sửa trong Phase 1.

- [ ] **Step 5: Kiểm tra worktree và diff**

```powershell
git status --short
git diff --check
git log --oneline -10
```

Expected: không có whitespace errors; chỉ còn thay đổi chủ ý chưa commit.

- [ ] **Step 6: Commit fix xác minh nếu có**

Chỉ khi Step 1-5 phát hiện defect trong Phase 1:

```powershell
git add packs/application core/routing mcp-servers/application-mcp cli/test
git commit -m "fix(application): complete foundation verification"
```

- [ ] **Step 7: Báo cáo handoff**

Báo bằng tiếng Việt:

- commands/skills/subagents đã thêm;
- Java/Python/React routing;
- exact verification commands và kết quả;
- skipped checks;
- residual risks;
- Phase 2 chưa triển khai: architecture/data specialization.

Không tuyên bố toàn roadmap hoàn thành; chỉ tuyên bố `Phase 1: Application
Foundation` hoàn thành.
