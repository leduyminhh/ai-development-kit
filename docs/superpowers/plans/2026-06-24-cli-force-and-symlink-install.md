# CLI `--force` Fix + Symlink Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa `--force` để update/upgrade re-project được khi version trùng, và biến install mặc định thành symlink trỏ vào folder build (fallback copy + hướng dẫn Developer Mode khi máy không hỗ trợ).

**Architecture:** Threading `linkMode` từ `buildDesiredState` (ghi vào `platform.lock`) → `planTransaction` (đánh dấu action/ownership `link`) → `applyTransaction` (ghi nội dung vào `<target>/.ai-engineering/build/<relativePath>` rồi tạo symlink, fallback copy khi lỗi). Remove/update không có nhánh symlink riêng — symlink trong suốt vì `rm` xoá link và re-project ghi lại build. `checkInstalled` đọc `linkMode` + verify link bằng `lstat`/`readlink`.

**Tech Stack:** Node.js 20+ ESM (`.mjs`), `node:fs/promises`, `node:test`, `tsc` build (`npm run build:cli`).

## Global Constraints

- Build trước khi test: `npm run build:cli` (tests spawn `cli/dist/index.js`).
- Giữ encoding sẵn có của file (nhiều file UTF-8 có BOM) — chỉ sửa vùng cần thiết.
- File merge-managed (`mergeStrategy` set: `CLAUDE.md`, `AGENTS.md`, MCP config) KHÔNG symlink, luôn copy/merge.
- Folder build: `<target>/.ai-engineering/build/<relativePath>` — KHÔNG đặt trong package npm.
- Symlink là mặc định và duy nhất; lỗi `symlink()` → fallback copy + warning có hướng dẫn Developer Mode.
- Comment thưa, chỉ ở chỗ không hiển nhiên (theo convention repo).

---

### Task 1: Fix `--force` trong `updatePlugins`

**Files:**
- Modify: `cli/src/lifecycle.mjs:592-627` (hàm `updatePlugins`)
- Test: `cli/test/lifecycle.test.mjs` (thêm test mới)

**Interfaces:**
- Consumes: `findOutdated({ root, target, registry })`, `installPlugins({ root, target, context, pluginIds, providers, optionalPlugins, force })`, `listInstalled({ target })`.
- Produces: `updatePlugins(...)` trả `{ status, changed, updates, warnings? }`. Khi `force=true` và không có plugin lệch version, vẫn chạy `installPlugins` và trả `changed: true`.

- [ ] **Step 1: Viết failing test**

Thêm vào `cli/test/lifecycle.test.mjs` (sau test "updates from canonical source", dùng các import sẵn có `installPlugins`, `updatePlugins`, `mkdtemp`, `rm`, `path`, `os`, `repoRoot`):

```javascript
test("force update re-projects even when version is unchanged", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-force-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex"],
    });

    // Version không đổi => findOutdated trả rỗng. Không force => no-op.
    const noForce = await updatePlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
    });
    assert.equal(noForce.changed, false);

    // Force => re-project bất kể version.
    const forced = await updatePlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      force: true,
    });
    assert.equal(forced.changed, true);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run build:cli && node --test cli/test/lifecycle.test.mjs`
Expected: FAIL ở assertion `forced.changed === true` (hiện trả `false` do return sớm).

- [ ] **Step 3: Sửa `updatePlugins`**

Tại `cli/src/lifecycle.mjs`, thay khối:

```javascript
  const outdated = await findOutdated({ root, target, registry });
  const applicable = outdated.updates.filter((item) =>
    selected.includes(item.id),
  );
  if (dryRun || applicable.length === 0) {
    return { status: "pass", changed: false, updates: applicable };
  }
```

bằng:

```javascript
  const outdated = await findOutdated({ root, target, registry });
  const applicable = outdated.updates.filter((item) =>
    selected.includes(item.id),
  );
  if (dryRun) {
    return { status: "pass", changed: false, updates: applicable };
  }
  // `--force` re-projects nội dung mới nhất kể cả khi version trùng (lúc đó
  // `applicable` rỗng); không force thì version trùng = không có gì để làm.
  if (applicable.length === 0 && !force) {
    return { status: "pass", changed: false, updates: applicable };
  }
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run build:cli && node --test cli/test/lifecycle.test.mjs`
Expected: PASS toàn bộ (gồm test mới và 2 test update cũ).

- [ ] **Step 5: Commit**

```bash
git add cli/src/lifecycle.mjs cli/test/lifecycle.test.mjs
git commit -m "fix(cli): make --force re-project on update when version unchanged"
```

---

### Task 2: Symlink write + fallback trong tầng transaction

**Files:**
- Modify: `cli/src/transaction.mjs` (imports, `planTransaction`, `applyTransaction`; thêm hằng `BUILD_DIR`, `DEVELOPER_MODE_GUIDANCE`)
- Test: `cli/test/transaction.test.mjs`

**Interfaces:**
- Consumes: `resolveInside(root, relativePath)`, `checksumText(content)` từ `./io.mjs`.
- Produces:
  - `planTransaction({ target, desiredFiles, lock, ownership, force, validateApplied, linkMode })` — mỗi action có thêm `link: boolean`; ownership file fully-managed có `link: true` khi `linkMode === "symlink"`.
  - `applyTransaction(plan, { symlinkImpl } = {})` — trả `{ status, written, warnings }`. `symlinkImpl` mặc định là `symlink` của `node:fs/promises` (test inject stub để ép fallback).
  - Export `BUILD_DIR = ".ai-engineering/build"`, `DEVELOPER_MODE_GUIDANCE` (string).

- [ ] **Step 1: Viết failing test (fallback copy)**

Tạo/thêm vào `cli/test/transaction.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, lstat, readlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  planTransaction,
  applyTransaction,
  BUILD_DIR,
} from "../dist/transaction.js";

test("symlink mode falls back to copy with a warning when symlink fails", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-tx-fb-"));
  try {
    const desiredFiles = new Map([[".agents/skills/x/SKILL.md", "hello"]]);
    const ownership = {
      schemaVersion: 2,
      files: {
        ".agents/skills/x/SKILL.md": { owners: ["app"], assetId: "x", checksum: "" },
      },
    };
    const plan = await planTransaction({
      target,
      desiredFiles,
      lock: { schemaVersion: 1, plugins: [{ id: "app", version: "1.0.0" }] },
      ownership,
      linkMode: "symlink",
    });

    const failingSymlink = async () => {
      const error = new Error("EPERM");
      error.code = "EPERM";
      throw error;
    };
    const result = await applyTransaction(plan, { symlinkImpl: failingSymlink });

    // Destination là file thường (copy), nội dung đúng, có cảnh báo.
    const dest = path.join(target, ".agents/skills/x/SKILL.md");
    assert.equal((await lstat(dest)).isSymbolicLink(), false);
    assert.equal(await readFile(dest, "utf8"), "hello");
    assert.ok(result.warnings.length >= 1);
    assert.match(result.warnings[0], /Developer Mode/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("symlink mode writes build file and links to it", async (t) => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-tx-ln-"));
  try {
    const desiredFiles = new Map([[".agents/skills/x/SKILL.md", "world"]]);
    const ownership = {
      schemaVersion: 2,
      files: {
        ".agents/skills/x/SKILL.md": { owners: ["app"], assetId: "x", checksum: "" },
      },
    };
    const plan = await planTransaction({
      target,
      desiredFiles,
      lock: { schemaVersion: 1, plugins: [{ id: "app", version: "1.0.0" }] },
      ownership,
      linkMode: "symlink",
    });

    let result;
    try {
      result = await applyTransaction(plan);
    } catch (error) {
      if (error.code === "EPERM" || error.code === "EACCES") {
        t.skip("symlink not permitted on this platform");
        return;
      }
      throw error;
    }

    const dest = path.join(target, ".agents/skills/x/SKILL.md");
    if (!(await lstat(dest)).isSymbolicLink()) {
      // Nền tảng âm thầm fallback (vd. Windows không devmode): chấp nhận.
      assert.ok(result.warnings.length >= 1);
      return;
    }
    const buildFile = path.join(target, BUILD_DIR, ".agents/skills/x/SKILL.md");
    assert.equal(await readFile(buildFile, "utf8"), "world");
    assert.equal(await readFile(dest, "utf8"), "world");
    assert.ok((await readlink(dest)).length > 0);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run build:cli && node --test cli/test/transaction.test.mjs`
Expected: FAIL — `BUILD_DIR` chưa export / `linkMode` chưa xử lý / `result.warnings` undefined.

- [ ] **Step 3: Sửa imports + thêm hằng số trong `cli/src/transaction.mjs`**

Đổi dòng import `node:fs/promises` (dòng 2) để thêm `symlink`:

```javascript
import { mkdir, readFile, rm, rmdir, symlink, writeFile } from "node:fs/promises";
```

Thêm ngay sau khối import (trước `readBytesIfExists`):

```javascript
export const BUILD_DIR = ".ai-engineering/build";

export const DEVELOPER_MODE_GUIDANCE =
  "Một số file đã được sao chép thay vì symlink vì không tạo được symlink.\n" +
  "Để dùng symlink (skills tự cập nhật khi build đổi): bật Windows Developer Mode\n" +
  "(Settings > Privacy & security > For developers > Developer Mode) hoặc chạy lại\n" +
  "với quyền admin. Sau khi đổi nội dung nguồn, chạy lại `aie update` để làm mới.";
```

- [ ] **Step 4: Đánh dấu `link` trên action + ownership trong `planTransaction`**

Trong `planTransaction`, thêm tham số `linkMode` vào destructuring object (cạnh `force`, `validateApplied`):

```javascript
export async function planTransaction({
  target,
  desiredFiles,
  lock,
  ownership,
  force = false,
  validateApplied,
  linkMode = "copy",
}) {
```

Trong vòng lặp build `actions`, sửa `actions.push(...)` (khối ~dòng 105-110) để gắn cờ `link`:

```javascript
    actions.push({
      action,
      relativePath,
      destination,
      content,
      link: linkMode === "symlink" && !mergeManaged,
    });
```

Trong khối build `files` ownership (~dòng 134-140), gắn `link` cho file fully-managed:

```javascript
  const files = {};
  for (const [relativePath, metadata] of Object.entries(ownership.files ?? {})) {
    const content = desiredFiles.get(relativePath);
    const linkable = linkMode === "symlink" && !metadata.mergeStrategy;
    files[relativePath] = {
      ...metadata,
      checksum: content === undefined ? metadata.checksum : checksumText(content),
      ...(linkable ? { link: true } : {}),
    };
  }
```

- [ ] **Step 5: Symlink/fallback trong `applyTransaction`**

Đổi chữ ký `applyTransaction` để nhận stub test:

```javascript
export async function applyTransaction(plan, { symlinkImpl = symlink } = {}) {
```

Thay vòng lặp ghi action (khối hiện tại dòng 196-203) bằng:

```javascript
    const warnings = [];
    let usedCopyFallback = false;
    for (const action of plan.actions) {
      if (action.action === "remove-managed") {
        await rm(action.destination, { force: true });
        continue;
      }
      await mkdir(path.dirname(action.destination), { recursive: true });
      if (!action.link) {
        await writeFile(action.destination, action.content, "utf8");
        continue;
      }
      const buildPath = resolveInside(
        plan.target,
        path.join(BUILD_DIR, action.relativePath),
      );
      await mkdir(path.dirname(buildPath), { recursive: true });
      await writeFile(buildPath, action.content, "utf8");
      // Xoá đích cũ (file thường hoặc symlink cũ) để tạo lại idempotent.
      await rm(action.destination, { force: true });
      try {
        const linkTarget = path.relative(
          path.dirname(action.destination),
          buildPath,
        );
        await symlinkImpl(linkTarget, action.destination, "file");
      } catch {
        usedCopyFallback = true;
        await writeFile(action.destination, action.content, "utf8");
      }
    }
    if (usedCopyFallback) {
      warnings.push(DEVELOPER_MODE_GUIDANCE);
    }
```

Sửa câu `return` cuối (dòng ~225-228) để kèm `warnings`:

```javascript
    return {
      status: "pass",
      written: plan.actions.map((action) => action.relativePath),
      warnings,
    };
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `npm run build:cli && node --test cli/test/transaction.test.mjs`
Expected: PASS (fallback test luôn chạy; link test chạy hoặc skip tuỳ nền tảng).

- [ ] **Step 7: Commit**

```bash
git add cli/src/transaction.mjs cli/test/transaction.test.mjs
git commit -m "feat(cli): symlink managed files into build dir with copy fallback"
```

---

### Task 3: Thread `linkMode` qua lifecycle + in cảnh báo ở CLI

**Files:**
- Modify: `cli/src/lifecycle.mjs` (`buildDesiredState` lock, `applyPreparedInstallation`, `installPlugins`, `updatePlugins` trả `warnings`)
- Modify: `cli/src/cli.mjs` (in `warnings` cho install + update/upgrade)
- Test: `cli/test/lifecycle.test.mjs`

**Interfaces:**
- Consumes: `planTransaction({ ..., linkMode })`, `applyTransaction(plan)` trả `{ warnings }` (Task 2).
- Produces:
  - `lock.linkMode = "symlink"` trong `buildDesiredState`.
  - `applyPreparedInstallation`/`installPlugins`/`updatePlugins` trả thêm `warnings: string[]`.

- [ ] **Step 1: Viết failing test (lock ghi linkMode + install trả warnings array)**

Thêm vào `cli/test/lifecycle.test.mjs`:

```javascript
test("install records linkMode symlink and returns warnings array", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-linkmode-"));
  try {
    const result = await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex"],
    });
    assert.ok(Array.isArray(result.warnings));

    const lock = JSON.parse(
      await readFile(path.join(target, ".ai-engineering/platform.lock"), "utf8"),
    );
    assert.equal(lock.linkMode, "symlink");
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run build:cli && node --test cli/test/lifecycle.test.mjs`
Expected: FAIL — `lock.linkMode` undefined và/hoặc `result.warnings` undefined.

- [ ] **Step 3: Ghi `linkMode` vào lock trong `buildDesiredState`**

Tại `cli/src/lifecycle.mjs`, trong object `lock` (khối ~dòng 247-258), thêm field `linkMode`:

```javascript
  const lock = {
    schemaVersion: 1,
    platformVersion: platform.product.version,
    scope: installContext.scope,
    linkMode: "symlink",
    providers: activeProviders,
    rootPlugins: rootPlugins ?? requested,
    optionalPlugins: graph.optionalPlugins,
    plugins: graph.pluginIds.map((id) => ({
      id,
      version: plugins.get(id).metadata.version,
    })),
  };
```

- [ ] **Step 4: Truyền `linkMode` vào planTransaction + trả `warnings` lên**

Sửa `applyPreparedInstallation` (khối ~dòng 313-334):

```javascript
export async function applyPreparedInstallation({
  prepared,
  context,
  force = false,
}) {
  const plan = await planTransaction({
    target: context.targetRoot,
    desiredFiles: prepared.desiredFiles,
    lock: prepared.lock,
    ownership: prepared.ownership,
    force,
    linkMode: prepared.lock.linkMode ?? "copy",
  });
  const applied = await applyTransaction(plan);
  await writeLifecycleState(context.targetRoot, prepared.lock);
  return {
    status: "pass",
    scope: context.scope,
    plugins: prepared.plugins,
    providers: prepared.providers,
    optionalPlugins: prepared.lock.optionalPlugins ?? [],
    warnings: applied.warnings ?? [],
  };
}
```

`installPlugins` đã `return applyPreparedInstallation(...)` nên `warnings` tự lan ra.

- [ ] **Step 5: `updatePlugins` lan `warnings`**

Trong `updatePlugins`, câu return cuối (`return { ...result, changed: true, updates: applicable };`) đã spread `result` từ `installPlugins`, nên `warnings` tự có. Đảm bảo nhánh "no-op" trả `warnings: []`:

```javascript
  if (applicable.length === 0 && !force) {
    return { status: "pass", changed: false, updates: applicable, warnings: [] };
  }
```

(Và nhánh `dryRun` thêm `warnings: []` cho nhất quán.)

- [ ] **Step 6: In cảnh báo ở CLI**

Tại `cli/src/cli.mjs`, sau khi install hoàn tất (nơi ghi kết quả install thành công) và sau update/upgrade (các khối ~dòng 759-773 và 819-832), in cảnh báo nếu có. Thêm helper gần đầu file:

```javascript
function writeWarnings(streams, warnings) {
  for (const warning of warnings ?? []) {
    streams.stderr.write(`warning: ${warning}\n`);
  }
}
```

Gọi `writeWarnings(streams, result.warnings)` ngay trước mỗi `return 0;` của nhánh install thành công và nhánh update/upgrade non-interactive.

- [ ] **Step 7: Chạy test để xác nhận PASS**

Run: `npm run build:cli && node --test cli/test/lifecycle.test.mjs`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add cli/src/lifecycle.mjs cli/src/cli.mjs cli/test/lifecycle.test.mjs
git commit -m "feat(cli): thread symlink linkMode through install and surface warnings"
```

---

### Task 4: `aie check` báo `linkMode` + verify link

**Files:**
- Modify: `cli/src/lifecycle.mjs` (`checkInstalled`)
- Test: `cli/test/lifecycle.test.mjs`

**Interfaces:**
- Consumes: `readPlatformState(target)` → `{ lock, ownership, installState }`.
- Produces: `checkInstalled({ target })` trả thêm `current.linkMode` và `links: { mode, broken: string[] }`.

- [ ] **Step 1: Viết failing test**

Thêm vào `cli/test/lifecycle.test.mjs`:

```javascript
test("check reports linkMode and link integrity", async () => {
  const target = await mkdtemp(path.join(os.tmpdir(), "ai-engineering-check-link-"));
  try {
    await installPlugins({
      root: repoRoot,
      target,
      pluginIds: ["application"],
      providers: ["codex"],
    });
    const result = await checkInstalled({ target });
    assert.equal(result.current.linkMode, "symlink");
    assert.ok(Array.isArray(result.links.broken));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
```

Đảm bảo `checkInstalled` nằm trong danh sách import của test (đã import sẵn nếu test cũ dùng; nếu chưa, thêm vào import từ `../src/lifecycle.mjs`). Lưu ý: test import từ `../src/lifecycle.mjs` hay `../dist`? Theo file hiện tại các hàm lifecycle import trực tiếp từ `../../cli/src/lifecycle.mjs` — dùng đúng đường dẫn import sẵn có trong file test.

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npm run build:cli && node --test cli/test/lifecycle.test.mjs`
Expected: FAIL — `result.current.linkMode` / `result.links` undefined.

- [ ] **Step 3: Thêm verify vào `checkInstalled`**

Thêm import ở đầu `cli/src/lifecycle.mjs` (gộp vào dòng import `node:fs/promises` hiện có `import { readFile, rm, stat } from "node:fs/promises";`):

```javascript
import { lstat, readFile, rm, stat } from "node:fs/promises";
```

Thay thân `checkInstalled` để tính `linkMode` + `links`:

```javascript
export async function checkInstalled({ target }) {
  const state = await readPlatformState(target);
  const lock = state.lock;
  const assets = collectInstalledAssets(state.ownership);
  const mcpServers = [];
  const linkMode = lock?.linkMode ?? "copy";
  const broken = [];
  if (linkMode === "symlink") {
    for (const [relativePath, metadata] of Object.entries(
      state.ownership?.files ?? {},
    )) {
      if (!metadata.link) continue;
      const destination = path.join(target, relativePath);
      const buildPath = path.join(target, ".ai-engineering/build", relativePath);
      try {
        const info = await lstat(destination);
        if (!info.isSymbolicLink()) continue; // file copy fallback — bỏ qua
        await stat(buildPath); // ném nếu build target mất
      } catch {
        broken.push(relativePath);
      }
    }
  }
  return {
    status: "pass",
    current: {
      state: lock ? "installed" : "not-installed",
      scope: lock?.scope ?? "project",
      linkMode,
      platformVersion: lock?.platformVersion,
      installState: state.installState?.status ?? (lock ? "unknown" : "none"),
    },
    links: { mode: linkMode, broken },
    plugins: {
      installed: lock?.plugins ?? [],
      roots: lock?.rootPlugins ?? [],
    },
    providers: lock?.providers ?? [],
    mcp: {
      count: mcpServers.length,
      servers: mcpServers,
      byProvider: {},
    },
    skills: {
      count: assets.skills.length,
      installed: assets.skills,
      byOwner: groupByOwner(assets.skills),
    },
    commands: {
      count: assets.commands.length,
      installed: assets.commands,
      byOwner: groupByOwner(assets.commands),
    },
    agents: {
      count: assets.agents.length,
      installed: assets.agents,
      byOwner: groupByOwner(assets.agents),
    },
    workflows: {
      count: assets.workflows.length,
      installed: assets.workflows,
      byOwner: groupByOwner(assets.workflows),
    },
  };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npm run build:cli && node --test cli/test/lifecycle.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cli/src/lifecycle.mjs cli/test/lifecycle.test.mjs
git commit -m "feat(cli): report linkMode and broken symlinks in check"
```

---

### Task 5: Regression toàn bộ + cập nhật tài liệu

**Files:**
- Verify: toàn bộ `cli/test/*.mjs`
- Modify (nếu cần): test nào assert file managed là file thường nhưng giờ là symlink trên Linux.
- Modify: `CLAUDE.md` (mục ngắn về chế độ symlink + folder build) nếu phù hợp; nếu không chắc, bỏ qua và báo.

**Interfaces:**
- Consumes: tất cả thay đổi Task 1-4.
- Produces: suite xanh; tài liệu phản ánh chế độ symlink mặc định.

- [ ] **Step 1: Chạy full suite**

Run: `npm test`
Expected: PASS toàn bộ. Nếu FAIL, đọc kỹ test lỗi — thường do test cũ giả định file managed là file thường. Sửa assertion sang đọc nội dung (theo link) thay vì kiểm tra kiểu file; KHÔNG nới lỏng kiểm tra nội dung.

- [ ] **Step 2: Chạy validate + doctor**

Run: `npm run validate && npm run doctor`
Expected: PASS (không phát sinh cảnh báo mới về file/thư mục mồ côi cho luồng install mặc định).

- [ ] **Step 3: Cập nhật tài liệu (nếu phù hợp)**

Nếu `CLAUDE.md` mục "State and ownership" cần phản ánh symlink + folder build, thêm 1-2 câu. Nếu không chắc thuộc phạm vi, ghi chú lại để hỏi người dùng thay vì tự sửa rộng.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(cli): verify symlink default across suite and update docs"
```

---

## Self-Review

- **Spec coverage:** Part 1 (`--force`) → Task 1. Part 2 (symlink + build folder + fallback + guidance) → Task 2 + 3. Part 3 (remove/update trong suốt + check) → Task 4 (check) + Task 5 (regression chứng minh remove/update không đổi). npm compatibility → folder build đặt trong target (Task 2 `BUILD_DIR`), khẳng định bằng test target-local.
- **Placeholder scan:** không có TBD/TODO; mọi step có code/lệnh cụ thể.
- **Type consistency:** `linkMode` (string "symlink"/"copy"), `link` (boolean) dùng nhất quán giữa `planTransaction`, ownership, `applyTransaction`, `checkInstalled`; `applyTransaction` trả `warnings: string[]` được `applyPreparedInstallation` đọc qua `applied.warnings`; `BUILD_DIR` export một lần ở transaction.mjs, dùng lại ở check qua literal cùng giá trị `".ai-engineering/build"`.
- **Lưu ý rủi ro:** đổi default sang symlink ảnh hưởng MỌI install — Task 5 Step 1 bắt buộc chạy full suite để bắt regression; fallback copy giữ Windows-không-devmode vẫn xanh.
