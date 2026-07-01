# CLI Wizard Flow (port kiến trúc tham chiếu) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay luồng CLI của `ai-engineering-platform` bằng một CLI pure-ESM gọn, phủ trọn wizard cho `install`/`uninstall`/`build`/`check` cho 4 provider (codex, claude, cursor, antigravity), tự thực thi đủ logic qua manifest phẳng, giữ managed-block cho `AGENTS.md`/`CLAUDE.md`.

**Architecture:** Nội dung canonical (`plugins/` + `core/`) giữ nguyên. Một loader (`plugins.mjs`) đọc `plugin.yaml` (JSON) và sinh một *model* provider-agnostic. Mỗi provider có `adapters/<p>/adapter.mjs` với hàm thuần `build(model,{scope}) → { files, instruction, mcp }`. `build.mjs` materialize model vào `build/<provider>/` (để inspect/CI + validation nhẹ). `install.mjs` gọi adapter trực tiếp, ghi file vào target theo scope, merge managed-block, ghi MCP, và lưu manifest phẳng `.ai-engineering/manifest.json`. `wizard.mjs` + `prompt.mjs` là step-machine + TUI tách khỏi I/O để test. `index.mjs` là entry: parse args → dispatch → wizard (TTY) hoặc non-interactive (`--yes`).

**Tech Stack:** Node.js 20+, pure ESM (`.mjs`), không tsc/build. Deps giữ lại: `js-yaml` (parse plugin.yaml), `@iarna/toml` (serialize codex `config.toml` + parse agent `.toml`). Test: `node --test`.

## Global Constraints

- Node.js >= 20; pure ESM, không bước build (`tsc`) — chạy `node cli/*.mjs` trực tiếp.
- `PROVIDERS = ["antigravity", "claude", "codex", "cursor"]` (thứ tự chuẩn, dùng làm nguồn chân lý).
- Không sửa nội dung dưới `plugins/` và `core/`.
- Giữ file dưới `adapters/<p>/`: `agents/*.toml`, `hooks.json`, `README.md`. Chỉ thay `projector.mjs` → `adapter.mjs`.
- Managed-block markers (verbatim): `<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->` và `<!-- AI-ENGINEERING:END AGENTS_BASELINE -->`. Baseline lấy từ `core/agents/AGENTS.baseline.md`; template file mới lấy từ `core/agents/AGENTS.template.md`.
- Chỉ đè vùng giữa marker trong `AGENTS.md`/`CLAUDE.md`; bảo toàn phần ngoài. Preserve BOM khi đọc-ghi.
- Manifest tại `<scope-root>/.ai-engineering/manifest.json`. Env `AIE_INSTALL_ROOT` override gốc scope (dùng cho test). `.ai-engineering/` đã trong `.gitignore`.
- Scope: `project` = `process.cwd()`, `global` = `os.homedir()`.
- Bin names giữ `ai-engineering` và `aie`, trỏ `cli/index.mjs`.
- Bộ lệnh: `install`, `uninstall`, `build`, `check`, `list`, `--help`, và menu tổng khi không tham số. KHÔNG có `init`/`doctor`/`upgrade`/`migrate`.
- User-facing text (help, wizard, báo cáo) viết tiếng Việt có dấu UTF-8.
- Dependency expansion tối thiểu: khi chọn plugin, tự kéo `dependencies.required` (đệ quy, có cycle guard). Đây KHÔNG phải resolver DAG cũ (không kiểm compat/ownership).

## Model & Interface tham chiếu (dùng xuyên suốt)

```
Model = {
  scope: "project" | "global",
  pluginIds: string[],                       // đã kéo deps, sort tăng dần
  plugins: [{ id, version }],
  skills: [{ id, sourceDir }],               // sourceDir: đường dẫn tương đối root tới thư mục chứa SKILL.md
  commands: [{ id, slug, description, version, intent, inputs, requiredSkills, steps, outputContract, outputSchema }],
  agents: [{ id, sourcePath, definition: { name, description, instructions } }],
  workflows: [{ id, sourcePath }],
  hooks: [{ id }],
  mcpServers: {},                            // v1: rỗng
}

Entry (một phần tử files[] adapter trả về):
  { path, content }        // ghi text
  { path, copyDir }        // copy đệ quy thư mục (copyDir tương đối root)

AdapterResult = {
  files: Entry[],
  instruction: { path } | null,              // file managed-block, path tương đối scope-root
  mcp: { path, format: "json"|"toml", rootKey } | null,
}

ManifestEntry = { provider, plugins:[id], scope, files:[rel], links:[rel], managed:[rel], mcp:[rel], installedAt }
```

---

### Task 1: `cli/lib/paths.mjs` — provider list + scope + đường dẫn

**Files:**
- Create: `cli/lib/paths.mjs`
- Test: `cli/test/paths.test.mjs`

**Interfaces:**
- Produces: `PROVIDERS: string[]`; `scopeRoot(scope): string`; `buildDir(root): string`; `manifestPath(scope): string`; `isProvider(name): boolean`.

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/paths.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { PROVIDERS, scopeRoot, isProvider, manifestPath } from "../lib/paths.mjs";

test("PROVIDERS liệt kê đủ 4 provider theo thứ tự chuẩn", () => {
  assert.deepEqual(PROVIDERS, ["antigravity", "claude", "codex", "cursor"]);
});

test("isProvider phân biệt provider hợp lệ", () => {
  assert.equal(isProvider("claude"), true);
  assert.equal(isProvider("nope"), false);
});

test("scopeRoot: global trả về home, project trả về cwd", () => {
  const prev = process.env.AIE_INSTALL_ROOT;
  delete process.env.AIE_INSTALL_ROOT;
  assert.equal(scopeRoot("global"), os.homedir());
  assert.equal(scopeRoot("project"), process.cwd());
  if (prev !== undefined) process.env.AIE_INSTALL_ROOT = prev;
});

test("scopeRoot: AIE_INSTALL_ROOT override mọi scope", () => {
  const prev = process.env.AIE_INSTALL_ROOT;
  process.env.AIE_INSTALL_ROOT = "/tmp/aie-test";
  assert.equal(scopeRoot("project"), "/tmp/aie-test");
  assert.equal(scopeRoot("global"), "/tmp/aie-test");
  if (prev === undefined) delete process.env.AIE_INSTALL_ROOT;
  else process.env.AIE_INSTALL_ROOT = prev;
});

test("manifestPath nằm trong .ai-engineering", () => {
  assert.match(manifestPath("project").replaceAll("\\", "/"), /\.ai-engineering\/manifest\.json$/);
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `node --test cli/test/paths.test.mjs`
Expected: FAIL — `Cannot find module '../lib/paths.mjs'`.

- [ ] **Step 3: Viết implementation tối thiểu**

```js
// cli/lib/paths.mjs
import os from "node:os";
import path from "node:path";

export const PROVIDERS = ["antigravity", "claude", "codex", "cursor"];

export function isProvider(name) {
  return PROVIDERS.includes(name);
}

export function scopeRoot(scope = "project") {
  if (process.env.AIE_INSTALL_ROOT) return process.env.AIE_INSTALL_ROOT;
  return scope === "global" ? os.homedir() : process.cwd();
}

export function buildDir(root) {
  return path.join(root, "build");
}

export function manifestPath(scope = "project") {
  return path.join(scopeRoot(scope), ".ai-engineering", "manifest.json");
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `node --test cli/test/paths.test.mjs`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/paths.mjs cli/test/paths.test.mjs
git commit -m "feat(cli): add provider list and scope path helpers"
```

---

### Task 2: `cli/lib/plugins.mjs` — nạp plugin + validate + kéo deps

**Files:**
- Create: `cli/lib/plugins.mjs`
- Test: `cli/test/plugins.test.mjs`

**Interfaces:**
- Consumes: nội dung thật dưới `plugins/*/plugin.yaml`.
- Produces:
  - `loadPlugins(root): Map<id, manifest>` — đọc mọi `plugins/*/plugin.yaml` (parse bằng js-yaml, chấp nhận cả JSON).
  - `knownPluginIds(root): string[]` — sort.
  - `resolvePluginIds(sel, root): string[]` — validate id tồn tại; `sel==="all"`/rỗng → tất cả.
  - `expandDependencies(ids, plugins): string[]` — kéo `dependencies.required` đệ quy, cycle guard, sort.
  - `validatePlugins(plugins, root): string[]` — trả mảng lỗi (rỗng = hợp lệ).

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/plugins.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadPlugins, knownPluginIds, resolvePluginIds, expandDependencies, validatePlugins,
} from "../lib/plugins.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("loadPlugins đọc được plugin application với version", () => {
  const plugins = loadPlugins(ROOT);
  assert.ok(plugins.has("application"));
  assert.equal(plugins.get("application").metadata.version, "1.0.0");
});

test("knownPluginIds gồm application và đã sort", () => {
  const ids = knownPluginIds(ROOT);
  assert.ok(ids.includes("application"));
  assert.deepEqual(ids, [...ids].sort());
});

test("resolvePluginIds báo lỗi id không tồn tại", () => {
  assert.throws(() => resolvePluginIds(["khong-co"], ROOT), /khong-co/);
});

test("expandDependencies kéo required deps của application", () => {
  const plugins = loadPlugins(ROOT);
  const out = expandDependencies(["application"], plugins);
  for (const dep of ["architecture", "quality", "security", "data"]) {
    assert.ok(out.includes(dep), `thiếu dep ${dep}`);
  }
  assert.ok(out.includes("application"));
});

test("validatePlugins trả rỗng cho repo hợp lệ", () => {
  const plugins = loadPlugins(ROOT);
  assert.deepEqual(validatePlugins(plugins, ROOT), []);
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/plugins.test.mjs`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// cli/lib/plugins.mjs
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const PLUGINS_DIR = "plugins";

function readManifest(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  return yaml.load(text);
}

export function loadPlugins(root) {
  const dir = path.join(root, PLUGINS_DIR);
  const plugins = new Map();
  for (const name of fs.readdirSync(dir)) {
    const manifestFile = path.join(dir, name, "plugin.yaml");
    if (!fs.existsSync(manifestFile)) continue;
    const manifest = readManifest(manifestFile);
    const id = manifest?.metadata?.id;
    if (id) plugins.set(id, manifest);
  }
  return plugins;
}

export function knownPluginIds(root) {
  return [...loadPlugins(root).keys()].sort();
}

export function resolvePluginIds(sel, root) {
  const all = knownPluginIds(root);
  if (!sel || sel === "all" || (Array.isArray(sel) && sel.length === 0)) return all;
  const ids = Array.isArray(sel) ? sel : [sel];
  const bad = ids.filter((id) => !all.includes(id));
  if (bad.length) throw new Error(`Plugin không tồn tại: ${bad.join(", ")}`);
  return ids;
}

export function expandDependencies(ids, plugins) {
  const out = new Set();
  const visiting = new Set();
  const visit = (id) => {
    if (out.has(id)) return;
    if (visiting.has(id)) throw new Error(`Vòng lặp phụ thuộc tại: ${id}`);
    visiting.add(id);
    const required = plugins.get(id)?.dependencies?.required ?? [];
    for (const dep of required) if (plugins.has(dep)) visit(dep);
    visiting.delete(id);
    out.add(id);
  };
  for (const id of ids) visit(id);
  return [...out].sort();
}

export function validatePlugins(plugins, root) {
  const errors = [];
  const seen = new Set();
  for (const [id, m] of plugins) {
    if (!m?.metadata?.id) errors.push(`${id}: thiếu metadata.id`);
    if (seen.has(id)) errors.push(`${id}: trùng id`);
    seen.add(id);
    const commands = m?.assets?.commands;
    if (Array.isArray(commands)) {
      for (const rel of commands) {
        const file = path.join(root, PLUGINS_DIR, id, rel);
        if (!fs.existsSync(file)) errors.push(`${id}: thiếu command ${rel}`);
      }
    }
    for (const skill of m?.skills ?? []) {
      const file = path.join(root, PLUGINS_DIR, id, skill.path);
      if (!fs.existsSync(file)) errors.push(`${id}: thiếu skill ${skill.path}`);
    }
  }
  return errors;
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/plugins.test.mjs`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/plugins.mjs cli/test/plugins.test.mjs
git commit -m "feat(cli): add plugin loader, dependency expansion and validation"
```

---

### Task 3: `cli/lib/plugins.mjs` — `loadModel()` sinh model provider-agnostic

**Files:**
- Modify: `cli/lib/plugins.mjs`
- Test: `cli/test/model.test.mjs`

**Interfaces:**
- Consumes: `loadPlugins`, `expandDependencies` (Task 2); command `.md` frontmatter + sections; agent `.toml` dưới `adapters/codex/agents/`.
- Produces: `loadModel({ root, pluginIds, scope }): Model` (shape ở mục "Model & Interface tham chiếu"). Kèm helper `parseCommandMarkdown(text): {frontmatter, intent, inputs, requiredSkills, steps, outputContract}` và `parseAgentToml(text): {name, description, instructions}`.

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/model.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, parseCommandMarkdown } from "../lib/plugins.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("parseCommandMarkdown tách frontmatter và section", () => {
  const md = [
    "---", "id: x.y", "slug: plan-feature", "description: Desc", "---", "",
    "# Plan", "", "## Intent", "", "Do the thing.", "",
    "## Inputs", "", "- a", "- b", "",
    "## Required Skills", "", "- api-contract-design", "",
    "## Steps", "", "1. one", "2. two", "",
    "## Output Contract", "", "- ctx", "",
  ].join("\n");
  const parsed = parseCommandMarkdown(md);
  assert.equal(parsed.frontmatter.slug, "plan-feature");
  assert.equal(parsed.intent, "Do the thing.");
  assert.deepEqual(parsed.inputs, ["a", "b"]);
  assert.deepEqual(parsed.requiredSkills, ["api-contract-design"]);
  assert.deepEqual(parsed.steps, ["one", "two"]);
  assert.deepEqual(parsed.outputContract, ["ctx"]);
});

test("loadModel dựng model cho application (đã kéo deps)", () => {
  const model = loadModel({ root: ROOT, pluginIds: ["application"], scope: "project" });
  assert.ok(model.pluginIds.includes("architecture"));
  assert.ok(model.skills.some((s) => s.id === "application.java_implement"));
  assert.ok(model.commands.some((c) => c.slug === "plan-feature"));
  const plan = model.commands.find((c) => c.slug === "plan-feature");
  assert.ok(plan.steps.length >= 3);
  assert.ok(model.agents.some((a) => a.id === "java-implement"));
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/model.test.mjs`
Expected: FAIL — `loadModel`/`parseCommandMarkdown` chưa export.

- [ ] **Step 3: Viết implementation (thêm vào `cli/lib/plugins.mjs`)**

```js
// ==== thêm import ở đầu file ====
import toml from "@iarna/toml";

// ==== parser command markdown ====
function stripFrontmatter(text) {
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: text };
  return { frontmatter: yaml.load(m[1]) ?? {}, body: m[2] };
}

function sectionBlock(body, heading) {
  const re = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, "m");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function bulletList(block) {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").trim());
}

function numberedList(block) {
  return block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim());
}

export function parseCommandMarkdown(text) {
  const { frontmatter, body } = stripFrontmatter(text);
  return {
    frontmatter,
    intent: sectionBlock(body, "Intent"),
    inputs: bulletList(sectionBlock(body, "Inputs")),
    requiredSkills: bulletList(sectionBlock(body, "Required Skills")),
    steps: numberedList(sectionBlock(body, "Steps")),
    outputContract: bulletList(sectionBlock(body, "Output Contract")),
  };
}

export function parseAgentToml(text) {
  let data = {};
  try { data = toml.parse(text); } catch { data = {}; }
  return {
    name: data.name ?? "",
    description: data.description ?? "",
    instructions: (data.developer_instructions ?? "").trim(),
  };
}

// ==== loadModel ====
export function loadModel({ root, pluginIds, scope = "project" }) {
  const plugins = loadPlugins(root);
  const ids = expandDependencies(resolvePluginIds(pluginIds, root), plugins);

  const skills = [];
  const commands = [];
  const agents = [];
  const workflows = [];
  const hooks = [];

  for (const id of ids) {
    const m = plugins.get(id);
    const base = path.join(root, PLUGINS_DIR, id);

    for (const skill of m?.skills ?? []) {
      const dir = path.dirname(skill.path); // e.g. skills/java-implement
      skills.push({
        id: skill.id,
        sourceDir: path.posix.join(PLUGINS_DIR, id, dir.replaceAll("\\", "/")),
      });
    }

    for (const rel of m?.assets?.commands ?? []) {
      const file = path.join(base, rel);
      if (!fs.existsSync(file)) continue;
      const parsed = parseCommandMarkdown(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
      const fm = parsed.frontmatter;
      commands.push({
        id: fm.id,
        slug: fm.slug,
        description: fm.description ?? "",
        version: fm.version ?? "",
        intent: parsed.intent,
        inputs: parsed.inputs,
        requiredSkills: parsed.requiredSkills,
        steps: parsed.steps,
        outputContract: parsed.outputContract,
        outputSchema: fm.outputSchema ?? "",
      });
    }

    for (const agentId of m?.assets?.agents ?? []) {
      const sourcePath = path.posix.join("adapters", "codex", "agents", `${agentId}.toml`);
      const file = path.join(root, sourcePath);
      const definition = fs.existsSync(file)
        ? parseAgentToml(fs.readFileSync(file, "utf8").replace(/^﻿/, ""))
        : { name: agentId, description: "", instructions: "" };
      agents.push({ id: agentId, sourcePath, definition });
    }

    for (const rel of m?.assets?.workflows ?? []) {
      const wfId = path.basename(rel, path.extname(rel));
      workflows.push({ id: wfId, sourcePath: path.posix.join(PLUGINS_DIR, id, rel.replaceAll("\\", "/")) });
    }

    for (const hookId of m?.assets?.hooks ?? []) hooks.push({ id: hookId });
  }

  commands.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  skills.sort((a, b) => a.id.localeCompare(b.id));
  agents.sort((a, b) => a.id.localeCompare(b.id));

  return {
    scope,
    pluginIds: ids,
    plugins: ids.map((id) => ({ id, version: plugins.get(id)?.metadata?.version ?? "" })),
    skills,
    commands,
    agents,
    workflows,
    hooks,
    mcpServers: {},
  };
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/model.test.mjs`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/plugins.mjs cli/test/model.test.mjs
git commit -m "feat(cli): build provider-neutral model from plugin content"
```

---

### Task 4: `cli/lib/managed-block.mjs` — merge/gỡ khối AGENTS.md/CLAUDE.md

**Files:**
- Create: `cli/lib/managed-block.mjs`
- Test: `cli/test/managed-block.test.mjs`

**Interfaces:**
- Produces:
  - `mergeManagedBlock(existing, baseline, relativePath): string` (port từ `cli/src/init.mjs`).
  - `removeManagedBlock(existing): string` — gỡ khối; nếu còn lại chỉ khoảng trắng trả `""`.
  - `hasOnlyWhitespace(text): boolean`.

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/managed-block.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeManagedBlock, removeManagedBlock } from "../lib/managed-block.mjs";

const BEGIN = "<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->";
const END = "<!-- AI-ENGINEERING:END AGENTS_BASELINE -->";
const baseline = `${BEGIN}\nNEW\n${END}`;

test("merge chèn baseline vào file chưa có khối, giữ nội dung cũ", () => {
  const out = mergeManagedBlock("User content.", baseline, "AGENTS.md");
  assert.match(out, /User content\./);
  assert.match(out, /NEW/);
});

test("merge thay đúng vùng giữa marker, bảo toàn ngoài khối", () => {
  const existing = `TOP\n${BEGIN}\nOLD\n${END}\nBOTTOM`;
  const out = mergeManagedBlock(existing, baseline, "AGENTS.md");
  assert.match(out, /TOP/);
  assert.match(out, /BOTTOM/);
  assert.match(out, /NEW/);
  assert.doesNotMatch(out, /OLD/);
});

test("merge ném lỗi khi marker hỏng", () => {
  assert.throws(() => mergeManagedBlock(`${END}\n${BEGIN}`, baseline, "AGENTS.md"), /invalid/);
});

test("remove gỡ khối, giữ nội dung ngoài", () => {
  const existing = `TOP\n${BEGIN}\nOLD\n${END}\nBOTTOM`;
  const out = removeManagedBlock(existing);
  assert.match(out, /TOP/);
  assert.match(out, /BOTTOM/);
  assert.doesNotMatch(out, /OLD/);
});

test("remove trả rỗng khi file chỉ còn khối managed", () => {
  const existing = `${BEGIN}\nOLD\n${END}\n`;
  assert.equal(removeManagedBlock(existing).trim(), "");
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/managed-block.test.mjs`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// cli/lib/managed-block.mjs
export const BEGIN = "<!-- AI-ENGINEERING:BEGIN AGENTS_BASELINE -->";
export const END = "<!-- AI-ENGINEERING:END AGENTS_BASELINE -->";

export function mergeManagedBlock(existing, baseline, relativePath) {
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (start === -1 && end === -1) {
    return `${existing.trimEnd()}\n\n${baseline.trim()}\n`;
  }
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`${relativePath} contains an invalid AI Engineering managed block`);
  }
  return `${existing.slice(0, start)}${baseline.trim()}${existing.slice(end + END.length)}`;
}

export function removeManagedBlock(existing) {
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (start === -1 || end === -1 || end < start) return existing;
  const out = `${existing.slice(0, start)}${existing.slice(end + END.length)}`;
  return out.trim() === "" ? "" : out;
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/managed-block.test.mjs`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/managed-block.mjs cli/test/managed-block.test.mjs
git commit -m "feat(cli): add managed-block merge and removal for instruction files"
```

---

### Task 5: `cli/lib/write.mjs` — ghi entry, symlink/copy fallback, prune

**Files:**
- Create: `cli/lib/write.mjs`
- Test: `cli/test/write.test.mjs`

**Interfaces:**
- Consumes: `Entry` (`{path,content}` | `{path,copyDir}`).
- Produces:
  - `writeEntry(baseDir, entry, { root }): { file?: string, link?: string }` — ghi vào `baseDir`; `copyDir` thử symlink, thất bại thì copy đệ quy (trả `link` nếu symlink, `file` nếu copy/content). Trả path tương đối `baseDir`.
  - `removeFileAndPruneEmpty(absPath, root): void` — xoá file/symlink rồi xoá các thư mục rỗng lên tới `root`.
  - `readIfExists(absPath): string|null`.

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/write.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeEntry, removeFileAndPruneEmpty, readIfExists } from "../lib/write.mjs";

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aie-write-"));
}

test("writeEntry ghi content ra đúng path tương đối", () => {
  const dir = tmp();
  const res = writeEntry(dir, { path: "a/b.txt", content: "hi" }, { root: dir });
  assert.equal(res.file, "a/b.txt");
  assert.equal(fs.readFileSync(path.join(dir, "a/b.txt"), "utf8"), "hi");
});

test("writeEntry copyDir sao chép cây thư mục (kể cả khi symlink không được)", () => {
  const dir = tmp();
  const src = path.join(dir, "src");
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(src, "f.txt"), "x");
  const res = writeEntry(dir, { path: "dst", copyDir: "src" }, { root: dir });
  const dst = path.join(dir, "dst");
  assert.ok(fs.existsSync(dst));
  assert.ok(res.file === "dst" || res.link === "dst");
  // Nội dung tồn tại dù là symlink hay copy
  assert.equal(fs.readFileSync(path.join(dst, "f.txt"), "utf8"), "x");
});

test("removeFileAndPruneEmpty xoá file và thư mục rỗng", () => {
  const dir = tmp();
  const f = path.join(dir, "x/y/z.txt");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, "1");
  removeFileAndPruneEmpty(f, dir);
  assert.equal(fs.existsSync(f), false);
  assert.equal(fs.existsSync(path.join(dir, "x")), false);
});

test("readIfExists trả null khi thiếu file", () => {
  assert.equal(readIfExists(path.join(tmp(), "none")), null);
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/write.test.mjs`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// cli/lib/write.mjs
import fs from "node:fs";
import path from "node:path";

export function readIfExists(absPath) {
  try {
    return fs.readFileSync(absPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function copyDirRec(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRec(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function writeEntry(baseDir, entry, { root }) {
  const dest = path.join(baseDir, entry.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (typeof entry.content === "string") {
    fs.writeFileSync(dest, entry.content, "utf8");
    return { file: entry.path };
  }
  // copyDir: thử symlink trước, fallback copy
  const src = path.isAbsolute(entry.copyDir) ? entry.copyDir : path.join(root, entry.copyDir);
  fs.rmSync(dest, { recursive: true, force: true });
  try {
    fs.symlinkSync(path.resolve(src), dest, "junction");
    return { link: entry.path };
  } catch {
    copyDirRec(src, dest);
    return { file: entry.path };
  }
}

export function removeFileAndPruneEmpty(absPath, root) {
  try {
    fs.rmSync(absPath, { recursive: true, force: true });
  } catch { /* bỏ qua */ }
  let dir = path.dirname(absPath);
  const rootResolved = path.resolve(root);
  while (path.resolve(dir).startsWith(rootResolved) && path.resolve(dir) !== rootResolved) {
    try {
      if (fs.readdirSync(dir).length > 0) break;
      fs.rmdirSync(dir);
    } catch { break; }
    dir = path.dirname(dir);
  }
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/write.test.mjs`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/write.mjs cli/test/write.test.mjs
git commit -m "feat(cli): add file writer with symlink fallback and empty-dir pruning"
```

---

### Task 6: `adapters/<p>/adapter.mjs` — 4 adapter thuần (build model → files)

**Files:**
- Create: `adapters/_shared/lib.mjs`
- Create: `adapters/claude/adapter.mjs`
- Create: `adapters/codex/adapter.mjs`
- Create: `adapters/cursor/adapter.mjs`
- Create: `adapters/antigravity/adapter.mjs`
- Test: `cli/test/adapters.test.mjs`

**Interfaces:**
- Consumes: `Model` (Task 3).
- Produces: mỗi module `export default { name, describe, build(model, { scope }) → AdapterResult }`. `AdapterResult = { files, instruction, mcp }` (mục "Model & Interface tham chiếu"). Đường dẫn đích giữ đúng như `projector.mjs` cũ (đã backup).

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/adapters.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel } from "../lib/plugins.mjs";
import claude from "../../adapters/claude/adapter.mjs";
import codex from "../../adapters/codex/adapter.mjs";
import cursor from "../../adapters/cursor/adapter.mjs";
import antigravity from "../../adapters/antigravity/adapter.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const model = () => loadModel({ root: ROOT, pluginIds: ["application"], scope: "project" });

test("claude: skill copyDir + command render + instruction CLAUDE.md", () => {
  const out = claude.build(model(), { scope: "project" });
  assert.ok(out.files.some((f) => f.path.startsWith(".claude/skills/") && f.copyDir));
  assert.ok(out.files.some((f) => f.path.startsWith(".claude/commands/") && typeof f.content === "string"));
  assert.equal(out.instruction.path, "CLAUDE.md");
  assert.equal(out.mcp.path, ".mcp.json");
});

test("codex: skill vào .agents/skills, agent .toml copy, AGENTS.md instruction", () => {
  const out = codex.build(model(), { scope: "project" });
  assert.ok(out.files.some((f) => f.path.startsWith(".agents/skills/") && f.copyDir));
  assert.ok(out.files.some((f) => f.path.startsWith(".codex/agents/") && f.path.endsWith(".toml")));
  assert.ok(out.files.some((f) => f.path === ".codex/workflows/commands.md"));
  assert.equal(out.instruction.path, "AGENTS.md");
  assert.equal(out.mcp.format, "toml");
});

test("cursor: rules .mdc, không có instruction ở global", () => {
  const proj = cursor.build(model(), { scope: "project" });
  assert.ok(proj.files.some((f) => f.path.startsWith(".cursor/rules/") && f.path.endsWith(".mdc")));
  assert.equal(proj.instruction.path, "AGENTS.md");
  const glob = cursor.build(loadModel({ root: ROOT, pluginIds: ["application"], scope: "global" }), { scope: "global" });
  assert.equal(glob.instruction, null);
});

test("antigravity: skills/ + commands/ + AGENTS.md instruction", () => {
  const out = antigravity.build(model(), { scope: "project" });
  assert.ok(out.files.some((f) => f.path.startsWith("skills/") && f.copyDir));
  assert.ok(out.files.some((f) => f.path.startsWith("commands/") && f.path.endsWith(".md")));
  assert.equal(out.instruction.path, "AGENTS.md");
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/adapters.test.mjs`
Expected: FAIL — adapter modules chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// adapters/_shared/lib.mjs
export function commandBodyFull(command) {
  const skills = command.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = command.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = command.outputContract.map((s) => `- ${s}`).join("\n");
  const schema = command.outputSchema ? `\n## Output Schema\n\n- ${command.outputSchema}\n` : "";
  return { skills, steps, out, schema };
}

export function agentBody(agent) {
  const d = agent.definition ?? {};
  const instructions = d.instructions || `Apply the ${agent.id} skill.`;
  return `---\nname: ${d.name || agent.id}\ndescription: ${d.description || ""}\n---\n\n${instructions}\n`;
}

export function jsonFile(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function skillEntries(model, destPrefix) {
  return model.skills.map((s) => ({ path: `${destPrefix}/${s.id}`, copyDir: s.sourceDir }));
}

export function workflowEntries(model) {
  return model.workflows.map((w) => ({
    path: `.ai-engineering/workflows/definitions/${w.id}.yaml`,
    copyDir: undefined,
    // workflow là file đơn, dùng copyFile thông qua copyDir cha? => xử lý như file copy riêng
    sourceFile: w.sourcePath,
  }));
}
```

> Lưu ý: workflow là **file** đơn, không phải thư mục. Để đơn giản, adapter phát ra entry `{ path, copyDir }` chỉ cho skill (thư mục). Với workflow/agent-toml (file), phát ra entry `{ path, content }` bằng cách đọc file nguồn ngay trong adapter (đồng bộ) — xem dùng `fs.readFileSync` bên dưới. Bỏ `workflowEntries` ở trên; dùng bản đọc file trực tiếp.

```js
// adapters/_shared/lib.mjs  (bản dùng thật — thay cho ghi chú trên)
import fs from "node:fs";
import path from "node:path";

export function readSource(root, relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}
```

```js
// adapters/claude/adapter.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agentBody, jsonFile } from "../_shared/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function commandBody(c) {
  const skills = c.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = c.outputContract.map((s) => `- ${s}`).join("\n");
  const schema = c.outputSchema ? `\n## Output Schema\n\n- ${c.outputSchema}\n` : "";
  return `---\ndescription: ${c.description}\n---\n\n# ${c.id} (${c.slug})\n\n## Intent\n\n${c.intent}\n\n## Required Skills\n\n${skills}\n\n## Steps\n\n${steps}\n\n## Output Contract\n\n${out}\n${schema}`;
}

export default {
  name: "claude",
  describe: "Claude Code",
  build(model, { scope }) {
    const files = [];
    for (const s of model.skills) files.push({ path: `.claude/skills/${s.id}`, copyDir: s.sourceDir });
    for (const a of model.agents) files.push({ path: `.claude/agents/${a.id}.md`, content: agentBody(a) });
    for (const c of model.commands) files.push({ path: `.claude/commands/${c.slug}.md`, content: commandBody(c) });
    if (scope === "project") {
      files.push({
        path: ".claude-plugin/plugin.json",
        content: jsonFile({
          apiVersion: "ai-engineering.dev/v1alpha1",
          kind: "ProviderProjection",
          provider: "claude",
          plugins: model.plugins,
          commands: model.commands.map((c) => ({ id: c.id, slug: c.slug })),
        }),
      });
    }
    return {
      files,
      instruction: { path: scope === "global" ? ".claude/CLAUDE.md" : "CLAUDE.md" },
      mcp: { path: scope === "global" ? ".claude.json" : ".mcp.json", format: "json", rootKey: "mcpServers" },
    };
  },
};
```

```js
// adapters/codex/adapter.mjs
import { agentBody, jsonFile, readSource } from "../_shared/lib.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function commandBody(c) {
  const inputs = c.inputs.map((s) => `- ${s}`).join("\n");
  const skills = c.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = c.outputContract.map((s) => `- ${s}`).join("\n");
  const schema = c.outputSchema ? `\n## Output Schema\n\n- ${c.outputSchema}\n` : "";
  return `# ${c.id} (${c.slug})\n\n${c.description}\n\n## Inputs\n\n${inputs}\n\n## Intent\n\n${c.intent}\n\n## Required Skills\n\n${skills}\n\n## Steps\n\n${steps}\n\n## Output Contract\n\n${out}\n${schema}`;
}

function catalog(commands) {
  const index = commands.map((c) => `- \`${c.slug}\` / \`${c.id}\`: ${c.description}`).join("\n");
  const bodies = commands.map(commandBody).join("\n\n");
  return `# Codex Command Catalog\n\nUse this catalog when the user asks for an installed AI Engineering command,\nflow, workflow, or capability entry point. Prefer the matching command file\nunder \`.codex/workflows/commands/<slug>.md\` for the full contract, then load\nthe required skills listed there.\n\n## Index\n\n${index}\n\n## Commands\n\n${bodies}\n`;
}

export default {
  name: "codex",
  describe: "Codex",
  build(model, { scope }) {
    const files = [];
    for (const s of model.skills) files.push({ path: `.agents/skills/${s.id}`, copyDir: s.sourceDir });
    for (const a of model.agents) files.push({ path: `.codex/agents/${a.id}.toml`, content: readSource(ROOT, a.sourcePath) });
    files.push({
      path: ".codex/agents/openai.yaml",
      content: jsonFile({
        apiVersion: "ai-engineering.dev/v1alpha1",
        kind: "ProviderProjection",
        provider: "codex",
        plugins: model.plugins,
        skills: model.skills.map((s) => s.id),
        agents: model.agents.map((a) => a.id),
        hooks: model.hooks.map((h) => h.id),
        commands: model.commands.map((c) => ({ id: c.id, slug: c.slug })),
      }),
    });
    files.push({ path: ".codex/workflows/commands.md", content: catalog(model.commands) });
    for (const c of model.commands) files.push({ path: `.codex/workflows/commands/${c.slug}.md`, content: commandBody(c) });
    return {
      files,
      instruction: { path: scope === "global" ? ".codex/AGENTS.md" : "AGENTS.md" },
      mcp: { path: ".codex/config.toml", format: "toml", rootKey: "mcp_servers" },
    };
  },
};
```

```js
// adapters/cursor/adapter.mjs
import { jsonFile } from "../_shared/lib.mjs";

function ruleBody(c) {
  const skills = c.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = c.outputContract.map((s) => `- ${s}`).join("\n");
  return `---\ndescription: ${c.description}\nalwaysApply: false\n---\n\n# ${c.id} (${c.slug})\n\n## Intent\n\n${c.intent}\n\n## Required Skills\n\n${skills}\n\n## Steps\n\n${steps}\n\n## Output Contract\n\n${out}\n`;
}

export default {
  name: "cursor",
  describe: "Cursor",
  build(model, { scope }) {
    if (scope === "global") {
      return { files: [], instruction: null, mcp: { path: ".cursor/mcp.json", format: "json", rootKey: "mcpServers" } };
    }
    const files = [];
    files.push({
      path: ".cursor/rules/provider.json",
      content: jsonFile({
        apiVersion: "ai-engineering.dev/v1alpha1",
        kind: "ProviderProjection",
        provider: "cursor",
        plugins: model.plugins,
        commands: model.commands.map((c) => ({ id: c.id, slug: c.slug })),
      }),
    });
    for (const s of model.skills) files.push({ path: `.cursor/skills/${s.id}`, copyDir: s.sourceDir });
    for (const c of model.commands) files.push({ path: `.cursor/rules/${c.slug}.mdc`, content: ruleBody(c) });
    return {
      files,
      instruction: { path: "AGENTS.md" },
      mcp: { path: ".cursor/mcp.json", format: "json", rootKey: "mcpServers" },
    };
  },
};
```

```js
// adapters/antigravity/adapter.mjs
import { agentBody, jsonFile } from "../_shared/lib.mjs";

function commandBody(c) {
  const skills = c.requiredSkills.map((s) => `- ${s}`).join("\n");
  const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const out = c.outputContract.map((s) => `- ${s}`).join("\n");
  return `# ${c.id} (${c.slug})\n\n## Intent\n\n${c.intent}\n\n## Required Skills\n\n${skills}\n\n## Steps\n\n${steps}\n\n## Output Contract\n\n${out}\n`;
}

export default {
  name: "antigravity",
  describe: "Google Antigravity",
  build(model, { scope }) {
    const manifest = {
      apiVersion: "ai-engineering.dev/v1alpha1",
      kind: "ProviderProjection",
      provider: "antigravity",
      plugins: model.plugins,
      skills: model.skills.map((s) => s.id),
      commands: model.commands.map((c) => ({ id: c.id, slug: c.slug })),
      agents: model.agents.map((a) => a.id),
      hooks: model.hooks.map((h) => h.id),
    };
    const files = [];
    for (const s of model.skills) files.push({ path: `skills/${s.id}`, copyDir: s.sourceDir });
    for (const c of model.commands) files.push({ path: `commands/${c.slug}.md`, content: commandBody(c) });
    for (const a of model.agents) files.push({ path: `agents/${a.id}.md`, content: agentBody(a) });
    files.push({ path: "antigravity-plugin.json", content: jsonFile(manifest) });
    files.push({ path: "rules/provider.json", content: jsonFile(manifest) });
    return {
      files,
      instruction: { path: scope === "global" ? ".antigravity/AGENTS.md" : "AGENTS.md" },
      mcp: { path: "mcp/mcp.json", format: "json", rootKey: "mcpServers" },
    };
  },
};
```

> `_shared/lib.mjs` chỉ giữ bản có `readSource` + `agentBody` + `jsonFile` (bỏ đoạn ghi chú `skillEntries`/`workflowEntries` — không dùng). Workflow file đơn: nếu muốn phát ra, đọc bằng `readSource` như agent `.toml`; v1 bỏ qua workflow trong đầu ra provider (giữ đúng phạm vi test hiện có).

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/adapters.test.mjs`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add adapters/_shared/lib.mjs adapters/claude/adapter.mjs adapters/codex/adapter.mjs adapters/cursor/adapter.mjs adapters/antigravity/adapter.mjs cli/test/adapters.test.mjs
git commit -m "feat(adapters): add pure build adapters for 4 providers"
```

---

### Task 7: `cli/build.mjs` — materialize build/<provider>/ + validation gate

**Files:**
- Create: `cli/build.mjs`
- Test: `cli/test/build.test.mjs`

**Interfaces:**
- Consumes: `loadModel` (Task 3), 4 adapter (Task 6), `writeEntry` (Task 5), `validatePlugins`/`loadPlugins` (Task 2), `PROVIDERS` (Task 1).
- Produces:
  - `ADAPTERS: Record<name, adapter>` (map tĩnh 4 adapter).
  - `buildProvider({ root, provider, pluginIds, scope, outDir }): { provider, count }` — materialize `files` của adapter vào `outDir/<provider>/`.
  - `runBuild({ root, providers, pluginIds }): { results, errors }` — chạy validation nhẹ trước; lỗi → throw. Materialize vào `build/<provider>/`.

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/build.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBuild, ADAPTERS } from "../build.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("ADAPTERS có đủ 4 provider", () => {
  assert.deepEqual(Object.keys(ADAPTERS).sort(), ["antigravity", "claude", "codex", "cursor"]);
});

test("runBuild materialize file claude vào build dir tạm", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "aie-build-"));
  const res = runBuild({ root: ROOT, providers: ["claude"], pluginIds: ["application"], outDir: out });
  assert.ok(res.results.find((r) => r.provider === "claude").count > 0);
  const skillDir = path.join(out, "claude", ".claude", "skills");
  assert.ok(fs.existsSync(skillDir));
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/build.test.mjs`
Expected: FAIL — `cli/build.mjs` chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// cli/build.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import claude from "../adapters/claude/adapter.mjs";
import codex from "../adapters/codex/adapter.mjs";
import cursor from "../adapters/cursor/adapter.mjs";
import antigravity from "../adapters/antigravity/adapter.mjs";
import { loadModel, loadPlugins, validatePlugins } from "./lib/plugins.mjs";
import { writeEntry } from "./lib/write.mjs";
import { PROVIDERS, buildDir } from "./lib/paths.mjs";

export const ADAPTERS = { antigravity, claude, codex, cursor };

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function buildProvider({ root, provider, pluginIds, scope = "project", outDir }) {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`Provider không hỗ trợ: ${provider}`);
  const model = loadModel({ root, pluginIds, scope });
  const result = adapter.build(model, { scope });
  const base = path.join(outDir, provider);
  let count = 0;
  for (const entry of result.files) {
    writeEntry(base, entry, { root });
    count += 1;
  }
  return { provider, count };
}

export function runBuild({ root = REPO_ROOT, providers = PROVIDERS, pluginIds = "all", outDir } = {}) {
  const errors = validatePlugins(loadPlugins(root), root);
  if (errors.length) {
    throw new Error(`Nội dung không hợp lệ:\n- ${errors.join("\n- ")}`);
  }
  const target = outDir ?? buildDir(root);
  const results = [];
  for (const provider of providers) {
    results.push(buildProvider({ root, provider, pluginIds, scope: "project", outDir: target }));
  }
  return { results, errors: [] };
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/build.test.mjs`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add cli/build.mjs cli/test/build.test.mjs
git commit -m "feat(cli): add build orchestrator with light content validation"
```

---

### Task 8: `cli/lib/install.mjs` — install + manifest

**Files:**
- Create: `cli/lib/install.mjs`
- Test: `cli/test/install.test.mjs`

**Interfaces:**
- Consumes: `loadModel`, `ADAPTERS` (Task 7 — import từ `../build.mjs`), `writeEntry`, `readIfExists`, `removeFileAndPruneEmpty` (Task 5), `mergeManagedBlock` (Task 4), `scopeRoot`, `manifestPath` (Task 1), `@iarna/toml`.
- Produces:
  - `readManifest(scope): { version, installs }` (fallback rỗng nếu hỏng/thiếu).
  - `writeManifest(scope, manifest): void`.
  - `install({ root, providers, plugins, scope }): { scope, root, results }` — với mỗi provider: dựng model, gọi adapter, ghi `files` vào target (track file/link), merge instruction, ghi mcp, cập nhật manifest (thay entry cùng provider).

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/install.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install, readManifest } from "../lib/install.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function withTarget(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aie-install-"));
  const prev = process.env.AIE_INSTALL_ROOT;
  process.env.AIE_INSTALL_ROOT = dir;
  try { return fn(dir); }
  finally { if (prev === undefined) delete process.env.AIE_INSTALL_ROOT; else process.env.AIE_INSTALL_ROOT = prev; }
}

test("install claude ghi skills + CLAUDE.md managed + manifest", () => {
  withTarget((dir) => {
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    assert.ok(fs.existsSync(path.join(dir, ".claude", "commands")));
    const claudeMd = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /AI-ENGINEERING:BEGIN AGENTS_BASELINE/);
    const manifest = readManifest("project");
    const entry = manifest.installs.find((e) => e.provider === "claude");
    assert.ok(entry);
    assert.ok(entry.plugins.includes("application"));
    assert.ok(entry.managed.includes("CLAUDE.md"));
  });
});

test("install bảo toàn nội dung người dùng ngoài khối managed", () => {
  withTarget((dir) => {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Ghi chú của tôi\n\nGiữ nguyên dòng này.\n", "utf8");
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    const claudeMd = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /Giữ nguyên dòng này\./);
    assert.match(claudeMd, /AGENTS_BASELINE/);
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/install.test.mjs`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// cli/lib/install.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import toml from "@iarna/toml";
import { loadModel } from "./plugins.mjs";
import { ADAPTERS } from "../build.mjs";
import { writeEntry, readIfExists } from "./write.mjs";
import { mergeManagedBlock } from "./managed-block.mjs";
import { scopeRoot, manifestPath } from "./paths.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function readManifest(scope = "project") {
  const file = manifestPath(scope);
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data && Array.isArray(data.installs)) return data;
  } catch { /* fallback */ }
  return { version: 1, installs: [] };
}

export function writeManifest(scope, manifest) {
  const file = manifestPath(scope);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function baselineBlock(root) {
  return fs.readFileSync(path.join(root, "core", "agents", "AGENTS.baseline.md"), "utf8");
}

function templateFile(root) {
  return fs.readFileSync(path.join(root, "core", "agents", "AGENTS.template.md"), "utf8");
}

function writeMcp(targetRoot, mcp, servers) {
  const dest = path.join(targetRoot, mcp.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const payload = { [mcp.rootKey]: servers ?? {} };
  const text = mcp.format === "toml" ? toml.stringify(payload) : `${JSON.stringify(payload, null, 2)}\n`;
  fs.writeFileSync(dest, text, "utf8");
  return mcp.path;
}

function applyInstruction(root, targetRoot, relPath) {
  const abs = path.join(targetRoot, relPath);
  const existing = readIfExists(abs);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const content = existing === null
    ? templateFile(root)
    : mergeManagedBlock(existing, baselineBlock(root), relPath);
  fs.writeFileSync(abs, content, "utf8");
  return relPath;
}

export function install({ root = REPO_ROOT, providers, plugins, scope = "project" }) {
  const targetRoot = scopeRoot(scope);
  const manifest = readManifest(scope);
  const results = [];

  for (const provider of providers) {
    const adapter = ADAPTERS[provider];
    if (!adapter) throw new Error(`Provider không hỗ trợ: ${provider}`);
    const model = loadModel({ root, pluginIds: plugins, scope });
    const out = adapter.build(model, { scope });

    const files = [];
    const links = [];
    for (const entry of out.files) {
      const res = writeEntry(targetRoot, entry, { root });
      if (res.link) links.push(res.link);
      else files.push(res.file);
    }
    const managed = out.instruction ? [applyInstruction(root, targetRoot, out.instruction.path)] : [];
    const mcp = out.mcp ? [writeMcp(targetRoot, out.mcp, model.mcpServers)] : [];

    const idx = manifest.installs.findIndex((e) => e.provider === provider && e.scope === scope);
    const record = {
      provider,
      plugins: model.pluginIds,
      scope,
      files,
      links,
      managed,
      mcp,
      installedAt: new Date().toISOString(),
    };
    if (idx === -1) manifest.installs.push(record);
    else manifest.installs[idx] = record;
    results.push({ provider, files: files.length, links: links.length });
  }

  writeManifest(scope, manifest);
  return { scope, root: targetRoot, results };
}
```

> `new Date().toISOString()` chạy ở CLI runtime (không phải trong Workflow script) nên hợp lệ.

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/install.test.mjs`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/install.mjs cli/test/install.test.mjs
git commit -m "feat(cli): add install with manifest tracking and managed-block merge"
```

---

### Task 9: `cli/lib/install.mjs` — uninstall + check

**Files:**
- Modify: `cli/lib/install.mjs`
- Test: `cli/test/uninstall-check.test.mjs`

**Interfaces:**
- Consumes: `readManifest`/`writeManifest` (Task 8), `removeFileAndPruneEmpty`, `readIfExists` (Task 5), `removeManagedBlock` (Task 4), `install` (Task 8, để cài lại phần còn lại).
- Produces:
  - `uninstall({ root, providers, plugins, scope }): { removed, scope }` — gỡ file/link/managed/mcp của entry khớp; nếu chỉ gỡ một phần plugin thì cài lại phần còn lại; cập nhật manifest.
  - `check({ scope }): { scope, root, manifest, installs:[{provider, plugins, present, total, missing}] }`.

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/uninstall-check.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { install, uninstall, check } from "../lib/install.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function withTarget(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aie-unc-"));
  const prev = process.env.AIE_INSTALL_ROOT;
  process.env.AIE_INSTALL_ROOT = dir;
  try { return fn(dir); }
  finally { if (prev === undefined) delete process.env.AIE_INSTALL_ROOT; else process.env.AIE_INSTALL_ROOT = prev; }
}

test("check báo present/total sau khi install", () => {
  withTarget(() => {
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    const report = check({ scope: "project" });
    const claude = report.installs.find((e) => e.provider === "claude");
    assert.ok(claude.total > 0);
    assert.equal(claude.missing, 0);
  });
});

test("uninstall gỡ file và cập nhật manifest; gỡ khối managed khỏi CLAUDE.md", () => {
  withTarget((dir) => {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Giữ lại\n", "utf8");
    install({ root: ROOT, providers: ["claude"], plugins: ["application"], scope: "project" });
    uninstall({ root: ROOT, providers: ["claude"], plugins: "all", scope: "project" });
    assert.equal(fs.existsSync(path.join(dir, ".claude", "commands")), false);
    const claudeMd = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /Giữ lại/);
    assert.doesNotMatch(claudeMd, /AGENTS_BASELINE/);
    const report = check({ scope: "project" });
    assert.equal(report.installs.find((e) => e.provider === "claude"), undefined);
  });
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/uninstall-check.test.mjs`
Expected: FAIL — `uninstall`/`check` chưa export.

- [ ] **Step 3: Viết implementation (thêm vào `cli/lib/install.mjs`)**

```js
// thêm import
import { removeFileAndPruneEmpty } from "./write.mjs";
import { removeManagedBlock } from "./managed-block.mjs";

function removeEntry(targetRoot, entry) {
  for (const rel of [...(entry.files ?? []), ...(entry.links ?? []), ...(entry.mcp ?? [])]) {
    removeFileAndPruneEmpty(path.join(targetRoot, rel), targetRoot);
  }
  for (const rel of entry.managed ?? []) {
    const abs = path.join(targetRoot, rel);
    const existing = readIfExists(abs);
    if (existing === null) continue;
    const next = removeManagedBlock(existing);
    if (next.trim() === "") removeFileAndPruneEmpty(abs, targetRoot);
    else fs.writeFileSync(abs, next, "utf8");
  }
}

export function uninstall({ root = REPO_ROOT, providers, plugins, scope = "project" }) {
  const targetRoot = scopeRoot(scope);
  const manifest = readManifest(scope);
  const wantProviders = !providers || providers === "all" ? null : providers;
  const wantPlugins = !plugins || plugins === "all" ? null : (Array.isArray(plugins) ? plugins : [plugins]);

  const removed = [];
  const reinstall = [];
  const keep = [];

  for (const entry of manifest.installs) {
    const providerMatch = !wantProviders || wantProviders.includes(entry.provider);
    if (!providerMatch) { keep.push(entry); continue; }
    if (wantPlugins) {
      const remaining = entry.plugins.filter((p) => !wantPlugins.includes(p));
      if (remaining.length === entry.plugins.length) { keep.push(entry); continue; }
      removeEntry(targetRoot, entry);
      removed.push(entry.provider);
      if (remaining.length) reinstall.push({ provider: entry.provider, plugins: remaining });
    } else {
      removeEntry(targetRoot, entry);
      removed.push(entry.provider);
    }
  }

  manifest.installs = keep;
  writeManifest(scope, manifest);
  for (const r of reinstall) {
    install({ root, providers: [r.provider], plugins: r.plugins, scope });
  }
  return { removed, scope };
}

export function check({ scope = "project" } = {}) {
  const targetRoot = scopeRoot(scope);
  const manifest = readManifest(scope);
  const installs = manifest.installs.map((entry) => {
    const all = [...(entry.files ?? []), ...(entry.links ?? []), ...(entry.managed ?? []), ...(entry.mcp ?? [])];
    const present = all.filter((rel) => fs.existsSync(path.join(targetRoot, rel))).length;
    return {
      provider: entry.provider,
      plugins: entry.plugins,
      total: all.length,
      present,
      missing: all.length - present,
      installedAt: entry.installedAt,
    };
  });
  return { scope, root: targetRoot, manifest: manifestPath(scope), installs };
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/uninstall-check.test.mjs`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/install.mjs cli/test/uninstall-check.test.mjs
git commit -m "feat(cli): add uninstall and check with manifest verification"
```

---

### Task 10: `cli/lib/prompt.mjs` — TUI primitives (logic thuần + wrapper)

**Files:**
- Create: `cli/lib/prompt.mjs`
- Test: `cli/test/prompt.test.mjs`

**Interfaces:**
- Produces:
  - Hằng: `BACK`, `CANCEL` (Symbol).
  - `keyToAction(name, { ctrl }): "up"|"down"|"toggle"|"all"|"confirm"|"back"|"quit"|null`.
  - `reduceMany(state, action, { count, min }): { cursor, selected, done?, min? }` — logic multi-select thuần (di chuyển cursor, toggle, all, confirm với ràng buộc min).
  - `selectOne(title, items, deps)`, `selectMany(title, items, opts, deps)`, `confirmStep(title, lines, deps)` — wrapper dùng `deps.readKey` (injectable) để test không cần TTY.

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/prompt.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { keyToAction, reduceMany, selectMany, BACK } from "../lib/prompt.mjs";

test("keyToAction ánh xạ phím", () => {
  assert.equal(keyToAction("up", {}), "up");
  assert.equal(keyToAction("k", {}), "up");
  assert.equal(keyToAction("space", {}), "toggle");
  assert.equal(keyToAction("a", {}), "all");
  assert.equal(keyToAction("return", {}), "confirm");
  assert.equal(keyToAction("b", {}), "back");
  assert.equal(keyToAction("q", {}), "quit");
  assert.equal(keyToAction("c", { ctrl: true }), "quit");
});

test("reduceMany toggle và di chuyển cursor", () => {
  let s = { cursor: 0, selected: new Set() };
  s = reduceMany(s, "toggle", { count: 3, min: 1 });
  assert.ok(s.selected.has(0));
  s = reduceMany(s, "down", { count: 3, min: 1 });
  assert.equal(s.cursor, 1);
});

test("reduceMany confirm bị chặn khi dưới min", () => {
  const s = { cursor: 0, selected: new Set() };
  const r = reduceMany(s, "confirm", { count: 3, min: 1 });
  assert.notEqual(r.done, true);
});

test("selectMany với readKey giả trả về lựa chọn", async () => {
  const keys = ["space", "return"]; // chọn item 0 rồi confirm
  let i = 0;
  const deps = { readKey: async () => keys[i++], write: () => {} };
  const items = [{ label: "A", value: "a" }, { label: "B", value: "b" }];
  const out = await selectMany("Chọn", items, { min: 1 }, deps);
  assert.deepEqual(out, ["a"]);
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/prompt.test.mjs`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// cli/lib/prompt.mjs
import readline from "node:readline";

export const BACK = Symbol("BACK");
export const CANCEL = Symbol("CANCEL");

export function keyToAction(name, { ctrl = false } = {}) {
  if (ctrl && name === "c") return "quit";
  switch (name) {
    case "up": case "k": return "up";
    case "down": case "j": return "down";
    case "space": return "toggle";
    case "a": return "all";
    case "return": case "enter": return "confirm";
    case "b": return "back";
    case "q": case "escape": return "quit";
    default: return null;
  }
}

export function reduceMany(state, action, { count, min }) {
  const cursor = state.cursor ?? 0;
  const selected = new Set(state.selected ?? []);
  switch (action) {
    case "up": return { cursor: (cursor - 1 + count) % count, selected };
    case "down": return { cursor: (cursor + 1) % count, selected };
    case "toggle":
      if (selected.has(cursor)) selected.delete(cursor); else selected.add(cursor);
      return { cursor, selected };
    case "all":
      if (selected.size === count) return { cursor, selected: new Set() };
      return { cursor, selected: new Set(Array.from({ length: count }, (_, i) => i)) };
    case "confirm":
      if (selected.size < min) return { cursor, selected, min: true };
      return { cursor, selected, done: true };
    default: return { cursor, selected };
  }
}

// ==== wrapper I/O (deps injectable: { readKey, write }) ====
function defaultDeps() {
  return {
    write: (s) => process.stdout.write(s),
    readKey: () =>
      new Promise((resolve) => {
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        const onKey = (_str, key) => {
          process.stdin.off("keypress", onKey);
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          resolve(key.ctrl ? "c" : key.name);
        };
        process.stdin.on("keypress", onKey);
      }),
  };
}

export async function selectMany(title, items, { min = 1 } = {}, deps = defaultDeps()) {
  let state = { cursor: 0, selected: new Set() };
  for (;;) {
    deps.write(`\n${title}\n`);
    items.forEach((it, i) => {
      const mark = state.selected.has(i) ? "[x]" : "[ ]";
      const point = i === state.cursor ? ">" : " ";
      deps.write(`${point} ${mark} ${it.label}\n`);
    });
    const name = await deps.readKey();
    const action = keyToAction(name, {});
    if (action === "quit") return CANCEL;
    if (action === "back") return BACK;
    const next = reduceMany(state, action, { count: items.length, min });
    if (next.done) return [...next.selected].sort((a, b) => a - b).map((i) => items[i].value);
    state = { cursor: next.cursor, selected: next.selected };
  }
}

export async function selectOne(title, items, deps = defaultDeps()) {
  let cursor = 0;
  for (;;) {
    deps.write(`\n${title}\n`);
    items.forEach((it, i) => deps.write(`${i === cursor ? ">" : " "} ${it.label}\n`));
    const action = keyToAction(await deps.readKey(), {});
    if (action === "quit") return CANCEL;
    if (action === "back") return BACK;
    if (action === "up") cursor = (cursor - 1 + items.length) % items.length;
    if (action === "down") cursor = (cursor + 1) % items.length;
    if (action === "confirm") return items[cursor].value;
  }
}

export async function confirmStep(title, lines = [], deps = defaultDeps()) {
  const items = [{ label: "Xác nhận & chạy", value: true }, { label: "Quay lại sửa", value: BACK }];
  deps.write(`\n${title}\n${lines.map((l) => `  ${l}`).join("\n")}\n`);
  return selectOne("", items, deps);
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/prompt.test.mjs`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/prompt.mjs cli/test/prompt.test.mjs
git commit -m "feat(cli): add zero-dep TUI prompt primitives with pure reducers"
```

---

### Task 11: `cli/lib/wizard.mjs` — step-machine + flow từng lệnh

**Files:**
- Create: `cli/lib/wizard.mjs`
- Test: `cli/test/wizard.test.mjs`

**Interfaces:**
- Consumes: `BACK`, `CANCEL` (Task 10); `PROVIDERS` (Task 1); `knownPluginIds` (Task 2); `readManifest` (Task 8).
- Produces:
  - `runSteps(steps): Promise<state|null>` — mỗi step `{ key, run(state) }` trả value / `BACK` / `CANCEL`. `null` khi CANCEL.
  - `runWizard(action, deps): Promise<{ action, ...state }|null>` — dựng steps theo action (`install`/`uninstall`/`build`/`check`). `deps` gồm `{ selectOne, selectMany, confirmStep, providers, pluginIds, installed }` (injectable).

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/wizard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { runSteps, runWizard } from "../lib/wizard.mjs";
import { BACK, CANCEL } from "../lib/prompt.mjs";

test("runSteps quay lại khi BACK rồi hoàn tất", async () => {
  const calls = [];
  const steps = [
    { key: "a", run: () => { calls.push("a"); return "A"; } },
    { key: "b", run: () => { calls.push("b"); return calls.filter((c) => c === "b").length === 1 ? BACK : "B"; } },
  ];
  const state = await runSteps(steps);
  assert.deepEqual(state, { a: "A", b: "B" });
});

test("runSteps trả null khi CANCEL", async () => {
  const state = await runSteps([{ key: "a", run: () => CANCEL }]);
  assert.equal(state, null);
});

test("runWizard install thu thập scope/providers/plugins", async () => {
  const deps = {
    selectOne: async (title) => (String(title).includes("scope") ? "project" : true),
    selectMany: async (title) => (String(title).includes("provider") ? ["claude"] : ["application"]),
    confirmStep: async () => true,
    providers: ["antigravity", "claude", "codex", "cursor"],
    pluginIds: ["application", "architecture"],
    installed: [],
  };
  const out = await runWizard("install", deps);
  assert.equal(out.action, "install");
  assert.deepEqual(out.providers, ["claude"]);
  assert.deepEqual(out.plugins, ["application"]);
  assert.equal(out.scope, "project");
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/wizard.test.mjs`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// cli/lib/wizard.mjs
import { BACK, CANCEL } from "./prompt.mjs";

export async function runSteps(steps) {
  const state = {};
  let i = 0;
  while (i < steps.length) {
    const res = await steps[i].run(state);
    if (res === CANCEL) return null;
    if (res === BACK) { i = Math.max(i - 1, 0); continue; }
    state[steps[i].key] = res;
    i += 1;
  }
  return state;
}

const SCOPE_ITEMS = [
  { label: "project — workspace hiện tại", value: "project" },
  { label: "global — cấu hình toàn hệ thống", value: "global" },
];

export async function runWizard(action, deps) {
  const providerItems = deps.providers.map((p) => ({ label: p, value: p }));
  const pluginItems = deps.pluginIds.map((p) => ({ label: p, value: p }));

  if (action === "install") {
    const st = await runSteps([
      { key: "scope", run: () => deps.selectOne("Chọn scope cài đặt", SCOPE_ITEMS) },
      { key: "providers", run: () => deps.selectMany("Chọn provider", providerItems, { min: 1 }) },
      { key: "plugins", run: () => deps.selectMany("Chọn plugin", pluginItems, { min: 1 }) },
      { key: "ok", run: (s) => deps.confirmStep("Xác nhận cài đặt", [
        `scope=${s.scope}`, `providers=${s.providers.join(", ")}`, `plugins=${s.plugins.join(", ")}`]) },
    ]);
    return st ? { action, scope: st.scope, providers: st.providers, plugins: st.plugins } : null;
  }

  if (action === "uninstall") {
    const installedProviders = [...new Set(deps.installed.map((e) => e.provider))];
    if (installedProviders.length === 0) return { action, providers: [], plugins: "all", empty: true };
    const items = installedProviders.map((p) => ({ label: p, value: p }));
    const st = await runSteps([
      { key: "scope", run: () => deps.selectOne("Chọn scope gỡ", SCOPE_ITEMS) },
      { key: "providers", run: () => deps.selectMany("Chọn provider để gỡ", items, { min: 1 }) },
      { key: "ok", run: (s) => deps.confirmStep("Xác nhận gỡ", [
        `scope=${s.scope}`, `providers=${s.providers.join(", ")}`]) },
    ]);
    return st ? { action, scope: st.scope, providers: st.providers, plugins: "all" } : null;
  }

  if (action === "build") {
    const st = await runSteps([
      { key: "providers", run: () => deps.selectMany("Chọn provider để build", providerItems, { min: 1 }) },
      { key: "ok", run: (s) => deps.confirmStep("Xác nhận build", [`providers=${s.providers.join(", ")}`]) },
    ]);
    return st ? { action, providers: st.providers } : null;
  }

  if (action === "check") {
    const st = await runSteps([{ key: "scope", run: () => deps.selectOne("Chọn scope kiểm tra", SCOPE_ITEMS) }]);
    return st ? { action, scope: st.scope } : null;
  }

  return null;
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/wizard.test.mjs`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add cli/lib/wizard.mjs cli/test/wizard.test.mjs
git commit -m "feat(cli): add wizard step-machine and per-command flows"
```

---

### Task 12: `cli/index.mjs` — entry: parse args, dispatch, wire; cập nhật package + gỡ CLI cũ

**Files:**
- Create: `cli/index.mjs`
- Modify: `package.json` (root — bin + scripts)
- Modify: `cli/package.json` (bin + bỏ tsc)
- Modify: `CLAUDE.md` (đồng bộ lệnh + build)
- Delete: `cli/src/` (toàn bộ), `cli/dist/` (toàn bộ), `cli/tsconfig.json`, `adapters/*/projector.mjs`
- Delete: các test cũ trong `cli/test/*.test.mjs` không thuộc flow mới (giữ lại 12 test mới của plan này)
- Test: `cli/test/cli.test.mjs`

**Interfaces:**
- Consumes: mọi module Task 1–11.
- Produces: `run(argv, deps): Promise<number>` (exit code); `parseArgs(argv): { _, scope, providers, plugins, explicit, yes }`.

- [ ] **Step 1: Viết test thất bại**

```js
// cli/test/cli.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../index.mjs";

test("parseArgs đọc lệnh, provider, plugin, scope, yes", () => {
  const a = parseArgs(["install", "--provider", "claude", "--plugin", "application", "-g", "--yes"]);
  assert.equal(a._[0], "install");
  assert.deepEqual(a.providers, ["claude"]);
  assert.deepEqual(a.plugins, ["application"]);
  assert.equal(a.scope, "global");
  assert.equal(a.yes, true);
  assert.equal(a.explicit, true);
});

test("parseArgs mặc định: không cờ chọn → explicit=false", () => {
  const a = parseArgs(["install"]);
  assert.equal(a.explicit, false);
  assert.equal(a.scope, "project");
});
```

- [ ] **Step 2: Chạy test — xác nhận fail**

Run: `node --test cli/test/cli.test.mjs`
Expected: FAIL — `cli/index.mjs` chưa tồn tại.

- [ ] **Step 3: Viết implementation**

```js
// cli/index.mjs
#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROVIDERS, isProvider } from "./lib/paths.mjs";
import { knownPluginIds } from "./lib/plugins.mjs";
import { runBuild, ADAPTERS } from "./build.mjs";
import { install, uninstall, check } from "./lib/install.mjs";
import { readManifest } from "./lib/install.mjs";
import { runWizard } from "./lib/wizard.mjs";
import { selectOne, selectMany, confirmStep } from "./lib/prompt.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseArgs(argv) {
  const a = { _: [], scope: "project", providers: null, plugins: null, explicit: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "-g" || v === "--global") a.scope = "global";
    else if (v === "--yes" || v === "-y") a.yes = true;
    else if (v === "--provider" || v === "--target") { a.providers = argv[++i].split(","); a.explicit = true; }
    else if (v === "--plugin") { a.plugins = argv[++i].split(","); a.explicit = true; }
    else a._.push(v);
  }
  return a;
}

const HELP = `aie — AI Engineering Platform CLI

Cách dùng:
  aie                      Mở menu wizard (install | uninstall | build | check)
  aie install   [--provider all|<p>...] [--plugin all|<id>...] [-g] [--yes]
  aie uninstall [--provider ...] [--plugin ...] [-g] [--yes]
  aie build     [--provider all|<p>...] [--plugin all|<id>...]
  aie check     [-g]
  aie list                 Liệt kê provider + plugin
  aie --help

Provider: ${PROVIDERS.join(", ")}
`;

function report(out, streams) {
  streams.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

export async function run(argv, streams = { stdout: process.stdout, stderr: process.stderr }) {
  const args = parseArgs(argv);
  const cmd = args._[0];

  if (args._.includes("--help") || cmd === "help" || cmd === "--help") {
    streams.stdout.write(HELP);
    return 0;
  }

  if (cmd === "list") {
    report({ providers: PROVIDERS, plugins: knownPluginIds(REPO_ROOT) }, streams);
    return 0;
  }

  const deps = {
    selectOne, selectMany, confirmStep,
    providers: PROVIDERS,
    pluginIds: knownPluginIds(REPO_ROOT),
    installed: readManifest(args.scope).installs,
  };

  // Menu tổng khi không có lệnh
  if (!cmd) {
    const pick = await selectOne("Chọn hành động", [
      { label: "install — cài đặt", value: "install" },
      { label: "uninstall — gỡ", value: "uninstall" },
      { label: "build — dựng đầu ra", value: "build" },
      { label: "check — kiểm tra", value: "check" },
    ]);
    if (typeof pick !== "string") return 0;
    return dispatchInteractive(pick, deps, streams);
  }

  const known = new Set(["install", "uninstall", "remove", "build", "check"]);
  const action = cmd === "remove" ? "uninstall" : cmd;
  if (!known.has(cmd)) { streams.stderr.write(`Lệnh không hỗ trợ: ${cmd}\n${HELP}`); return 1; }

  // Interactive nếu TTY và không truyền cờ chọn rõ ràng và không --yes
  const interactive = !args.explicit && !args.yes && Boolean(process.stdin.isTTY) &&
    (action === "install" || action === "uninstall" || action === "build" || action === "check");
  if (interactive) return dispatchInteractive(action, deps, streams);

  // Non-interactive
  if (action === "build") {
    const providers = normalizeProviders(args.providers);
    report(runBuild({ root: REPO_ROOT, providers, pluginIds: args.plugins ?? "all" }), streams);
    return 0;
  }
  if (action === "check") { report(check({ scope: args.scope }), streams); return 0; }
  if (action === "install") {
    if (!args.providers || !args.plugins) { streams.stderr.write("Cần --provider và --plugin ở chế độ non-interactive.\n"); return 1; }
    report(install({ root: REPO_ROOT, providers: normalizeProviders(args.providers), plugins: args.plugins, scope: args.scope }), streams);
    return 0;
  }
  if (action === "uninstall") {
    report(uninstall({ root: REPO_ROOT, providers: normalizeProviders(args.providers), plugins: args.plugins ?? "all", scope: args.scope }), streams);
    return 0;
  }
  return 0;
}

function normalizeProviders(sel) {
  if (!sel || (sel.length === 1 && sel[0] === "all")) return PROVIDERS;
  const bad = sel.filter((p) => !isProvider(p));
  if (bad.length) throw new Error(`Provider không hỗ trợ: ${bad.join(", ")}`);
  return sel;
}

async function dispatchInteractive(action, deps, streams) {
  const answer = await runWizard(action, deps);
  if (!answer) { streams.stdout.write("Đã huỷ.\n"); return 0; }
  if (action === "install") report(install({ root: REPO_ROOT, providers: answer.providers, plugins: answer.plugins, scope: answer.scope }), streams);
  else if (action === "uninstall") report(uninstall({ root: REPO_ROOT, providers: answer.providers, plugins: answer.plugins, scope: answer.scope }), streams);
  else if (action === "build") report(runBuild({ root: REPO_ROOT, providers: answer.providers, pluginIds: "all" }), streams);
  else if (action === "check") report(check({ scope: answer.scope }), streams);
  return 0;
}

// Auto-run khi gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("index.mjs")) {
  run(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Chạy test — xác nhận pass**

Run: `node --test cli/test/cli.test.mjs`
Expected: PASS (2/2).

- [ ] **Step 5: Cập nhật `cli/package.json`**

```json
{
  "name": "@ai-engineering-platform/cli",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "ai-engineering": "./index.mjs",
    "aie": "./index.mjs"
  },
  "dependencies": {
    "@iarna/toml": "^2.2.5",
    "js-yaml": "^5.0.0"
  }
}
```

- [ ] **Step 6: Cập nhật `package.json` (root) — bin + scripts**

Thay khối `bin` và `scripts` thành:

```json
  "bin": {
    "ai-engineering-platform": "./cli/index.mjs",
    "ai-engineering": "./cli/index.mjs",
    "aie": "./cli/index.mjs"
  },
  "scripts": {
    "test": "node --test \"cli/test/*.test.mjs\"",
    "build": "node cli/build.mjs",
    "check": "node cli/index.mjs check"
  },
```

(Bỏ `build:cli`, `prepare`, `validate`, `doctor`, `migrate:dry-run`. Gỡ `tar` khỏi deps nếu không còn dùng — kiểm tra bằng grep trước khi gỡ.)

- [ ] **Step 7: Gỡ CLI cũ + projector cũ**

```bash
git rm -r cli/src cli/tsconfig.json
git rm -r cli/dist 2>/dev/null || rm -rf cli/dist
git rm adapters/antigravity/projector.mjs adapters/claude/projector.mjs adapters/codex/projector.mjs adapters/cursor/projector.mjs
# Xoá các test cũ không thuộc flow mới (giữ 12 file test của plan này)
```

Danh sách test giữ lại: `paths.test.mjs`, `plugins.test.mjs`, `model.test.mjs`, `managed-block.test.mjs`, `write.test.mjs`, `adapters.test.mjs`, `build.test.mjs`, `install.test.mjs`, `uninstall-check.test.mjs`, `prompt.test.mjs`, `wizard.test.mjs`, `cli.test.mjs`. Xoá mọi `cli/test/*.test.mjs` khác:

```bash
cd cli/test && for f in *.test.mjs; do case "$f" in \
  paths.test.mjs|plugins.test.mjs|model.test.mjs|managed-block.test.mjs|write.test.mjs|adapters.test.mjs|build.test.mjs|install.test.mjs|uninstall-check.test.mjs|prompt.test.mjs|wizard.test.mjs|cli.test.mjs) ;; \
  *) git rm "$f" 2>/dev/null || rm -f "$f";; esac; done; cd ../..
```

Cũng xoá mọi file `cli/test/*.mjs` không phải `.test.mjs` (helpers cũ) nếu các test mới không import chúng.

- [ ] **Step 8: Cập nhật `CLAUDE.md`**

Sửa mục Commands trong `CLAUDE.md` để phản ánh flow mới (xoá tham chiếu `npm run build:cli`, `tsc`, `aie validate`, `aie doctor`, `init/upgrade/migrate`; thêm `aie install/uninstall/build/check/list` chạy pure ESM `node cli/index.mjs`, `npm test` = `node --test`). Giữ nguyên phần mô tả kiến trúc chung phù hợp; ghi rõ engine mới là manifest phẳng.

- [ ] **Step 9: Chạy toàn bộ test + smoke test CLI**

```bash
node --test "cli/test/*.test.mjs"
node cli/index.mjs --help
node cli/index.mjs list
AIE_INSTALL_ROOT="$(mktemp -d)" node cli/index.mjs install --provider claude --plugin application --yes
```
Expected: tất cả test PASS; `--help`/`list` in đúng; `install` non-interactive ghi file + manifest, exit 0.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(cli): wire pure-ESM entry, switch bin/scripts, remove legacy flow"
```

---

## Self-Review

**Spec coverage:**
- Mục tiêu 4 lệnh + menu tổng → Task 11–12. ✔
- 4 provider → Task 6 (adapters) + Task 1 (PROVIDERS). ✔
- Giữ nội dung `plugins/`/`core/`, adapter mới đọc plugin.yaml → Task 2–3, 6. ✔
- Pure ESM, bỏ tsc/dist → Task 12 (package.json + gỡ src/dist/tsconfig). ✔
- Managed-block AGENTS/CLAUDE.md → Task 4, tích hợp Task 8–9. ✔
- Manifest phẳng `.ai-engineering/manifest.json` + `AIE_INSTALL_ROOT` → Task 1, 8–9. ✔
- Validation nhẹ gộp vào build/check → Task 2 (`validatePlugins`), Task 7 (gate build). ✔
- Symlink/copy fallback → Task 5. ✔
- Test node --test cho mọi tầng → mỗi task có test. ✔

**Placeholder scan:** Không còn TBD/TODO; mọi step code có nội dung thật. Ghi chú `_shared/lib.mjs` ở Task 6 đã chỉ rõ bản dùng thật (bỏ `skillEntries`/`workflowEntries`).

**Type/tên nhất quán:** `loadModel`, `buildProvider`/`runBuild`, `ADAPTERS`, `install`/`uninstall`/`check`, `readManifest`/`writeManifest`, `mergeManagedBlock`/`removeManagedBlock`, `writeEntry`/`removeFileAndPruneEmpty`, `runSteps`/`runWizard`, `selectOne`/`selectMany`/`confirmStep`/`reduceMany`/`keyToAction`, `parseArgs`/`run` — dùng thống nhất giữa các task. AdapterResult `{files, instruction, mcp}` khớp giữa Task 6, 7, 8.

## Ghi chú phạm vi (đã xác nhận trong spec)
- MCP servers v1 = `{}` (chỉ ghi skeleton config). Việc thu thập server thật là mở rộng sau.
- Workflow file đơn (`.yaml`) không phát ra trong đầu ra provider ở v1 (giữ đúng phạm vi test); có thể bổ sung bằng `readSource` như agent `.toml`.
- Hooks chỉ liệt kê trong manifest provider (codex/antigravity), không sinh file riêng ở v1.
