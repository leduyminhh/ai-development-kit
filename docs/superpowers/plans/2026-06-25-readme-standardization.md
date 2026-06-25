# README Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ban hành một chuẩn README, áp dụng lại toàn bộ README dự án cho nhất quán, và thêm kiểm tra cứng trong `aie validate`.

**Architecture:** Chuẩn nằm ở `core/standards/readme-authoring-standard.md` (Vietnamese, bullet-style, khớp các standard anh em). Áp dụng chuẩn bằng cách sửa nội dung các README hiện có. Validator là một hàm mới `validateReadmeStandard(root, errors)` trong `cli/src/contracts.mjs`, gọi từ `validateRepository`, theo mô hình push lỗi → throw (enforce).

**Tech Stack:** Node.js ESM (`.mjs`), `node:test`, `node:fs/promises`. Build qua `tsc` (`npm run build:cli`); test chạy từ `cli/dist/` nên phải build trước khi test phản ánh thay đổi nguồn.

## Global Constraints

- Ngôn ngữ user-facing: tiếng Việt UTF-8 có dấu. README EN là canonical; README_VI là bản đồng bộ.
- Giữ nguyên BOM của file UTF-8 hiện có khi sửa (dùng Edit, không ghi đè toàn file). File mới ghi UTF-8.
- Không backtick token trong commit body; commit theo Conventional Commits; KHÔNG tự push.
- Validator phải dùng helper sẵn có trong `contracts.mjs` (`readFile`, `path`); không thêm dependency.
- Tier A (cặp EN+VI bắt buộc): root, `core/`, `plugins/`, `providers/`, `docs/`, `cli/`.
- Tier B (chỉ EN bắt buộc): `cli/scripts/`, `adapters/codex/`, `adapters/antigravity/`.
- Heading mục bản đồ thư mục: EN = `## Structure`, VI = `## Cấu Trúc`.
- Footer chuẩn Tier A: mục `## Change Checklist` (VI: `## Checklist Thay Đổi`) chứa dòng "Update English README.md first, then synchronize README_VI.md" và nhắc `npm run validate`.
- Sau khi sửa nguồn liên quan code: chạy `npm run build:cli` trước khi `node --test` hoặc `npm run validate`.

## File Structure

- Create: `core/standards/readme-authoring-standard.md` — tài liệu chuẩn (Task 1).
- Create: `cli/README_VI.md` — bản VI cho CLI (Task 5).
- Modify: `README.md`, `README_VI.md` — đồng bộ cặp gốc (Task 2).
- Modify: `core/README.md`+`_VI`, `plugins/README.md`+`_VI`, `providers/README.md`+`_VI`, `docs/README.md`+`_VI`, `cli/README.md`, `cli/scripts/README.md` — đổi heading sang `## Structure`/`## Cấu Trúc` và bổ sung footer Tier A còn thiếu (Tasks 3–4).
- Modify: `cli/src/contracts.mjs` — thêm `validateReadmeStandard`, export, gọi trong `validateRepository` (Task 6).
- Create: `cli/test/readme-standard.test.mjs` — unit test cho validator (Task 6).
- Modify: `cli/test/contracts.test.mjs` — harness copy thêm README gốc (Task 6).

---

### Task 1: Tài liệu chuẩn README

**Files:**
- Create: `core/standards/readme-authoring-standard.md`

**Interfaces:**
- Produces: file chuẩn được Task 6 yêu cầu tồn tại (đưa vào danh sách required artifact).

- [ ] **Step 1: Tạo file chuẩn**

Ghi `core/standards/readme-authoring-standard.md` (UTF-8) với nội dung:

```markdown
# Readme Authoring Standard

- README EN (`README.md`) là canonical; sửa EN trước, đồng bộ `README_VI.md` sau.
- Tier A (cặp EN+VI bắt buộc): root, `core/`, `plugins/`, `providers/`, `docs/`, `cli/`.
- Tier B (chỉ EN bắt buộc, VI tùy chọn): `cli/scripts/`, `adapters/codex/`, `adapters/antigravity/`.
- Mỗi README có đúng một H1 là tên riêng của thành phần, theo sau là đoạn mở đầu nêu thành phần sở hữu gì và khi nào dùng.
- Mục bản đồ thư mục dùng heading thống nhất: EN `## Structure`, VI `## Cấu Trúc`; bảng có cột tối thiểu `Path`/`Folder` và `Purpose`, cho thêm cột như `Edit When`.
- README Tier A kết thúc bằng `## Change Checklist` (VI `## Checklist Thay Đổi`) gồm dòng "Update English README.md first, then synchronize README_VI.md" và nhắc chạy `npm run validate` khi liên quan.
- Cặp EN/VI phải có cùng số lượng heading cấp 2 (`##`) và cùng thứ tự mục; khối code và lệnh shell giống hệt, chỉ dịch phần văn xuôi.
- Không đặt badge phiên bản trong README; tham chiếu phiên bản qua `CHANGELOG.md`.
- Khi thêm README ở thư mục mới cần được kiểm tra, đăng ký thư mục đó vào danh sách trong `validateReadmeStandard` (`cli/src/contracts.mjs`).
```

- [ ] **Step 2: Xác nhận build/validate không gãy do thêm file**

Run: `npm run build:cli`
Expected: build thành công (thêm file markdown không ảnh hưởng tsc).

- [ ] **Step 3: Commit**

```bash
git add core/standards/readme-authoring-standard.md
git commit -m "docs(core): add readme authoring standard"
```

---

### Task 2: Đồng bộ cặp README gốc

**Files:**
- Modify: `README.md`
- Modify: `README_VI.md`

**Interfaces:**
- Produces: root README pair với heading `## Structure`/`## Cấu Trúc`, cùng số H2, có footer Change Checklist, không badge.

- [ ] **Step 1: EN — đổi "Project Structure" sang "Structure"**

Edit `README.md`:
- `## Project Structure` → `## Structure`
- Trong mục Contents: `- [Project Structure](#project-structure)` → `- [Structure](#structure)`

(Giữ nguyên `## Detail Structure` — đây là mục mô tả cấu trúc nội bộ plugin, khác với bản đồ thư mục.)

- [ ] **Step 2: EN — thêm footer Change Checklist**

Edit `README.md`: thêm vào cuối file, sau mục "Migration And Docs":

```markdown
## Change Checklist

- Update English `README.md` first, then synchronize `README_VI.md`.
- Keep command, provider path, and plugin tables aligned with `plugins/`, `adapters/`, and `core/routing/`.
- Run `npm run validate` after structure, command id, provider path, or plugin catalog changes.
```

- [ ] **Step 3: VI — đổi heading, đổi "Development" → "Maintainer Workflow", bỏ badge, bỏ Quickstart khỏi Contents, thêm footer**

Edit `README_VI.md`:
- Xóa hai dòng badge:
  ```markdown
  **Phiên bản: [v1.1.0](CHANGELOG.md)** - chuẩn hóa plugin, shell completions và
  tự động hóa CI/CD.
  ```
  (xóa cả dòng trống thừa nếu tạo ra hai dòng trống liên tiếp)
- `## Cấu Trúc Project` → `## Cấu Trúc`
- Trong Contents: `- [Quickstart](#quickstart)` → xóa dòng này; `- [Cấu Trúc Project](#cấu-trúc-project)` → `- [Cấu Trúc](#cấu-trúc)`; `- [Development](#development)` → `- [Maintainer Workflow](#maintainer-workflow)`
- `## Development` → `## Maintainer Workflow`
- Thêm vào cuối file, sau "Migration And Docs":

```markdown
## Checklist Thay Đổi

- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Giữ bảng lệnh, provider path và plugin khớp với `plugins/`, `adapters/` và `core/routing/`.
- Chạy `npm run validate` sau thay đổi về cấu trúc, command id, provider path hoặc danh mục plugin.
```

- [ ] **Step 4: Kiểm tra số H2 khớp**

Run: `node -e "const fs=require('fs');const c=s=>(fs.readFileSync(s,'utf8').replace(/^﻿/,'').match(/^## /gm)||[]).length;console.log('EN',c('README.md'),'VI',c('README_VI.md'))"`
Expected: hai số bằng nhau (kỳ vọng `EN 10 VI 10`).

- [ ] **Step 5: Commit**

```bash
git add README.md README_VI.md
git commit -m "docs: sync root readme pair and unify structure heading"
```

---

### Task 3: Đổi heading bản đồ thư mục ở core, plugins, providers, docs

**Files:**
- Modify: `core/README.md`, `core/README_VI.md`
- Modify: `plugins/README.md`, `plugins/README_VI.md`
- Modify: `providers/README.md`, `providers/README_VI.md`
- Modify: `docs/README.md`, `docs/README_VI.md`

**Interfaces:**
- Consumes: heading canonical từ Global Constraints (`## Structure` / `## Cấu Trúc`).
- Produces: bốn cặp Tier A với heading bản đồ thư mục thống nhất, vẫn cân bằng số H2.

- [ ] **Step 1: core**

Edit `core/README.md`: `## Folder Map` → `## Structure`
Edit `core/README_VI.md`: `## Bản Đồ Thư Mục` → `## Cấu Trúc`

- [ ] **Step 2: plugins**

Edit `plugins/README.md`: `## Plugin Anatomy` → `## Structure`
Edit `plugins/README_VI.md`: `## Cấu Trúc Một Plugin` → `## Cấu Trúc`

(Giữ nguyên `## Plugin Map` / `## Bản Đồ Plugin`: đó là danh mục plugin, không phải bản đồ thư mục.)

- [ ] **Step 3: providers**

Edit `providers/README.md`: `## Layout` → `## Structure`
(`providers/README_VI.md` đã dùng `## Cấu Trúc` — không đổi.)

- [ ] **Step 4: docs**

Edit `docs/README.md`: `## Folder Map` → `## Structure`
Edit `docs/README_VI.md`: `## Bản Đồ Thư Mục` → `## Cấu Trúc`

(core/plugins/docs đã có sẵn Change Checklist; providers chưa — xử lý ở Task 4.)

- [ ] **Step 5: Kiểm tra số H2 từng cặp khớp**

Run:
```bash
node -e "const fs=require('fs');const c=s=>(fs.readFileSync(s,'utf8').replace(/^﻿/,'').match(/^## /gm)||[]).length;for(const d of ['core','plugins','providers','docs'])console.log(d,c(d+'/README.md'),c(d+'/README_VI.md'))"
```
Expected: mỗi dòng hai số bằng nhau.

- [ ] **Step 6: Commit**

```bash
git add core/README.md core/README_VI.md plugins/README.md plugins/README_VI.md providers/README.md providers/README_VI.md docs/README.md docs/README_VI.md
git commit -m "docs: unify structure heading across core, plugins, providers, docs"
```

---

### Task 4: Thêm footer Change Checklist cho providers

**Files:**
- Modify: `providers/README.md`, `providers/README_VI.md`

**Interfaces:**
- Produces: providers pair đạt yêu cầu footer Tier A, vẫn cân bằng H2 (mỗi bản +1).

- [ ] **Step 1: EN — thêm footer**

Edit `providers/README.md`: thêm vào cuối file, sau mục "Rules":

```markdown
## Change Checklist

- Update English `README.md` first, then synchronize `README_VI.md`.
- Keep the MCP registry inactive by default; do not add executable server source here.
- Run `npm run validate` after MCP registry, policy, schema, or example changes.
```

- [ ] **Step 2: VI — thêm footer**

Edit `providers/README_VI.md`: thêm vào cuối file, sau mục "Quy Tắc":

```markdown
## Checklist Thay Đổi

- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Giữ MCP registry không active mặc định; không thêm source server executable ở đây.
- Chạy `npm run validate` sau thay đổi registry, policy, schema hoặc ví dụ MCP.
```

- [ ] **Step 3: Kiểm tra H2 khớp**

Run: `node -e "const fs=require('fs');const c=s=>(fs.readFileSync(s,'utf8').replace(/^﻿/,'').match(/^## /gm)||[]).length;console.log(c('providers/README.md'),c('providers/README_VI.md'))"`
Expected: hai số bằng nhau.

- [ ] **Step 4: Commit**

```bash
git add providers/README.md providers/README_VI.md
git commit -m "docs(providers): add change checklist footer to readme pair"
```

---

### Task 5: Tạo cli/README_VI.md và thống nhất heading cli

**Files:**
- Modify: `cli/README.md`
- Create: `cli/README_VI.md`
- Modify: `cli/scripts/README.md`

**Interfaces:**
- Produces: cli pair (Tier A) cùng số H2; cli/scripts (Tier B) heading `## Structure`.

- [ ] **Step 1: cli EN — đổi heading + thêm footer Change Checklist**

Edit `cli/README.md`: `## Folder Map` → `## Structure`
Edit `cli/README.md`: thêm vào cuối file, sau mục "Verification":

```markdown
## Change Checklist

- Update English `README.md` first, then synchronize `README_VI.md`.
- Keep command and provider path tables aligned with `cli/src/` behavior.
- Run `npm run validate` after CLI command, provider projection, or workflow changes.
```

- [ ] **Step 2: cli/scripts EN — đổi heading**

Edit `cli/scripts/README.md`: `## Layout` → `## Structure`

- [ ] **Step 3: Đồng bộ cli/README_VI.md (đã tồn tại — KHÔNG tạo mới)**

CHỈNH SỬA: `cli/README_VI.md` đã tồn tại sẵn (bản dịch tốt, dùng heading VI như `## Lệnh`, `## Xác Minh`). Chỉ cần 2 sửa: đổi `## Bản Đồ Thư Mục` → `## Cấu Trúc`, và thêm footer `## Checklist Thay Đổi` để cân bằng H2 với EN (7/7). Nội dung tham khảo bên dưới nếu cần dựng lại từ đầu; mặc định giữ bản dịch hiện có.

```markdown
# AI Engineering CLI

`cli/` sở hữu hai executable `ai-engineering` và `aie` được publish, lifecycle
runtime, provider projection, chẩn đoán, công cụ phân phối và test.

## Cấu Trúc

| Đường dẫn | Mục đích |
| --- | --- |
| `src/index.ts` | Entrypoint executable mỏng, biên dịch ra `dist/index.js`. |
| `src/*.mjs` | Runtime cho command, contract, lifecycle, projection, state, transaction, migration, doctor, registry và distribution. |
| `dist/` | Output CLI sinh từ `npm run build:cli`. |
| `test/` | Bộ test Node, gồm install/update/remove và kiểm tra ma trận provider. |
| `hooks/` | Hook launcher hướng provider. |
| `scripts/` | Công cụ PowerShell giữ lại, helper, fixture và test tập trung. |

## Commands

```text
aie available
aie installed [--scope <project|global>|-g]
aie install <plugin...> --target <provider[,provider...]> [--yes]
aie install application --target codex --yes
aie install --all --target <provider[,provider...]> [--yes]
aie install application --with quality
aie update <plugin...> [--dry-run]
aie update --all
aie remove <plugin...>
aie remove --all
aie check [--scope <project|global>|-g]
aie doctor [--scope <project|global>|-g]
```

Scope mặc định là `project`. Install không tương tác cần `--yes` kèm root plugin
và provider tường minh. Các alias tương thích vẫn dùng được qua `plugin`,
`uninstall` và `upgrade`.

## Workflow Commands

```text
aie workflow init
aie workflow list
aie workflow validate
aie workflow build <workflow-id>
aie workflow run <workflow-id>
aie workflow step-next <workflow-id> [run-id]
aie workflow step-complete <workflow-id> <run-id> <step-id>
aie workflow step-fail <workflow-id> <run-id> <step-id>
aie workflow status <workflow-id> [run-id]
aie workflow history <workflow-id>
aie workflow logs <workflow-id> <run-id>
aie workflow clean
aie workflow install <plugin>
```

Workflow definition đọc từ state project tại
`.ai-engineering/workflows/definitions/` và từ definition dùng chung trong
`core/workflows/`. Workflow asset do plugin sở hữu có thể cài từ
`plugins/<plugin>/workflows/` bằng `aie workflow install <plugin>`.

## Provider Projections

| Provider | Project | Global |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules` | Provider MCP config chưa sinh cho tới khi có active tool. |

Runtime và lifecycle state ghi dưới `.ai-engineering/` tại scope root đã chọn.

## Maintainer Commands

```text
aie init
aie validate
aie build --all
aie artifact verify --all
aie registry generate
aie migrate --dry-run
aie migrate --delete-legacy
aie generate-adapter <plugin...> --target <provider[,provider...]>
```

Command Markdown là canonical. `core/routing/command-registry.yaml` là index dẫn
xuất deterministic dùng schema version 2.

## Verification

```bash
npm test
npm run validate
npm run build:cli
```

Sau khi đổi `cli/src/`, build lại `dist/`.

## Checklist Thay Đổi

- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Giữ bảng command và provider path khớp với hành vi trong `cli/src/`.
- Chạy `npm run validate` sau thay đổi command CLI, provider projection hoặc workflow.
```

- [ ] **Step 4: Kiểm tra H2 cli khớp**

Run: `node -e "const fs=require('fs');const c=s=>(fs.readFileSync(s,'utf8').replace(/^﻿/,'').match(/^## /gm)||[]).length;console.log(c('cli/README.md'),c('cli/README_VI.md'))"`
Expected: hai số bằng nhau (kỳ vọng `7 7`).

- [ ] **Step 5: Commit**

```bash
git add cli/README.md cli/README_VI.md cli/scripts/README.md
git commit -m "docs(cli): add vietnamese readme and unify structure heading"
```

---

### Task 6: Validator README + test + cập nhật harness

**Files:**
- Modify: `cli/src/contracts.mjs` (thêm helper + export + gọi trong `validateRepository`; required artifact list)
- Create: `cli/test/readme-standard.test.mjs`
- Modify: `cli/test/contracts.test.mjs` (harness copy thêm README gốc)

**Interfaces:**
- Consumes: `readFile`, `path` đã import sẵn ở đầu `contracts.mjs`.
- Produces: `export async function validateReadmeStandard(root, errors)`; được gọi trong `validateRepository(root)` trước khi kiểm tra `errors.length`.

- [ ] **Step 1: Viết test thất bại trước**

Create `cli/test/readme-standard.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateReadmeStandard } from "../src/contracts.mjs";

const TIER_A = ["", "core", "plugins", "providers", "docs", "cli"];
const TIER_B = ["cli/scripts", "adapters/codex", "adapters/antigravity"];

function readme(title, h2 = 1) {
  const sections = Array.from(
    { length: h2 },
    (_, i) => `## Section ${i + 1}\n\nBody.\n`,
  ).join("\n");
  return `# ${title}\n\nLead paragraph.\n\n${sections}`;
}

function compliantFiles() {
  const files = {};
  for (const dir of TIER_A) {
    files[path.join(dir, "README.md")] = readme("Component");
    files[path.join(dir, "README_VI.md")] = readme("Component");
  }
  for (const dir of TIER_B) {
    files[path.join(dir, "README.md")] = readme("Component");
  }
  return files;
}

async function runWith(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-readme-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(root, rel);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, content);
    }
    const errors = [];
    await validateReadmeStandard(root, errors);
    return errors;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("compliant readme tree produces no errors", async () => {
  const errors = await runWith(compliantFiles());
  assert.deepEqual(errors, []);
});

test("missing README_VI in a tier A dir is an error", async () => {
  const files = compliantFiles();
  delete files[path.join("cli", "README_VI.md")];
  const errors = await runWith(files);
  assert.ok(errors.some((e) => /cli is missing README_VI\.md/.test(e)));
});

test("orphan README_VI without README is an error", async () => {
  const files = compliantFiles();
  delete files[path.join("core", "README.md")];
  const errors = await runWith(files);
  assert.ok(errors.some((e) => /core is missing README\.md/.test(e)));
  assert.ok(errors.some((e) => /core has README_VI\.md without README\.md/.test(e)));
});

test("a readme without exactly one H1 is an error", async () => {
  const files = compliantFiles();
  files["README.md"] = "No title here.\n\n## Section 1\n\nBody.\n";
  const errors = await runWith(files);
  assert.ok(errors.some((e) => /root\/README\.md must have exactly one H1/.test(e)));
});

test("tier A H2 count mismatch is an error", async () => {
  const files = compliantFiles();
  files[path.join("docs", "README.md")] = readme("Component", 3);
  files[path.join("docs", "README_VI.md")] = readme("Component", 2);
  const errors = await runWith(files);
  assert.ok(errors.some((e) => /docs EN\/VI heading count mismatch/.test(e)));
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run build:cli && node --test cli/test/readme-standard.test.mjs`
Expected: FAIL — `validateReadmeStandard` chưa export (import lỗi / không phải hàm).

- [ ] **Step 3: Thêm helper + export vào contracts.mjs**

Modify `cli/src/contracts.mjs`. Sau hàm `exists` (kết thúc ở dòng ~200), thêm:

```js
const README_TIER_A_DIRS = ["", "core", "plugins", "providers", "docs", "cli"];
const README_TIER_B_DIRS = [
  "cli/scripts",
  "adapters/codex",
  "adapters/antigravity",
];

async function readTextIfExists(pathname) {
  try {
    return await readFile(pathname, "utf8");
  } catch {
    return null;
  }
}

function countHeadings(text, depth) {
  // Strip BOM and fenced code blocks so `# Bash` comments inside ```bash``` are
  // not miscounted as headings.
  const body = text.replace(/^﻿/, "").replace(/```[\s\S]*?```/g, "");
  const marker = "#".repeat(depth);
  const matcher = new RegExp(`^${marker} `, "gm");
  return (body.match(matcher) || []).length;
}

export async function validateReadmeStandard(root, errors) {
  for (const dir of README_TIER_A_DIRS) {
    const label = dir === "" ? "root" : dir;
    const en = await readTextIfExists(path.join(root, dir, "README.md"));
    const vi = await readTextIfExists(path.join(root, dir, "README_VI.md"));
    if (en === null) {
      errors.push(`README standard: ${label} is missing README.md`);
    }
    if (vi === null) {
      errors.push(`README standard: ${label} is missing README_VI.md`);
    }
    for (const [name, text] of [["README.md", en], ["README_VI.md", vi]]) {
      if (text === null) continue;
      const h1 = countHeadings(text, 1);
      if (h1 !== 1) {
        errors.push(
          `README standard: ${label}/${name} must have exactly one H1 (found ${h1})`,
        );
      }
    }
    if (en !== null && vi !== null) {
      const enH2 = countHeadings(en, 2);
      const viH2 = countHeadings(vi, 2);
      if (enH2 !== viH2) {
        errors.push(
          `README standard: ${label} EN/VI heading count mismatch (README.md ${enH2}, README_VI.md ${viH2})`,
        );
      }
    }
  }
  for (const dir of README_TIER_B_DIRS) {
    const en = await readTextIfExists(path.join(root, dir, "README.md"));
    if (en === null) {
      errors.push(`README standard: ${dir} is missing README.md`);
    } else if (countHeadings(en, 1) !== 1) {
      errors.push(
        `README standard: ${dir}/README.md must have exactly one H1`,
      );
    }
  }
  for (const dir of [...README_TIER_A_DIRS, ...README_TIER_B_DIRS]) {
    const label = dir === "" ? "root" : dir;
    const vi = await readTextIfExists(path.join(root, dir, "README_VI.md"));
    const en = await readTextIfExists(path.join(root, dir, "README.md"));
    if (vi !== null && en === null) {
      errors.push(`README standard: ${label} has README_VI.md without README.md`);
    }
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run build:cli && node --test cli/test/readme-standard.test.mjs`
Expected: PASS toàn bộ.

- [ ] **Step 5: Gọi validator trong validateRepository + thêm required artifact**

Modify `cli/src/contracts.mjs`, trong `validateRepository`:
- Thêm `"core/standards/readme-authoring-standard.md"` vào mảng required artifact (cùng chỗ với `core/agents/AGENTS.template.md`, dòng ~479-483).
- Ngay trước khối `if (errors.length > 0)` (dòng ~634), thêm:

```js
  await validateReadmeStandard(root, errors);
```

- [ ] **Step 6: Cập nhật harness test copy thêm README gốc**

Modify `cli/test/contracts.test.mjs`: trong cả `withRepositoryCopy` và `withPluginsRepositoryCopy`, thêm `"README.md"` và `"README_VI.md"` vào danh sách `entry` được `cp`. (Hai file này ở root, cần có để bản copy đạt chuẩn README.)

Ví dụ cho `withRepositoryCopy`:

```js
    for (const entry of [
      "ai-engineering.config.yaml",
      "README.md",
      "README_VI.md",
      "plugins",
      "adapters",
      "cli",
      "core",
      "providers",
      "docs",
    ]) {
```

Áp dụng tương tự cho danh sách trong `withPluginsRepositoryCopy`.

- [ ] **Step 7: Chạy toàn bộ test + validate trên repo thật**

Run: `npm run build:cli && node --test cli/test/contracts.test.mjs cli/test/readme-standard.test.mjs`
Expected: PASS.

Run: `npm run validate`
Expected: PASS (repo đã README-compliant từ Task 1–5).

- [ ] **Step 8: Commit**

```bash
git add cli/src/contracts.mjs cli/test/readme-standard.test.mjs cli/test/contracts.test.mjs
git commit -m "feat(cli): enforce readme standard in validate"
```

---

### Task 7: Kiểm tra tổng thể

**Files:** (không sửa file mới)

- [ ] **Step 1: Build + full test suite**

Run: `npm test`
Expected: toàn bộ test pass.

- [ ] **Step 2: Validate + doctor**

Run: `npm run validate && npm run doctor`
Expected: cả hai pass.

- [ ] **Step 3: Xác nhận không còn orphan / lệch (rà nhanh)**

Run:
```bash
node -e "const fs=require('fs');const c=(s,d)=>(fs.readFileSync(s,'utf8').replace(/^﻿/,'').match(new RegExp('^'+'#'.repeat(d)+' ','gm'))||[]).length;for(const d of ['','core','plugins','providers','docs','cli']){const en=(d?d+'/':'')+'README.md',vi=(d?d+'/':'')+'README_VI.md';console.log(d||'root','H1',c(en,1),c(vi,1),'H2',c(en,2),c(vi,2))}"
```
Expected: mọi dòng H1 = `1 1`; H2 hai số bằng nhau.

## Self-Review

**Spec coverage:**
- §3.1 phân tầng → Global Constraints + Task 6 danh sách Tier A/B. ✓
- §3.2 cấu trúc canonical (H1, Structure, Change Checklist) → Task 1 (chuẩn) + Tasks 2–5 (áp dụng). ✓
- §3.3 song ngữ (EN canonical, parity H2, code giống nhau) → Task 1 + validator H2 parity (Task 6). ✓
- §4 validator enforce (pairing, orphan, H1, H2 parity) → Task 6 helper + 5 test case. ✓
- §5 áp dụng theo file → Tasks 1–5 (gồm cli VI mới, sync gốc, rename heading, footer providers). ✓
- §6 kiểm thử → Task 6 unit test + Task 7 full suite + validate. ✓
- §7 rủi ro (enforce sau khi vá; anchor link) → thứ tự Task (validator ở Task 6 sau khi nội dung xong); Task 2 cập nhật anchor Contents. ✓
- §8 tiêu chí hoàn tất → Task 7. ✓

**Placeholder scan:** Không có TBD/TODO; mọi step code có nội dung thật. ✓

**Type consistency:** `validateReadmeStandard(root, errors)`, `countHeadings(text, depth)`, `readTextIfExists(pathname)` dùng nhất quán giữa contracts.mjs và test. Thông điệp lỗi trong validator khớp regex trong test (`is missing README_VI.md`, `has README_VI.md without README.md`, `must have exactly one H1`, `EN/VI heading count mismatch`). ✓

**Lưu ý giả định:** "Đổi hết về `## Structure`" được áp dụng cho TẤT CẢ README có mục bản đồ thư mục (gồm providers/docs/root), rộng hơn ví dụ liệt kê trong câu hỏi gốc, theo đúng nhãn lựa chọn "đổi hết / nhất quán nhất".
