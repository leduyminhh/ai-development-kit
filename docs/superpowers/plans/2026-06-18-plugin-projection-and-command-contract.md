# Plugin Projection And Command Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa command contract, projection contract và hybrid install wizard để install, build và doctor dùng cùng một mô hình provider-native, deterministic và có ownership rõ ràng.

**Architecture:** Canonical command Markdown là nguồn semantic duy nhất; resolver tạo graph provider-neutral; projection input builder nạp command model một lần; adapter Codex/Claude/Cursor sở hữu toàn bộ destination path và render provider-native; lifecycle chỉ materialize projection, merge managed files và áp dụng transaction. CLI install tạo request draft có provenance, bổ sung lựa chọn qua detection/wizard, dựng install plan read-only, rồi chỉ gọi lifecycle sau `Install` hoặc `--yes`.

**Tech Stack:** Node.js ESM, TypeScript build wrapper, Node test runner, `@iarna/toml`, `node:readline/promises`, JSON contracts lưu trong file `.yaml`, transaction/ownership hiện có.

---

## Phân Rã File Và Trách Nhiệm

### File mới

- `cli/src/command-contracts.mjs`: parse, normalize và validate canonical command Markdown; không consumer nào tự parse lại.
- `cli/src/projection-contracts.mjs`: validate projection input/output, operation, ownership và contained relative paths.
- `cli/src/projection-input.mjs`: tạo provider-neutral input từ resolved graph và canonical assets.
- `cli/src/install-request.mjs`: parse install arguments, provenance, khóa explicit values và validate non-interactive completeness.
- `cli/src/provider-detection.mjs`: phát hiện Codex/Claude/Cursor từ tín hiệu filesystem read-only.
- `cli/src/install-plan.mjs`: kết hợp graph, projection và transaction preview thành JSON deterministic.
- `cli/src/install-wizard.mjs`: ordered interactive steps, `Install / Back / Cancel`, không ghi filesystem.
- `adapters/codex/projector.mjs`: Codex project/global layout và workflow catalog rendering.
- `adapters/claude/projector.mjs`: Claude project/global layout và native command rendering.
- `adapters/cursor/projector.mjs`: Cursor project/global layout và rule rendering.
- `cli/test/command-contracts.test.mjs`
- `cli/test/projection-contracts.test.mjs`
- `cli/test/install-request.test.mjs`
- `cli/test/provider-detection.test.mjs`
- `cli/test/install-plan.test.mjs`
- `cli/test/install-wizard.test.mjs`

### File sửa

- `cli/src/contracts.mjs`: giữ platform/plugin validation, gọi command contract loader mới.
- `cli/src/providers.mjs`: chỉ dispatch adapter và validate output.
- `cli/src/resolver.mjs`: resolve root/required/optional graph và ownership theo canonical asset id.
- `cli/src/lifecycle.mjs`: materialize `copy`/`render`, managed instruction/MCP merge, transaction và state.
- `cli/src/transaction.mjs`: expose preview data, rollback cả managed instruction/state và dùng metadata ownership schema mới.
- `cli/src/state.mjs`: ownership schema version 2 với `assetType`, `assetId`, `owners`, `shared`.
- `cli/src/builder.mjs`: build canonical assets và provider projections bằng cùng adapter contract.
- `cli/src/doctor.mjs`: tái tạo expected projection từ lock và so sánh descriptor/ownership.
- `cli/src/cli.mjs`: orchestration hybrid parser/detection/wizard/preview/confirmation.
- `cli/test/contracts.test.mjs`, `providers.test.mjs`, `resolver.test.mjs`, `lifecycle.test.mjs`, `transaction.test.mjs`, `builder.test.mjs`, `doctor.test.mjs`, `cli.test.mjs`, `distribution.test.mjs`.
- Toàn bộ `plugins/*/plugin.yaml` và `plugins/*/commands/*.md`.
- `core/routing/command-registry.yaml`.
- `core/schemas/ownership.schema.json`.
- `README.md`, `README_VI.md`, `cli/README.md`, `cli/README_VI.md`.

## Canonical Command Migration Matrix

| Plugin | File | Canonical id | `mcpTool` |
| --- | --- | --- | --- |
| application | `commands/deliver-feature.md` | `application.deliver_feature` | không có |
| application | `commands/design-api-contract.md` | `application.design_api_contract` | không có |
| application | `commands/design-data-change.md` | `application.design_data_change` | không có |
| application | `commands/fix-feature.md` | `application.fix_feature` | không có |
| application | `commands/implement-backend.md` | `application.implement_backend` | không có |
| application | `commands/implement-frontend.md` | `application.implement_frontend` | `application.generate_service` |
| application | `commands/integrate-feature.md` | `application.integrate_feature` | không có |
| application | `commands/plan-feature.md` | `application.plan_feature` | không có |
| application | `commands/review-backend.md` | `application.review_backend` | `application.review_source_code` |
| application | `commands/review-feature.md` | `application.review_feature` | không có |
| application | `commands/test-feature.md` | `application.test_feature` | không có |
| architecture | `commands/review-architecture.md` | `architecture.review_architecture` | `architecture.review_architecture` |
| data | `commands/migration-plan.md` | `data.migration_plan` | `data.migration_plan` |
| knowledge | `commands/write-technical-doc.md` | `knowledge.write_technical_doc` | `knowledge.review_docs` |
| platform | `commands/deployment-plan.md` | `platform.deployment_plan` | `platform.deployment_plan` |
| quality | `commands/verify-quality.md` | `quality.verify_quality` | `quality.generate_test_plan` |
| security | `commands/review-security.md` | `security.review_security` | `security.scan_source` |

Mỗi `plugin.yaml` phải liệt kê mọi command file thuộc plugin dưới `assets.commands` bằng relative file path, ví dụ:

```json
{
  "assets": {
    "commands": [
      "commands/deliver-feature.md",
      "commands/design-api-contract.md",
      "commands/design-data-change.md",
      "commands/fix-feature.md",
      "commands/implement-backend.md",
      "commands/implement-frontend.md",
      "commands/integrate-feature.md",
      "commands/plan-feature.md",
      "commands/review-backend.md",
      "commands/review-feature.md",
      "commands/test-feature.md"
    ]
  }
}
```

Không còn top-level `commands` trong manifest.

---

### Task 1: Tách Và Khóa Canonical Command Contract

**Files:**
- Create: `cli/src/command-contracts.mjs`
- Create: `cli/test/command-contracts.test.mjs`
- Modify: `cli/src/contracts.mjs`

- [ ] **Step 1: Viết test fail cho canonical command model**

Tạo `cli/test/command-contracts.test.mjs`:

```js
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  loadCanonicalCommand,
  validateCanonicalCommand,
} from "../src/command-contracts.mjs";
import { repoRoot } from "./helpers.mjs";

test("loads one canonical namespaced command model", async () => {
  const sourcePath = path.join(
    repoRoot,
    "plugins/application/commands/review-backend.md",
  );
  const command = await loadCanonicalCommand({
    sourcePath,
    pluginId: "application",
    pluginVersion: "1.0.0",
  });

  assert.equal(command.id, "application.review_backend");
  assert.equal(command.pluginId, "application");
  assert.equal(command.slug, "review-backend");
  assert.equal(command.mcpTool, "application.review_source_code");
  assert.equal(command.sourcePath, "plugins/application/commands/review-backend.md");
  assert.deepEqual(command.outputContract, [
    "summary",
    "findings",
    "verification",
  ]);
});

test("accepts a command without an MCP tool", async () => {
  const sourcePath = path.join(
    repoRoot,
    "plugins/application/commands/deliver-feature.md",
  );
  const command = await loadCanonicalCommand({
    sourcePath,
    pluginId: "application",
    pluginVersion: "1.0.0",
  });

  assert.equal(command.id, "application.deliver_feature");
  assert.equal(command.mcpTool, undefined);
  assert.deepEqual(validateCanonicalCommand(command), []);
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run:

```powershell
node --test cli/test/command-contracts.test.mjs
```

Expected: FAIL vì module chưa tồn tại và frontmatter chưa có `slug`/namespaced `id`.

- [ ] **Step 3: Tạo parser và validator tập trung**

Trong `cli/src/command-contracts.mjs`, export đúng API:

```js
export async function loadCanonicalCommand({
  sourcePath,
  pluginId,
  pluginVersion,
  repositoryRoot,
}) {}

export function validateCanonicalCommand(command, {
  knownSkills = new Set(),
  knownMcpTools = new Set(),
  validateReferences = false,
} = {}) {}

export async function loadPluginCommands({
  root,
  pluginId,
  plugin,
  knownSkills,
  knownMcpTools,
}) {}
```

Parser phải:

- chỉ chấp nhận frontmatter keys `id`, `slug`, `description`, `version`, `mcpTool`;
- yêu cầu năm body section `Intent`, `Inputs`, `Required Skills`, `Steps`, `Output Contract` có nội dung;
- yêu cầu `id` match `^[a-z0-9-]+\.[a-z0-9_]+$`;
- yêu cầu namespace bằng `pluginId`;
- yêu cầu `slug` kebab-case và bằng basename file;
- yêu cầu `version` bằng plugin version;
- giữ `markdown` nguyên bản và trả `sourcePath` dạng repository-relative POSIX path;
- chỉ validate skill/MCP references khi `validateReferences: true`.

Lỗi dùng `PlatformError` với code `AI_ENGINEERING_INVALID_COMMAND` và message đúng dạng:

```text
command application.review_backend slug must match review-backend.md
command application.review_backend references unknown skill java-analyze
command application.review_backend references missing MCP tool application.review_source_code
```

- [ ] **Step 4: Chuyển `contracts.mjs` sang loader mới**

Xóa `parseSectionList`, `parseSectionText`, implementation `loadCanonicalCommand` cũ; import và re-export:

```js
import {
  loadPluginCommands,
} from "./command-contracts.mjs";

export { loadCanonicalCommand } from "./command-contracts.mjs";
```

`validateRepository` phải nạp MCP tool set trước, sau đó gọi `loadPluginCommands` cho từng plugin và kiểm tra required skills trên toàn resolved plugin graph, không chỉ `plugin.assets.skills`.

- [ ] **Step 5: Chạy focused tests**

Run:

```powershell
npm run build:cli
node --test cli/test/command-contracts.test.mjs cli/test/contracts.test.mjs
```

Expected: parser tests chỉ còn fail vì repository command files chưa migrate trong Task 2.

- [ ] **Step 6: Commit**

```powershell
git add cli/src/command-contracts.mjs cli/src/contracts.mjs cli/test/command-contracts.test.mjs
git commit -m "feat: add canonical command contract loader"
```

---

### Task 2: Migrate Command Files, Plugin Manifests Và Registry V2

**Files:**
- Modify: `plugins/*/commands/*.md`
- Modify: `plugins/*/plugin.yaml`
- Modify: `core/routing/command-registry.yaml`
- Modify: `cli/src/contracts.mjs`
- Modify: `cli/test/contracts.test.mjs`

- [ ] **Step 1: Viết test fail cho manifest và registry canonical**

Thay các assertion legacy trong `cli/test/contracts.test.mjs` bằng:

```js
test("all command files are canonical manifest assets", async () => {
  const plugins = await loadPlugins(repoRoot);
  for (const [pluginId, plugin] of plugins) {
    assert.equal(Object.hasOwn(plugin, "commands"), false);
    assert.ok(
      plugin.assets.commands.every((item) =>
        /^commands\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(item),
      ),
    );
    const commands = await loadPluginCommands({
      root: repoRoot,
      pluginId,
      plugin,
    });
    assert.equal(commands.length, plugin.assets.commands.length);
  }
});

test("committed command registry is deterministic schema version 2", async () => {
  const expected = await generateCommandRegistry({ root: repoRoot });
  const committed = JSON.parse(
    await readFile(
      path.join(repoRoot, "core/routing/command-registry.yaml"),
      "utf8",
    ),
  );
  assert.deepEqual(committed, expected);
  assert.equal(committed.schemaVersion, 2);
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run:

```powershell
node --test cli/test/contracts.test.mjs
```

Expected: FAIL vì manifest còn command slug/top-level metadata và registry còn schema 1.

- [ ] **Step 3: Migrate toàn bộ frontmatter theo matrix**

Mỗi command dùng format:

```yaml
---
id: application.review_backend
slug: review-backend
description: Review backend source code for production readiness.
version: 1.0.0
mcpTool: application.review_source_code
---
```

Command không có MCP mapping bỏ hẳn dòng `mcpTool`.

- [ ] **Step 4: Migrate bảy `plugin.yaml`**

- `assets.commands` đổi từ slug sang `commands/<slug>.md`;
- application liệt kê đủ 11 command files trong migration matrix;
- xóa top-level `commands`;
- không thay đổi `dependencies`, `skills`, `triggers` hoặc user-owned semantic content khác.

- [ ] **Step 5: Thêm generator registry v2**

Trong `cli/src/contracts.mjs`, export:

```js
export async function generateCommandRegistry({ root }) {
  const plugins = await loadPlugins(root);
  const commands = [];
  for (const [pluginId, plugin] of plugins) {
    for (const command of await loadPluginCommands({
      root,
      pluginId,
      plugin,
    })) {
      commands.push({
        id: command.id,
        plugin: pluginId,
        slug: command.slug,
        file: path.posix.join("commands", `${command.slug}.md`),
        ...(command.mcpTool ? { mcpTool: command.mcpTool } : {}),
      });
    }
  }
  commands.sort((left, right) => left.id.localeCompare(right.id));
  return { schemaVersion: 2, commands };
}
```

`validateRepository` so sánh deep equality giữa registry committed và generated; loader runtime không dùng registry để tìm command.

- [ ] **Step 6: Generate registry và chạy tests**

Ghi `core/routing/command-registry.yaml` từ `generateCommandRegistry`, rồi run:

```powershell
npm run build:cli
node --test cli/test/command-contracts.test.mjs cli/test/contracts.test.mjs
npm run validate
```

Expected: PASS; validation báo 7 plugins, 3 providers.

- [ ] **Step 7: Commit**

```powershell
git add plugins core/routing/command-registry.yaml cli/src/contracts.mjs cli/test/contracts.test.mjs
git commit -m "refactor: make command markdown canonical"
```

---

### Task 3: Chuẩn Hóa Resolver Graph Và Projection Input

**Files:**
- Create: `cli/src/projection-input.mjs`
- Modify: `cli/src/resolver.mjs`
- Modify: `cli/test/resolver.test.mjs`
- Create: `cli/test/projection-contracts.test.mjs`

- [ ] **Step 1: Viết test fail cho root/required/optional graph**

Trong `cli/test/resolver.test.mjs`:

```js
test("separates root required and selected optional plugins", async () => {
  const plugins = await loadPlugins(repoRoot);
  const graph = resolvePluginGraph({
    requested: ["application"],
    optional: ["quality"],
    plugins,
    platformVersion: "1.0.0",
    providers: ["codex", "claude"],
  });

  assert.deepEqual(graph.rootPlugins, ["application"]);
  assert.deepEqual(graph.requiredPlugins, ["architecture"]);
  assert.deepEqual(graph.optionalPlugins, ["quality"]);
  assert.deepEqual(graph.pluginIds, ["architecture", "application", "quality"]);
});
```

- [ ] **Step 2: Viết test fail cho provider-neutral input**

Trong `cli/test/projection-contracts.test.mjs`:

```js
test("builds one provider-neutral projection input", async () => {
  const input = await buildProjectionInput({
    root: repoRoot,
    graph,
    plugins,
    scope: "project",
    provider: "claude",
    mcpServers: {},
  });

  assert.equal(input.schemaVersion, 1);
  assert.equal(input.provider, "claude");
  assert.equal(input.commands[0].id.includes("."), true);
  assert.equal(Object.hasOwn(input.commands[0], "destinationPath"), false);
  assert.deepEqual(input.skills[0].owners, [...input.skills[0].owners].sort());
});
```

- [ ] **Step 3: Chạy test để xác nhận fail**

Run:

```powershell
node --test cli/test/resolver.test.mjs cli/test/projection-contracts.test.mjs
```

Expected: FAIL vì graph chưa tách dependency classes và module input chưa tồn tại.

- [ ] **Step 4: Mở rộng resolver**

`resolvePluginGraph` nhận `optional = []`; required dependencies tự resolve; optional chỉ được thêm nếu caller chọn. Return:

```js
{
  rootPlugins,
  requiredPlugins,
  optionalPlugins,
  pluginIds,
  skills,
  commands,
  agents,
  hooks,
  providers,
  ownership,
}
```

`graph.commands` chứa canonical command ids; ownership command keyed bằng canonical id, không keyed bằng file path hay slug.

- [ ] **Step 5: Implement `buildProjectionInput`**

Export:

```js
export async function buildProjectionInput({
  root,
  graph,
  plugins,
  scope,
  provider,
  mcpServers,
}) {}
```

Return schema đúng spec, sort `plugins`, `skills`, `commands`, `agents`, `hooks`; mỗi command được load một lần qua `loadPluginCommands`; mỗi asset có `sourcePath` repository-relative và `owners`.

- [ ] **Step 6: Chạy tests**

Run:

```powershell
npm run build:cli
node --test cli/test/resolver.test.mjs cli/test/projection-contracts.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add cli/src/projection-input.mjs cli/src/resolver.mjs cli/test/resolver.test.mjs cli/test/projection-contracts.test.mjs
git commit -m "feat: build provider-neutral projection input"
```

---

### Task 4: Thêm Projection Contract Validator

**Files:**
- Create: `cli/src/projection-contracts.mjs`
- Modify: `cli/test/projection-contracts.test.mjs`

- [ ] **Step 1: Viết test fail cho path containment, duplicates và ownership**

```js
test("rejects duplicate and escaping projection destinations", () => {
  assert.throws(
    () =>
      validateProjectionPlan({
        schemaVersion: 1,
        provider: "claude",
        scope: "project",
        assets: [
          {
            operation: "render",
            assetType: "command",
            assetId: "application.review_backend",
            destinationPath: "../review.md",
            content: "one",
            owners: ["application"],
            shared: false,
          },
        ],
        instructions: [],
        mcpConfig: undefined,
      }),
    /escapes target root/,
  );
});

test("preserves resolved ownership in projected assets", () => {
  const result = validateProjectionPlan(validPlan);
  assert.deepEqual(result.assets[0].owners, ["application", "architecture"]);
  assert.equal(result.assets[0].assetType, "skill");
  assert.equal(result.assets[0].assetId, "java-analyze");
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run:

```powershell
node --test cli/test/projection-contracts.test.mjs
```

Expected: FAIL vì validator chưa tồn tại.

- [ ] **Step 3: Implement validators**

Export:

```js
export function validateProjectionInput(input) {}
export function validateProjectionPlan(plan) {}
export function assertContainedRelativePath(value, label) {}
```

Quy tắc:

- schema version đúng `1`;
- provider thuộc `codex|claude|cursor`;
- scope thuộc `project|global`;
- operation chỉ `copy|render`;
- `copy` bắt buộc `sourcePath`, cấm `content`;
- `render` bắt buộc string `content`, cấm `sourcePath`;
- `destinationPath`, instruction path, MCP path relative, không rỗng, không có segment `..`;
- duplicate destination giữa assets fail;
- instruction/MCP descriptor chỉ được trùng asset khi descriptor khai báo managed merge riêng; implementation này không tạo overlap;
- `owners` sorted unique, không rỗng; `shared` boolean;
- fail toàn plan trước lifecycle materialization.

- [ ] **Step 4: Chạy tests**

Run:

```powershell
node --test cli/test/projection-contracts.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add cli/src/projection-contracts.mjs cli/test/projection-contracts.test.mjs
git commit -m "feat: validate projection contracts"
```

---

### Task 5: Chuyển Provider Layout Vào Ba Adapter Projector

**Files:**
- Create: `adapters/codex/projector.mjs`
- Create: `adapters/claude/projector.mjs`
- Create: `adapters/cursor/projector.mjs`
- Modify: `cli/src/providers.mjs`
- Modify: `cli/test/providers.test.mjs`

- [ ] **Step 1: Viết project/global matrix tests**

Trong `cli/test/providers.test.mjs`, assert exact paths:

```js
assert.deepEqual(
  project.codex.assets.map((item) => item.destinationPath),
  [
    ".agents/skills/java-analyze",
    ".codex/agents/java-analyze.toml",
    ".codex/agents/openai.yaml",
    ".codex/workflows/commands.md",
  ],
);
assert.deepEqual(
  project.claude.assets.map((item) => item.destinationPath),
  [
    ".claude/commands/review-backend.md",
    ".claude-plugin/plugin.json",
    ".claude/skills/java-analyze",
  ],
);
assert.deepEqual(
  global.cursor.assets,
  [],
);
assert.equal(global.cursor.mcpConfig.destinationPath, ".cursor/mcp.json");
```

Ngoài ra assert:

- Codex project instruction `AGENTS.md`, global `.codex/AGENTS.md`;
- Claude project `CLAUDE.md`, global `.claude/CLAUDE.md`;
- Claude global không có `.claude-plugin/plugin.json`;
- Cursor project có `AGENTS.md`, `.cursor/rules/<slug>.mdc`, provider manifest;
- Cursor global chỉ có MCP config.

- [ ] **Step 2: Chạy test để xác nhận fail**

Run:

```powershell
node --test cli/test/providers.test.mjs
```

Expected: FAIL vì current output là `{files, mcpConfig.path}` và lifecycle đang thêm skill/agent paths.

- [ ] **Step 3: Implement adapter signatures**

Mỗi projector export:

```js
export function project(input) {
  return {
    schemaVersion: 1,
    provider: input.provider,
    scope: input.scope,
    assets: [],
    instructions: [],
    mcpConfig: undefined,
  };
}
```

Quy tắc render:

- provider filename command luôn dùng `command.slug`;
- Codex workflow catalog giữ cả `command.id` và `command.slug`, không mô tả như slash command;
- Claude command frontmatter dùng `description`, body giữ canonical semantics;
- Cursor rule dùng `.mdc`, `alwaysApply: false`;
- copy skill directories bằng operation `copy`;
- Codex agents copy canonical adapter TOML; provider manifest/workflow render;
- adapter giữ nguyên `owners` và `shared`.

- [ ] **Step 4: Thu nhỏ `providers.mjs` thành dispatcher**

`cli/src/providers.mjs` chỉ import ba projector và export:

```js
export function projectProvider(input) {
  const projector = PROJECTORS[input.provider];
  if (!projector) throw new PlatformError(`unsupported provider ${input.provider}`);
  return validateProjectionPlan(projector(validateProjectionInput(input)));
}

export function projectProviders(inputs) {
  return Object.fromEntries(
    inputs.map((input) => [input.provider, projectProvider(input)]),
  );
}
```

- [ ] **Step 5: Chạy matrix tests**

Run:

```powershell
npm run build:cli
node --test cli/test/providers.test.mjs cli/test/projection-contracts.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add adapters/*/projector.mjs cli/src/providers.mjs cli/test/providers.test.mjs
git commit -m "refactor: move provider layout into adapters"
```

---

### Task 6: Materialize Projection Và Ownership Schema V2 Trong Lifecycle

**Files:**
- Modify: `cli/src/lifecycle.mjs`
- Modify: `cli/src/state.mjs`
- Modify: `cli/src/transaction.mjs`
- Modify: `core/schemas/ownership.schema.json`
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/test/transaction.test.mjs`

- [ ] **Step 1: Viết lifecycle tests chống provider path logic**

Thêm test:

```js
test("materializes adapter projection descriptors with typed ownership", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "projection-lifecycle-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["claude"],
    });
    const ownership = JSON.parse(
      await readFile(path.join(target, ".ai-engineering/ownership.json"), "utf8"),
    );
    const command =
      ownership.files[".claude/commands/review-backend.md"];
    assert.equal(ownership.schemaVersion, 2);
    assert.equal(command.assetType, "command");
    assert.equal(command.assetId, "application.review_backend");
    assert.deepEqual(command.owners, ["application"]);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

Thêm static source assertion:

```js
const lifecycleSource = await readFile(
  path.join(repoRoot, "cli/src/lifecycle.mjs"),
  "utf8",
);
assert.doesNotMatch(
  lifecycleSource,
  /\.agents\/skills|\.claude\/skills|\.cursor\/rules|\.codex\/agents/,
);
```

- [ ] **Step 2: Viết rollback test cho instruction và MCP merge**

Trong `cli/test/transaction.test.mjs`, tạo transaction có asset, instruction và MCP config; inject `validateApplied` throw; assert toàn bộ original bytes và state files được restore.

- [ ] **Step 3: Chạy tests để xác nhận fail**

Run:

```powershell
node --test cli/test/lifecycle.test.mjs cli/test/transaction.test.mjs
```

Expected: FAIL vì ownership schema 1 và lifecycle chứa provider paths.

- [ ] **Step 4: Tạo lifecycle preparation API read-only**

Trong `lifecycle.mjs`, thay `buildDesiredState` bằng public:

```js
export async function prepareInstallation({
  root,
  context,
  rootPlugins,
  optionalPlugins = [],
  providers,
  force = false,
}) {}
```

Return:

```js
{
  graph,
  projectionInputs,
  projections,
  desiredFiles,
  instructionMerges,
  mcpMerges,
  lock,
  ownership,
}
```

Hàm này chỉ read filesystem; không gọi `initializeProject`, không tạo directory/backup/state.

- [ ] **Step 5: Materialize generic operations**

Lifecycle loop trên projection descriptors:

- `copy`: đọc canonical file/directory từ `sourcePath`, map vào `destinationPath`;
- `render`: đưa `content` vào desired files;
- instruction: dùng helper managed-block thuần để tính content mới, không ghi file;
- MCP: dùng merge helper hiện tại để tính content mới;
- ownership entry:

```js
{
  assetType,
  assetId,
  owners,
  shared,
  checksum,
  ...(mergeStrategy ? { mergeStrategy } : {}),
}
```

- [ ] **Step 6: Tách apply API**

Export:

```js
export async function applyPreparedInstallation({
  prepared,
  context,
  force = false,
}) {}
```

`installPlugins` còn là compatibility wrapper gọi prepare rồi apply. Chỉ apply phase mới tạo instruction files, backups, state và directories.

- [ ] **Step 7: Nâng ownership schema và legacy reader**

- ghi mới schema version 2;
- đọc schema 1 và suy ra `assetType`/`assetId` bằng regex chỉ trong compatibility normalizer;
- transaction chỉ xóa legacy path khi previous ownership chứng minh platform sở hữu;
- user-owned `commands/`, `skills/` và provider files không bị xóa.

- [ ] **Step 8: Chạy focused tests**

Run:

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs cli/test/transaction.test.mjs
```

Expected: PASS, rollback giữ nguyên bytes trước transaction.

- [ ] **Step 9: Commit**

```powershell
git add cli/src/lifecycle.mjs cli/src/state.mjs cli/src/transaction.mjs core/schemas/ownership.schema.json cli/test/lifecycle.test.mjs cli/test/transaction.test.mjs
git commit -m "refactor: materialize common projection plans"
```

---

### Task 7: Dùng Cùng Projection Contract Cho Builder Và Doctor

**Files:**
- Modify: `cli/src/builder.mjs`
- Modify: `cli/src/doctor.mjs`
- Modify: `cli/test/builder.test.mjs`
- Modify: `cli/test/doctor.test.mjs`

- [ ] **Step 1: Viết parity test giữa build và install**

Trong `builder.test.mjs`, build application artifact và prepare project install cho từng provider; normalize asset destination set rồi assert equality:

```js
assert.deepEqual(
  artifactManifest.projections.claude.assets.map((item) => item.destinationPath),
  prepared.projections.claude.assets.map((item) => item.destinationPath),
);
assert.equal(artifactManifest.projectionSchemaVersion, 1);
```

- [ ] **Step 2: Viết doctor drift tests**

Thêm:

```js
test("doctor rejects a missing projected command", async () => {
  await installPlugins(/* Claude application */);
  await rm(path.join(target, ".claude/commands/review-backend.md"));
  await assert.rejects(
    doctorProject({ root: repoRoot, target }),
    /projected asset is missing: .claude\/commands\/review-backend.md/,
  );
});
```

Và test command filename không match canonical slug.

- [ ] **Step 3: Chạy tests để xác nhận fail**

Run:

```powershell
node --test cli/test/builder.test.mjs cli/test/doctor.test.mjs
```

Expected: FAIL vì builder tự dựng output và doctor hard-code adapter paths.

- [ ] **Step 4: Refactor builder**

Builder:

- copy canonical plugin assets;
- gọi `buildProjectionInput` và `projectProvider` cho project/global matrix;
- lưu projection JSON dưới `projections/<provider>/<scope>.json`;
- materialize artifact provider files từ chính descriptors;
- ghi `projectionSchemaVersion: 1` và checksums.

Không còn tự ghép `commands/<commandId>.md` từ slug legacy.

- [ ] **Step 5: Refactor doctor**

`doctorProject` nhận `root`; đọc installed lock; gọi `prepareInstallation` với root plugins/providers/scope từ lock; so sánh:

- projected asset tồn tại và checksum đúng;
- instruction managed block tồn tại;
- MCP registrations match;
- ownership type/id match;
- không còn managed legacy path.

MCP process probe hiện có vẫn chạy sau structural checks.

- [ ] **Step 6: Chạy tests**

Run:

```powershell
npm run build:cli
node --test cli/test/builder.test.mjs cli/test/doctor.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add cli/src/builder.mjs cli/src/doctor.mjs cli/test/builder.test.mjs cli/test/doctor.test.mjs
git commit -m "refactor: share projections across build and doctor"
```

---

### Task 8: Parse Install Request Với Provenance

**Files:**
- Create: `cli/src/install-request.mjs`
- Create: `cli/test/install-request.test.mjs`
- Modify: `cli/src/cli.mjs`

- [ ] **Step 1: Viết parser contract tests**

```js
test("locks positional plugins and explicit flags", () => {
  const draft = parseInstallRequest([
    "application",
    "--target",
    "codex,claude",
    "--with",
    "quality",
    "--scope",
    "global",
  ]);

  assert.deepEqual(draft.rootPlugins, {
    value: ["application"],
    source: "explicit",
    locked: true,
  });
  assert.deepEqual(draft.providers.value, ["claude", "codex"]);
  assert.equal(draft.providers.locked, true);
  assert.deepEqual(draft.optionalPlugins.value, ["quality"]);
  assert.equal(draft.scope.value, "global");
});

test("keeps deterministic defaults editable", () => {
  const draft = parseInstallRequest([]);
  assert.deepEqual(draft.optionalPlugins, {
    value: [],
    source: "default",
    locked: false,
  });
  assert.deepEqual(draft.scope, {
    value: "project",
    source: "default",
    locked: false,
  });
});

test("rejects positional plugins combined with --all", () => {
  assert.throws(
    () => parseInstallRequest(["application", "--all"]),
    /--all cannot be combined with positional plugins/,
  );
});
```

- [ ] **Step 2: Viết non-interactive completeness tests**

```js
assert.throws(
  () => finalizeNonInteractiveDraft(parseInstallRequest(["application", "--yes"])),
  /Missing install choices in non-interactive mode: providers/,
);

const intent = finalizeNonInteractiveDraft(
  parseInstallRequest(["application", "--target", "codex", "--yes"]),
);
assert.equal(intent.scope, "project");
assert.deepEqual(intent.optionalPlugins, []);
```

- [ ] **Step 3: Chạy tests để xác nhận fail**

Run:

```powershell
node --test cli/test/install-request.test.mjs
```

Expected: FAIL vì module chưa tồn tại.

- [ ] **Step 4: Implement parser**

Export:

```js
export function parseInstallRequest(args) {}
export function applyDetectedProviders(draft, providers) {}
export function finalizeNonInteractiveDraft(draft) {}
export function toInstallIntent(draft) {}
```

Supported options: `--all`, `--target`, `--provider`, `--scope`, `-g`, `--global`, `--with`, `--yes`, `--force`, `--json`.

Chỉ source `explicit` có `locked: true`. `--yes` không dùng detected providers thay explicit providers.

- [ ] **Step 5: Chạy tests**

Run:

```powershell
node --test cli/test/install-request.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add cli/src/install-request.mjs cli/test/install-request.test.mjs
git commit -m "feat: parse install requests with provenance"
```

---

### Task 9: Provider Detection Read-Only

**Files:**
- Create: `cli/src/provider-detection.mjs`
- Create: `cli/test/provider-detection.test.mjs`

- [ ] **Step 1: Viết deterministic detection tests**

```js
test("detects every provider signal without writing files", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "provider-detection-"));
  try {
    await mkdir(path.join(target, ".codex"));
    await writeFile(path.join(target, "CLAUDE.md"), "# Claude\n");
    await mkdir(path.join(target, ".cursor"));
    const before = await snapshotTree(target);
    const detected = await detectProviders({ projectRoot: target });
    const after = await snapshotTree(target);
    assert.deepEqual(detected, ["claude", "codex", "cursor"]);
    assert.deepEqual(after, before);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

Test riêng:

- `.agents/` và `AGENTS.md` detect Codex;
- `.mcp.json` detect Claude;
- không signal trả `[]`, không throw;
- không phụ thuộc binary IDE.

- [ ] **Step 2: Chạy test để xác nhận fail**

Run:

```powershell
node --test cli/test/provider-detection.test.mjs
```

Expected: FAIL vì module chưa tồn tại.

- [ ] **Step 3: Implement detector**

Export:

```js
export async function detectProviders({ projectRoot }) {}
```

Signals:

```js
const SIGNALS = {
  codex: [".codex", ".agents", "AGENTS.md"],
  claude: [".claude", ".mcp.json", "CLAUDE.md"],
  cursor: [".cursor"],
};
```

Return sorted unique providers; chỉ dùng `access`, không `mkdir`/`writeFile`.

- [ ] **Step 4: Chạy tests và commit**

```powershell
node --test cli/test/provider-detection.test.mjs
git add cli/src/provider-detection.mjs cli/test/provider-detection.test.mjs
git commit -m "feat: detect local AI providers"
```

---

### Task 10: Dựng Install Plan Deterministic Trước Transaction

**Files:**
- Create: `cli/src/install-plan.mjs`
- Create: `cli/test/install-plan.test.mjs`
- Modify: `cli/src/transaction.mjs`

- [ ] **Step 1: Viết plan preview test**

```js
test("builds deterministic preview from prepared projections", async () => {
  const plan = await buildInstallPlan({
    prepared,
    context,
    force: false,
  });

  assert.deepEqual(plan.rootPlugins, ["application"]);
  assert.deepEqual(plan.requiredPlugins, ["architecture"]);
  assert.deepEqual(plan.optionalPlugins, ["quality"]);
  assert.deepEqual(plan.providers, ["claude", "codex"]);
  assert.equal(path.isAbsolute(plan.targetRoot), true);
  assert.ok(
    plan.managedFiles.some(
      (item) =>
        item.assetType === "command" &&
        item.assetId === "application.review_backend",
    ),
  );
  assert.deepEqual(plan.managedFiles, [...plan.managedFiles].sort(comparePlanFile));
});
```

- [ ] **Step 2: Viết no-side-effect test**

Snapshot target trước/sau `prepareInstallation` + `buildInstallPlan`; assert giống hệt, kể cả không có `.ai-engineering`, instruction, backup hoặc provider directory mới.

- [ ] **Step 3: Chạy tests để xác nhận fail**

Run:

```powershell
node --test cli/test/install-plan.test.mjs
```

Expected: FAIL vì module chưa tồn tại và transaction planner chưa expose conflict preview.

- [ ] **Step 4: Thêm transaction preview mode**

`planTransaction` tiếp tục không ghi file và trả:

```js
{
  actions,
  conflicts,
  backupRelativePaths,
  lock,
  ownership,
  transactionId,
}
```

Khi dùng cho preview, unmanaged/drift conflict được collect thành `conflicts`; apply path vẫn fail trước mutation nếu conflicts không rỗng và không `force`.

- [ ] **Step 5: Implement `buildInstallPlan`**

Return đúng fields:

```js
{
  rootPlugins,
  requiredPlugins,
  optionalPlugins,
  providers,
  scope,
  targetRoot,
  runtime: { mcpServers },
  managedFiles,
  managedMerges,
  conflicts,
  backups,
}
```

Sort deterministic theo provider, path, asset type/id. `managedFiles` lấy từ projection/ownership descriptors, không dùng regex dựng UI.

- [ ] **Step 6: Chạy tests và commit**

```powershell
npm run build:cli
node --test cli/test/install-plan.test.mjs cli/test/transaction.test.mjs
git add cli/src/install-plan.mjs cli/src/transaction.mjs cli/test/install-plan.test.mjs cli/test/transaction.test.mjs
git commit -m "feat: preview deterministic install plans"
```

---

### Task 11: Implement Wizard Với `Install / Back / Cancel`

**Files:**
- Create: `cli/src/install-wizard.mjs`
- Create: `cli/test/install-wizard.test.mjs`

- [ ] **Step 1: Viết scripted prompter tests**

Tạo fake prompter ghi lại step ids và trả scripted answers:

```js
test("preserves explicit root plugin and asks only editable choices", async () => {
  const prompter = scriptedPrompter({
    providers: ["codex"],
    optionalPlugins: [],
    scope: "project",
    confirm: "install",
  });
  const result = await runInstallWizard({
    draft: parseInstallRequest(["application"]),
    availablePlugins,
    detectedProviders: [],
    preparePlan,
    prompter,
  });

  assert.deepEqual(prompter.steps, [
    "providers",
    "optionalPlugins",
    "scope",
    "confirm",
  ]);
  assert.deepEqual(result.intent.rootPlugins, ["application"]);
  assert.equal(result.action, "install");
});
```

Thêm tests:

- explicit provider/optional/scope không xuất hiện trong step history;
- detected provider preselected nhưng sửa được;
- optional default none;
- required dependencies read-only trong preview;
- `Back` quay về editable step gần nhất và recompute invalid optional choices;
- `Cancel` trả `{action: "cancel"}` và không gọi apply callback;
- no optional candidates thì bỏ optional step;
- `--all` root plugins vẫn locked.

- [ ] **Step 2: Chạy tests để xác nhận fail**

Run:

```powershell
node --test cli/test/install-wizard.test.mjs
```

Expected: FAIL vì module chưa tồn tại.

- [ ] **Step 3: Implement wizard state machine**

Export:

```js
export async function runInstallWizard({
  draft,
  availablePlugins,
  detectedProviders,
  preparePlan,
  prompter,
}) {}

export function createTerminalPrompter({ input, output }) {}
```

Editable ordered steps: `rootPlugins`, `providers`, `optionalPlugins`, `scope`, `confirm`. Bỏ step locked hoặc không applicable. `confirm` chỉ nhận `install|back|cancel`.

Terminal prompter dùng `node:readline/promises`; selection nhập comma-separated indexes, Enter nhận preselection. Không ghi filesystem.

- [ ] **Step 4: Chạy tests và commit**

```powershell
node --test cli/test/install-wizard.test.mjs
git add cli/src/install-wizard.mjs cli/test/install-wizard.test.mjs
git commit -m "feat: add hybrid install wizard"
```

---

### Task 12: Tích Hợp Hybrid Install Orchestration Vào CLI

**Files:**
- Modify: `cli/src/cli.mjs`
- Modify: `cli/src/index.ts`
- Modify: `cli/test/cli.test.mjs`
- Modify: `cli/test/helpers.mjs`

- [ ] **Step 1: Nâng test helper để mô phỏng TTY**

`runCli` nhận `input`, `tty`; dùng stdin pipe khi có input và set env `AI_ENGINEERING_TEST_TTY=1` chỉ trong test. Production TTY vẫn dựa vào `streams.stdin.isTTY && streams.stdout.isTTY`.

- [ ] **Step 2: Viết non-TTY tests**

```js
test("non-TTY install requires --yes", async () => {
  const result = await runCli([
    "install",
    "application",
    "--target",
    "codex",
  ]);
  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /Pass --yes/);
});

test("--yes requires explicit root plugin and provider", async () => {
  const missingProvider = await runCli([
    "install",
    "application",
    "--yes",
  ]);
  assert.match(
    missingProvider.stderr,
    /Missing install choices in non-interactive mode: providers/,
  );
});
```

- [ ] **Step 3: Viết `--yes` success test**

```js
const result = await runCli([
  "install",
  "application",
  "--target",
  "codex",
  "--yes",
  "--json",
], { cwd: target });
const output = JSON.parse(result.stdout);
assert.equal(output.status, "pass");
assert.equal(output.scope, "project");
assert.deepEqual(output.optionalPlugins, []);
```

- [ ] **Step 4: Viết interactive cancel side-effect test**

Chạy TTY scripted install không args, chọn application/codex/project rồi `Cancel`; snapshot target trước/sau giống nhau và exit code `0`.

- [ ] **Step 5: Chạy tests để xác nhận fail**

Run:

```powershell
npm run build:cli
node --test cli/test/cli.test.mjs
```

Expected: FAIL vì CLI hiện install ngay và không hỗ trợ `--yes`/`--with`.

- [ ] **Step 6: Refactor install branch**

Luồng duy nhất:

```js
const draft = parseInstallRequest(installArgs);
const interactive = isInteractive(streams, runtime);
let intent;

if (draft.confirm.value === true) {
  intent = finalizeNonInteractiveDraft(draft);
} else if (!interactive) {
  throw nonInteractiveInstallError(draft);
} else {
  const detected = await detectProviders({ projectRoot: process.cwd() });
  const result = await runInstallWizard({ ... });
  if (result.action === "cancel") {
    streams.stdout.write("Installation cancelled.\n");
    return 0;
  }
  intent = result.intent;
}

const prepared = await prepareInstallation({ ...intent });
const plan = await buildInstallPlan({ prepared, context });
if (!draft.confirm.value) renderInstallPlan(plan, streams.stdout);
await applyPreparedInstallation({ prepared, context, force: draft.force });
```

Trong interactive mode, wizard `preparePlan` callback dựng preview lại sau mỗi lựa chọn ảnh hưởng graph. Không gọi lifecycle apply trước confirm.

- [ ] **Step 7: Cập nhật help**

Thêm `--with`, `--yes`; giải thích non-TTY requirement và giữ `--provider` alias.

- [ ] **Step 8: Chạy CLI tests**

Run:

```powershell
npm run build:cli
node --test cli/test/cli.test.mjs cli/test/install-request.test.mjs cli/test/install-wizard.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add cli/src/cli.mjs cli/src/index.ts cli/test/cli.test.mjs cli/test/helpers.mjs
git commit -m "feat: orchestrate hybrid installs"
```

---

### Task 13: Update/Remove/Check Compatibility Và Migration Safety

**Files:**
- Modify: `cli/src/lifecycle.mjs`
- Modify: `cli/src/doctor.mjs`
- Modify: `cli/test/lifecycle.test.mjs`
- Modify: `cli/test/doctor.test.mjs`

- [ ] **Step 1: Viết update state reuse test**

Install root application + optional quality với Claude global; mutate installed application version cũ; update application; assert update reuse:

```js
assert.deepEqual(updated.rootPlugins, ["application"]);
assert.deepEqual(updated.optionalPlugins, ["quality"]);
assert.deepEqual(updated.providers, ["claude"]);
assert.equal(updated.scope, "global");
```

- [ ] **Step 2: Viết managed legacy cleanup/user preservation test**

Tạo:

- legacy `.codex/skills/...` có ownership schema 1: phải cleanup;
- root `skills/user-owned/SKILL.md` không ownership: phải giữ;
- `.claude/commands/custom.md` không ownership: phải giữ.

- [ ] **Step 3: Viết check asset metadata test**

`checkInstalled` phải lấy command từ ownership:

```js
assert.ok(
  check.commands.installed.some(
    (item) =>
      item.id === "application.review_backend" &&
      item.paths.includes(".claude/commands/review-backend.md"),
  ),
);
```

- [ ] **Step 4: Chạy tests để xác nhận fail**

Run:

```powershell
node --test cli/test/lifecycle.test.mjs cli/test/doctor.test.mjs
```

Expected: FAIL vì lock chưa lưu optional plugins và check còn dựa regex.

- [ ] **Step 5: Nâng lock/state**

Lock ghi:

```js
{
  schemaVersion: 2,
  platformVersion,
  scope,
  providers,
  rootPlugins,
  optionalPlugins,
  plugins,
  managedMcpServers,
}
```

Update tái sử dụng các field này; remove recompute graph từ remaining roots/optionals. Schema 1 reader giữ fallback hiện tại.

- [ ] **Step 6: Chuyển check/doctor sang typed ownership**

Primary path dùng `metadata.assetType` và `metadata.assetId`; chỉ schema 1 fallback mới dùng path regex.

- [ ] **Step 7: Chạy tests và commit**

```powershell
npm run build:cli
node --test cli/test/lifecycle.test.mjs cli/test/doctor.test.mjs
git add cli/src/lifecycle.mjs cli/src/doctor.mjs cli/test/lifecycle.test.mjs cli/test/doctor.test.mjs
git commit -m "feat: preserve projection state across lifecycle"
```

---

### Task 14: Đồng Bộ Documentation Song Ngữ

**Files:**
- Modify: `README.md`
- Modify: `README_VI.md`
- Modify: `cli/README.md`
- Modify: `cli/README_VI.md`
- Modify: `docs/migration/migrate-existing-source-to-plugins-platform.md`
- Modify: `cli/test/distribution.test.mjs`

- [ ] **Step 1: Viết doc assertions fail**

Assert English/Vietnamese root và CLI README đều có:

```text
aie install application --target codex --yes
aie install application --with quality
Install / Back / Cancel
.agents/skills
.claude/commands
.cursor/rules
```

Và mô tả command Markdown là canonical source, registry schema v2 là derived index.

- [ ] **Step 2: Chạy test để xác nhận fail**

Run:

```powershell
node --test cli/test/distribution.test.mjs
```

Expected: FAIL vì docs chưa có wizard/provenance/command contract.

- [ ] **Step 3: Update English README trước**

Document:

- interactive install khi TTY và thiếu lựa chọn;
- deterministic `--yes` requirements;
- `--with`;
- exact project/global matrix;
- command contract và optional `mcpTool`;
- preview và cancellation side-effect boundary;
- migration/ownership safety.

- [ ] **Step 4: Đồng bộ `README_VI.md` trong cùng change**

Dùng UTF-8 tiếng Việt đầy đủ dấu; nội dung kỹ thuật và command examples phải tương đương English sibling.

- [ ] **Step 5: Update CLI README pair và migration guide**

Tuân thủ English trước, Vietnamese sau. Không tạo README mới dưới depth > 1 nếu không cần.

- [ ] **Step 6: Chạy doc tests và commit**

```powershell
node --test cli/test/distribution.test.mjs
git add README.md README_VI.md cli/README.md cli/README_VI.md docs/migration/migrate-existing-source-to-plugins-platform.md cli/test/distribution.test.mjs
git commit -m "docs: document projection contracts and install wizard"
```

---

### Task 15: Full Verification Và Sáu Smoke Combinations

**Files:**
- Không sửa source trừ khi verification phát hiện regression.

- [ ] **Step 1: Chạy focused suite**

```powershell
npm run build:cli
node --test cli/test/command-contracts.test.mjs cli/test/contracts.test.mjs cli/test/projection-contracts.test.mjs cli/test/providers.test.mjs cli/test/resolver.test.mjs cli/test/install-request.test.mjs cli/test/provider-detection.test.mjs cli/test/install-plan.test.mjs cli/test/install-wizard.test.mjs cli/test/lifecycle.test.mjs cli/test/transaction.test.mjs cli/test/builder.test.mjs cli/test/doctor.test.mjs cli/test/cli.test.mjs cli/test/distribution.test.mjs
```

Expected: tất cả pass, không skipped test liên quan scope/provider matrix.

- [ ] **Step 2: Chạy repository verification contract**

```powershell
npm test
npm run validate
npm run build:cli
```

Expected:

```text
npm test exits 0
Validated 7 plugins for 3 providers.
npm run build:cli exits 0
```

- [ ] **Step 3: Smoke project scope cho ba provider**

Với mỗi provider `codex`, `claude`, `cursor`, tạo temp directory riêng và chạy:

```powershell
node E:\Mine\AI\ai-development-kit\cli\dist\index.js install application --target <provider> --yes
node E:\Mine\AI\ai-development-kit\cli\dist\index.js doctor
```

Assert:

- Codex: `AGENTS.md`, `.agents/skills/java-analyze/SKILL.md`, `.codex/workflows/commands.md`, `.codex/config.toml`;
- Claude: `CLAUDE.md`, `.claude/skills/java-analyze/SKILL.md`, `.claude/commands/review-backend.md`, `.mcp.json`;
- Cursor: `AGENTS.md`, `.cursor/rules/review-backend.mdc`, `.cursor/mcp.json`;
- cả ba không tạo legacy root `skills/` hoặc `commands/`.

- [ ] **Step 4: Smoke global scope cho ba provider**

Dùng temp `HOME` và `USERPROFILE` riêng cho từng provider:

```powershell
node E:\Mine\AI\ai-development-kit\cli\dist\index.js install application --target <provider> --global --yes
node E:\Mine\AI\ai-development-kit\cli\dist\index.js doctor --global
```

Assert:

- Codex: `~/.codex/AGENTS.md`, `~/.agents/skills/java-analyze/SKILL.md`, `~/.codex/config.toml`;
- Claude: `~/.claude/CLAUDE.md`, `~/.claude/skills/java-analyze/SKILL.md`, `~/.claude/commands/review-backend.md`, `~/.claude.json`;
- Cursor: chỉ provider runtime/state và `~/.cursor/mcp.json`, không project rules/skills/commands.

- [ ] **Step 5: Smoke non-TTY failure và cancel**

Run:

```powershell
node cli/dist/index.js install application
node cli/dist/index.js install application --yes
```

Expected lần lượt:

- yêu cầu `--yes`;
- actionable error liệt kê missing `providers`;
- không tạo file/state.

Chạy scripted interactive cancel test một lần nữa và xác nhận target snapshot không đổi.

- [ ] **Step 6: Kiểm tra git diff và residual risk**

```powershell
git status --short
git diff --check
git diff --stat
```

Xác nhận:

- không có unrelated user changes bị ghi đè;
- không còn top-level manifest `commands`;
- không còn provider destination path trong `lifecycle.mjs`;
- registry schema version 2 match generator;
- không có duplicate legacy/canonical flow active.

- [ ] **Step 7: Commit verification-only fixes nếu có**

Nếu verification buộc sửa code, commit riêng:

```powershell
git add <only-files-fixed-during-verification>
git commit -m "fix: close projection verification gaps"
```

Nếu không có sửa đổi, không tạo empty commit.

---

## Self-Review

### Spec coverage

- Canonical command source, namespaced id, slug, optional MCP, section validation và registry v2: Tasks 1-2.
- Provider-neutral projection input, validated output, contained paths và ownership: Tasks 3-5.
- Adapter-only layout, generic lifecycle materialization, transaction/rollback: Tasks 5-6.
- Builder/install/doctor parity: Task 7.
- Provenance parser, provider detection, `--with`, TTY/`--yes`: Tasks 8-9 và 12.
- Deterministic install plan, read-only preview, conflict/backup reporting: Task 10.
- Wizard locked values, optional dependencies, Back/Cancel navigation: Task 11.
- Update/remove/check migration compatibility và typed ownership: Task 13.
- Song ngữ README và migration docs: Task 14.
- Full tests và sáu project/global provider smoke combinations: Task 15.

### Placeholder scan

- Không có `TBD`, `TODO`, “implement later” hoặc task chỉ nói “add tests”.
- Mỗi task có exact files, API names, assertions, commands và expected result.
- Các command migration mappings được liệt kê đầy đủ cho 17 file hiện có.

### Type consistency

- `resolvePluginGraph` tạo `rootPlugins`, `requiredPlugins`, `optionalPlugins`.
- `buildProjectionInput` tạo một input/provider; `projectProvider` tạo một validated plan/provider.
- `prepareInstallation` là read-only; `buildInstallPlan` preview từ prepared data; `applyPreparedInstallation` là side-effect boundary.
- Ownership schema 2 dùng nhất quán `assetType`, `assetId`, `owners`, `shared`, `checksum`.
- Lock schema 2 giữ root/optional/provider/scope để update và doctor tái tạo projection.

