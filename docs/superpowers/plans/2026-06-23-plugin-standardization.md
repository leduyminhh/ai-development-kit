# Chuẩn hóa skills / commands / workflows các plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa skills/commands/workflows của cả 7 plugin về một bộ quy ước nhất quán và sửa các tham chiếu skill "ma", mà không đổi hành vi resolver.

**Architecture:** Refactor nội dung canonical dưới `plugins/` + 2 file routing phái sinh (`core/routing/command-registry.yaml`, `skill-registry.yaml`). Làm theo lô (Phase 0 → 1 → 2 → 4); mỗi lô là một deliverable kiểm thử độc lập, kết thúc bằng `npm run build && npm test && npm run validate` rồi commit.

**Tech Stack:** Node 20, ESM `.mjs`, `aie validate` (`cli/src/contracts.mjs`), JSON `plugin.yaml`/registry, Markdown commands, YAML workflows.

## Global Constraints

- Mọi command frontmatter: chỉ `id, slug, description, version, outputSchema`; `id = <plugin>.<slug đổi - thành _>`; `slug` khớp tên file; `version` = version plugin (`1.0.0`); đủ 5 mục `## Intent / Inputs / Required Skills / Steps / Output Contract`.
- `Required Skills` bullet và workflow `uses` phải phân giải qua **`resolvedSkills`** = `assets.skills` của plugin + skills của `dependencies.required` (đệ quy). **`depends_on.plugins` và `dependencies.optional` KHÔNG được `resolvedSkills` dùng** ([contracts.mjs:554](../../../cli/src/contracts.mjs:554)).
- `core/routing/command-registry.yaml` được so khớp với `generateCommandRegistry()` (so sánh `JSON.stringify`, thứ tự khóa + thứ tự mảng phải khớp) — sửa tay phải giữ nguyên cấu trúc.
- `core/routing/skill-registry.yaml` phải `sameValues` với thư mục skill thật và với `skills[]` của plugin; mọi skill trong registry phải nằm trong `assets.skills` (registry ⊆ assets.skills; assets.skills ĐƯỢC PHÉP có thừa).
- Giữ **UTF-8 BOM** ở `plugins/*/workflows/*.yaml`; `plugin.yaml`/registry (bắt đầu `{`) và command `.md` (bắt đầu `---`) không BOM. Đổi tên file dùng `git mv` để giữ nguyên byte, rồi `Edit` nội dung.
- Văn bản người-đọc trong repo: tiếng Việt có dấu, UTF-8.
- **Ngoài phạm vi (KHÔNG làm trong plan này):** đổi tên skill (`feature-delivery`, `java-analyze`, `python-backend-engineer`, `react-code-generate`), thống nhất tên capability `security`, dọn foreign-skills trong `application.assets.skills`, promotion `depends_on`/`dependencies.required`, dedup identity `metadata` vs top-level, thêm `outputSchema` mới. Lý do: hoặc rủi ro resolver/install, hoặc cơ chế đã được xác minh là không hiệu lực (`depends_on.plugins`).

---

### Task 0: Tạo nhánh làm việc

**Files:** none (git only)

- [ ] **Step 1: Tạo nhánh từ master (qua skill git-workflow-design)**

Đang ở `master` → tạo nhánh trước khi commit. Tên đề xuất: `refactor/plugin-standardization`.
Expected: `git status` trên nhánh mới, working tree sạch (trừ `docs/superpowers/specs|plans/*` đã tạo).

---

### Task 1: Phase 0 — Gỡ skill "ma" (architecture/java-analyze, knowledge/diagram-generate)

**Files:**
- Modify: `plugins/architecture/plugin.yaml` (assets.skills)
- Modify: `plugins/architecture/commands/review-architecture.md` (Required Skills)
- Modify: `plugins/knowledge/plugin.yaml` (assets.skills)
- Modify: `plugins/knowledge/commands/write-technical-doc.md` (Required Skills)

**Interfaces:**
- Consumes: trạng thái repo hiện tại (validate xanh).
- Produces: `assets.skills == skills[]` cho architecture (4) và knowledge (3); không command nào còn tham chiếu skill không phân giải.

- [ ] **Step 1: architecture/plugin.yaml — bỏ `java-analyze` khỏi assets.skills**

Xóa đúng dòng (giữ nguyên các dòng còn lại):
```json
      "java-analyze",
```
trong khối:
```json
    "skills": [
      "java-analyze",
      "architecture-onion-design",
      "code-shared-design",
      "code-design-pattern",
      "diagram-generate"
    ],
```
Kết quả khối còn 4 phần tử (architecture-onion-design, code-shared-design, code-design-pattern, diagram-generate).

- [ ] **Step 2: review-architecture.md — bỏ bullet `- java-analyze`**

Trong `## Required Skills`, xóa dòng `- java-analyze`:
```markdown
## Required Skills

- java-analyze
- architecture-onion-design
- code-shared-design
```
→ còn `- architecture-onion-design` và `- code-shared-design`.

- [ ] **Step 3: knowledge/plugin.yaml — bỏ `diagram-generate` khỏi assets.skills**

Xóa dòng:
```json
      "diagram-generate",
```
trong khối:
```json
    "skills": [
      "doc-write",
      "diagram-generate",
      "youtube-transcript",
      "release-notes"
    ],
```
→ còn 3 phần tử (doc-write, youtube-transcript, release-notes) khớp `skills[]`.

- [ ] **Step 4: write-technical-doc.md — bỏ bullet `- diagram-generate`**

Trong `## Required Skills`, xóa dòng `- diagram-generate`:
```markdown
## Required Skills

- doc-write
- diagram-generate
```
→ còn `- doc-write`. (Bước `diagrams` trong `documentation-pipeline.yaml` dùng `architecture/diagram-generate` GIỮ NGUYÊN — `architecture` đã là `dependencies.optional` của knowledge; workflow `uses` không bị validate cross-check.)

- [ ] **Step 5: Build + test + validate**

Run: `npm run build && npm test && npm run validate`
Expected: build OK; tests pass; `Validated 7 plugins for 4 providers.` (validate vẫn xanh vì registry ⊆ assets.skills và mọi Required Skills còn lại đều phân giải).

- [ ] **Step 6: Grep dò sót `java-analyze` (architecture) / `diagram-generate` (knowledge) sai chỗ**

Run: `rg -n "java-analyze" plugins/architecture ; rg -n "diagram-generate" plugins/knowledge`
Expected: 0 kết quả (architecture không còn java-analyze; knowledge không còn diagram-generate). `java-analyze` vẫn còn hợp lệ trong `plugins/application/*` — không đụng.

- [ ] **Step 7: Commit (qua git-workflow-design)**

Message: `refactor(plugins): remove phantom skill refs in architecture and knowledge`

---

### Task 2: Phase 1 — Workflow `fullstack-feature` → `feature-delivery-pipeline`

**Files:**
- Rename: `plugins/application/workflows/fullstack-feature.yaml` → `plugins/application/workflows/feature-delivery-pipeline.yaml`
- Modify: renamed workflow (`id:`)
- Modify: `plugins/application/plugin.yaml` (assets.workflows)

**Interfaces:**
- Produces: tên file workflow + `id` đều có hậu tố `-pipeline`; ownership workflow slug đổi sang `feature-delivery-pipeline`.

- [ ] **Step 1: Đổi tên file (giữ BOM)**

Run: `git mv plugins/application/workflows/fullstack-feature.yaml plugins/application/workflows/feature-delivery-pipeline.yaml`

- [ ] **Step 2: Sửa `id:` trong file vừa đổi tên**

Trong `plugins/application/workflows/feature-delivery-pipeline.yaml`, dòng đầu nội dung:
```yaml
id: fullstack-feature
```
→
```yaml
id: feature-delivery-pipeline
```
(Edit chỉ thay chuỗi này, không chạm BOM/đầu file.)

- [ ] **Step 3: Cập nhật assets.workflows trong application/plugin.yaml**

```json
      "workflows/fullstack-feature.yaml"
```
→
```json
      "workflows/feature-delivery-pipeline.yaml"
```

- [ ] **Step 4: Grep dò sót id/tên cũ**

Run: `rg -n "fullstack-feature|fullstack_feature" --glob '!docs/superpowers/**' --glob '!CHANGELOG.md'`
Expected: 0 kết quả (nếu có ở `cli/test/*` hoặc `README*` thì sửa sang `feature-delivery-pipeline` rồi grep lại). Mô tả workflow (`description:` chữ "Feature delivery: ...") không chứa slug nên giữ nguyên.

- [ ] **Step 5: Build + test + validate**

Run: `npm run build && npm test && npm run validate`
Expected: tất cả xanh; `Validated 7 plugins for 4 providers.`

- [ ] **Step 6: Commit (qua git-workflow-design)**

Message: `refactor(plugins): rename fullstack-feature workflow to feature-delivery-pipeline`

---

### Task 3: Phase 2 — Command noun-verb → verb-noun (`migration-plan`, `deployment-plan`)

**Files:**
- Rename: `plugins/data/commands/migration-plan.md` → `plan-migration.md`
- Modify: renamed data command (frontmatter `slug`,`id`)
- Modify: `plugins/data/plugin.yaml` (assets.commands)
- Modify: `plugins/data/workflows/db-migration-pipeline.yaml` (step id + depends)
- Rename: `plugins/platform/commands/deployment-plan.md` → `plan-deployment.md`
- Modify: renamed platform command (frontmatter `slug`,`id`)
- Modify: `plugins/platform/plugin.yaml` (assets.commands)
- Modify: `core/routing/command-registry.yaml` (2 entries)

**Interfaces:**
- Produces: command slugs verb-noun; ids `data.plan_migration`, `platform.plan_deployment`; command-registry khớp `generateCommandRegistry()`.

- [ ] **Step 1: Đổi tên file command data**

Run: `git mv plugins/data/commands/migration-plan.md plugins/data/commands/plan-migration.md`

- [ ] **Step 2: Sửa frontmatter `plan-migration.md`**

```yaml
id: data.migration_plan
slug: migration-plan
```
→
```yaml
id: data.plan_migration
slug: plan-migration
```
(H1 `# Data Migration Plan` giữ nguyên — là tiêu đề người-đọc.)

- [ ] **Step 3: data/plugin.yaml assets.commands**

```json
      "commands/migration-plan.md"
```
→
```json
      "commands/plan-migration.md"
```

- [ ] **Step 4: db-migration-pipeline.yaml — đổi step id `migration-plan` (tránh nhầm với command)**

```yaml
  - id: migration-plan
    uses: data/data-migration
    depends: [schema-review]
```
→ đổi `id: migration-plan` thành `id: plan-migration`; và ở step `dry-run` đổi `depends: [migration-plan]` thành `depends: [plan-migration]`. (Giữ BOM; `uses: data/data-migration` không đổi.)

- [ ] **Step 5: Đổi tên file command platform**

Run: `git mv plugins/platform/commands/deployment-plan.md plugins/platform/commands/plan-deployment.md`

- [ ] **Step 6: Sửa frontmatter `plan-deployment.md`**

```yaml
id: platform.deployment_plan
slug: deployment-plan
```
→
```yaml
id: platform.plan_deployment
slug: plan-deployment
```

- [ ] **Step 7: platform/plugin.yaml assets.commands**

```json
      "commands/deployment-plan.md"
```
→
```json
      "commands/plan-deployment.md"
```

- [ ] **Step 8: command-registry.yaml — sửa 2 entry (giữ thứ tự khóa id/plugin/slug/file, giữ vị trí mảng)**

Data entry:
```json
      "id": "data.migration_plan",
      "plugin": "data",
      "slug": "migration-plan",
      "file": "commands/migration-plan.md"
```
→
```json
      "id": "data.plan_migration",
      "plugin": "data",
      "slug": "plan-migration",
      "file": "commands/plan-migration.md"
```
Platform entry:
```json
      "id": "platform.deployment_plan",
      "plugin": "platform",
      "slug": "deployment-plan",
      "file": "commands/deployment-plan.md"
```
→
```json
      "id": "platform.plan_deployment",
      "plugin": "platform",
      "slug": "plan-deployment",
      "file": "commands/plan-deployment.md"
```
(Thứ tự sắp xếp toàn cục theo id giữ nguyên: `data.plan_migration` vẫn thuộc cụm `data.*`; `platform.plan_deployment` < `platform.respond_incident`.)

- [ ] **Step 9: Grep dò sót slug/id cũ**

Run: `rg -n "migration-plan|migration_plan|deployment-plan|deployment_plan" --glob '!docs/superpowers/**' --glob '!CHANGELOG.md'`
Expected: 0 kết quả ngoài các file đã sửa (sửa nốt `README.md`/`README_VI.md`/`intent-router.yaml`/`cli/test/*` nếu có, rồi grep lại). Lưu ý `data-migration` (skill) KHÁC `migration-plan` (command) — không đụng skill.

- [ ] **Step 10: Build + test + validate**

Run: `npm run build && npm test && npm run validate`
Expected: xanh; `Validated 7 plugins...`.
Nếu lỗi `command registry must match canonical command files` → command-registry chưa khớp `generateCommandRegistry`. Tái sinh bằng node:
```bash
node -e "import('./cli/dist/contracts.mjs').then(async m=>{const r=await m.generateCommandRegistry({root:process.cwd()});const fs=await import('node:fs');fs.writeFileSync('core/routing/command-registry.yaml', JSON.stringify(r,null,2)+'\n');})"
```
rồi chạy lại validate. (Xác nhận `generateCommandRegistry` là export khả dụng trước khi dùng; nếu không, sửa tay theo Step 8 cho khớp.)

- [ ] **Step 11: Commit (qua git-workflow-design)**

Message: `refactor(plugins): rename migration-plan/deployment-plan commands to verb-noun`

---

### Task 4: Phase 4 — Chuẩn hóa section / frontmatter (không đổi tên)

**Files:**
- Modify: `plugins/application/commands/deliver-feature.md` (Required Skills)
- Modify: `plugins/application/commands/review-backend.md` (Required Skills + Steps)
- Modify: `plugins/quality/commands/verify-quality.md` (Required Skills)
- Modify: `plugins/architecture/commands/review-architecture.md` (Required Skills)
- Modify: `plugins/quality/skills/test-qa-review/SKILL.md` (description)
- Modify: `plugins/architecture/skills/diagram-generate/SKILL.md` (H1)
- Modify: `plugins/platform/skills/git-workflow-design/SKILL.md` (bỏ keywords)

**Interfaces:**
- Consumes: trạng thái sau Phase 0 (review-architecture Required Skills còn 2 bullet).
- Produces: Required Skills khớp phạm vi workflow; SKILL.md frontmatter 2-key; prose/H1 sạch. Mọi skill thêm vào đều thuộc `resolvedSkills` của plugin tương ứng (đã xác minh owned).

- [ ] **Step 1: deliver-feature.md — thêm `- feature-fix`**

```markdown
- feature-review
- feature-test
```
→
```markdown
- feature-review
- feature-test
- feature-fix
```

- [ ] **Step 2: review-backend.md — thêm `- python-backend-engineer` + mở `## Steps` lên 5**

Required Skills:
```markdown
- java-analyze
- code-shared-design
- test-automation-validate
```
→
```markdown
- java-analyze
- python-backend-engineer
- code-shared-design
- test-automation-validate
```
Steps (thay cả khối 4 bước hiện tại bằng 5 bước):
```markdown
## Steps

1. Inspect project structure, stack, and language (Java or Python).
2. Review architecture and API boundaries.
3. Review persistence, error handling, and logging.
4. Review test coverage and identify gaps.
5. Return prioritized, evidence-backed findings.
```

- [ ] **Step 3: verify-quality.md — thêm `- naming-rule-validate`**

```markdown
- test-qa-review
- test-automation-validate
```
→
```markdown
- test-qa-review
- test-automation-validate
- naming-rule-validate
```

- [ ] **Step 4: review-architecture.md — căn Required Skills theo pipeline (thêm pattern + diagram)**

Sau Phase 0 khối còn:
```markdown
- architecture-onion-design
- code-shared-design
```
→
```markdown
- architecture-onion-design
- code-shared-design
- code-design-pattern
- diagram-generate
```
(Khớp 4 bước của `architecture-review-pipeline.yaml`. Cả 4 skill đều thuộc `architecture` → phân giải OK.)

- [ ] **Step 5: test-qa-review/SKILL.md — sửa câu "future skill" đã lỗi thời**

Trong frontmatter `description:` (dòng cuối câu mô tả), thay:
```
Reserve automation-focused test generation and execution for a future test-automation-validate skill.
```
→
```
Defer automation-focused test generation and execution to the test-automation-validate skill.
```

- [ ] **Step 6: diagram-generate/SKILL.md — sửa H1 placeholder**

```markdown
# Diagram-W
```
→
```markdown
# Diagram Generation
```

- [ ] **Step 7: git-workflow-design/SKILL.md — bỏ key `keywords` (chuẩn frontmatter chỉ name+description)**

Xóa dòng:
```yaml
keywords: [commit, push, branch, merge, revert, release, hotfix, PR, pull request, changelog, git, stage, staging]
```
(Giữ `name` và `description`.)

- [ ] **Step 8: Build + test + validate**

Run: `npm run build && npm test && npm run validate`
Expected: xanh; `Validated 7 plugins for 4 providers.` (mọi Required Skills mới đều phân giải qua assets.skills của plugin sở hữu).

- [ ] **Step 9: Commit (qua git-workflow-design)**

Message: `refactor(plugins): normalize command sections and SKILL.md frontmatter`

---

### Task 5: Kiểm tra cài đặt thực tế (xác nhận không vỡ resolution)

**Files:** none (sandbox)

- [ ] **Step 1: Cài thử vào target tạm + check**

Run (target tạm, ví dụ thư mục mới): `aie install --all --target claude --yes` rồi `aie check` và `aie doctor`.
Expected: install OK, `aie check`/`aie doctor` pass; không lỗi phân giải skill/command/workflow sau khi đổi tên. (Xác nhận các Required Skills/`uses` mới resolve ở runtime.)

- [ ] **Step 2: Grep tổng dò slug/tên cũ toàn repo**

Run: `rg -n "fullstack-feature|migration-plan|deployment-plan|\bDiagram-W\b" --glob '!docs/superpowers/**' --glob '!CHANGELOG.md'`
Expected: 0 kết quả.

---

## Self-Review

- **Spec coverage:** Phase 0/1/2/4 của spec đều có task; các mục spec đánh dấu "hoãn"/"ngoài phạm vi" được liệt kê trong Global Constraints. Mục spec "vá `depends_on.plugins`" bị loại bỏ có chủ đích (đã chứng minh không hiệu lực với `resolvedSkills`) — ghi rõ ở Global Constraints + cần báo người dùng.
- **Placeholder scan:** không có TBD/TODO; mọi edit có nội dung cũ→mới cụ thể; lệnh + kết quả mong đợi rõ ràng.
- **Type/tên nhất quán:** ids mới `data.plan_migration`, `platform.plan_deployment` dùng nhất quán ở command frontmatter + plugin.yaml + command-registry; workflow id `feature-delivery-pipeline` khớp tên file + assets.workflows.
- **Điểm cần xác nhận khi thực thi (gắn cờ, không phải placeholder):** (a) `generateCommandRegistry` có phải export khả dụng cho lệnh tái sinh ở Task 3/Step 10; (b) Task 5 cần một thư mục target tạm để `aie install` (không chạy trong repo nguồn).
