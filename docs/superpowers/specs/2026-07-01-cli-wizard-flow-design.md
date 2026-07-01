# Thiết kế: Flow CLI wizard mới (port kiến trúc tham chiếu)

- Ngày: 2026-07-01
- Trạng thái: Đã duyệt thiết kế, chờ review spec
- Branch làm việc: `refactor/platform-contract-foundation`
- Dự án tham chiếu: `E:\Company\IOC\Shared\cowork-code-workflow-kit\cli`

## 1. Mục tiêu

Thay luồng CLI hiện tại của `ai-engineering-platform` bằng một luồng mới port
theo kiến trúc của dự án tham chiếu: một CLI gọn, pure ESM, phủ trọn wizard cho
`install` / `uninstall` / `build` / `check`, cài được cho cả 4 provider
(codex, claude, cursor, antigravity), và tự thực thi đủ logic (không phụ thuộc
engine cũ).

### Success criteria

1. `aie` không tham số → mở menu wizard chọn `install | uninstall | build | check`.
2. Bốn lệnh chạy được cả interactive (TTY) lẫn non-interactive (`--yes` + cờ).
3. `install`/`build` chạy đúng cho cả 4 provider và sinh file đầu ra tương thích
   với đầu ra hiện tại (không phá vỡ layout provider).
4. `AGENTS.md`/`CLAUDE.md` chỉ bị cập nhật trong khối managed "AI Engineering";
   nội dung ngoài khối được bảo toàn.
5. `check`/`uninstall` hoạt động dựa trên manifest phẳng.
6. Test `node --test cli/test/*.mjs` xanh cho wizard, install/uninstall/check,
   build 4 adapter, và managed-block merge.

## 2. Quyết định đã chốt

| # | Quyết định | Lựa chọn |
|---|---|---|
| Engine | Giữ engine cũ vs port tham chiếu | **Port kiến trúc tham chiếu (manifest phẳng)** |
| Nội dung | Giữ vs chuyển định dạng | **Giữ `plugins/` + `core/` (plugin.yaml), viết adapter mới đọc định dạng hiện tại** |
| Build tooling | Pure ESM vs TS build | **Pure ESM, không tsc/dist** |
| Bộ lệnh | 4 lệnh vs +lifecycle | **install/uninstall/build/check + list + menu tổng** |
| AGENTS/CLAUDE.md | managed-block vs ghi đè vs file riêng | **Giữ managed-block (chỉ đè khối AI Engineering)** |
| Validation | Gộp vào build/check vs lệnh riêng | **Gộp validation nhẹ vào `build`/`check`** |

### Đánh đổi được chấp nhận (bị loại bỏ có chủ đích)

- Resolver graph + giải phụ thuộc plugin theo DAG.
- Transaction atomic (rollback, checksum, phát hiện xung đột file unmanaged).
- `ownership.json` (phân biệt file platform-managed vs user-owned).
- `projection-contracts` (schema validate input/output projector).
- Các lệnh `init`, `doctor`, `upgrade`, `migrate` và wizard `upgrade`.

## 3. Backup

Mã của luồng cũ đã được sao lưu (copy) tại `cli.backup-2026-07-01/`, gồm:
`src/`, `test/`, `scripts/`, `hooks/`, `package.json`, `tsconfig.json`,
`README*.md`, và `adapters/` (4 provider projector cũ). Thư mục backup đã được
thêm vào `.gitignore` (`/cli.backup-*/`).

## 4. Kiến trúc thư mục mới

```
cli/
├── index.mjs             # entry: parse args → dispatch + help; không cờ → menu wizard
├── build.mjs             # build orchestrator: plugins+core → build/<provider>/
└── lib/
    ├── plugins.mjs       # loader: plugins/<id>/plugin.yaml + skills/ + commands/*.md + core/
    ├── paths.mjs         # PROVIDER_LAYOUT (4 provider) + scope (project/global) + AIE_INSTALL_ROOT
    ├── install.mjs       # install / uninstall / check + đọc/ghi manifest
    ├── wizard.mjs        # step-machine (runSteps + BACK/CANCEL) + flow từng lệnh
    ├── prompt.mjs        # TUI primitives: selectOne / selectMany / confirm
    ├── managed-block.mjs # merge khối "AI Engineering" trong AGENTS.md/CLAUDE.md
    └── write.mjs         # ghi file + frontmatter + symlink/copy fallback
adapters/
├── claude/adapter.mjs        # interface: { name, describe, build(plugins,{outDir,core}) → files[] }
├── codex/adapter.mjs
├── cursor/adapter.mjs
├── antigravity/adapter.mjs
└── _shared/lib.mjs
build/                        # output per-provider (gitignored)
cli/test/                     # node --test *.mjs
```

Nội dung `plugins/` và `core/` **không đổi**. Adapter mới đọc định dạng
`plugin.yaml` hiện tại (không dùng `.manifest.json` của dự án tham chiếu).

Layout đầu ra từng provider được trích lại từ `projector.mjs` cũ (đã backup) khi
implement, để đầu ra tương thích.

## 5. Bộ lệnh & tham số

```
aie                          # menu tổng: install | uninstall | build | check
aie install   [--provider all|<p>...] [--plugin all|<id>...] [-g|--global] [--yes]
aie uninstall [--provider all|<p>...] [--plugin all|<id>...] [-g|--global] [--yes]
aie build     [--provider all|<p>...] [--plugin all|<id>...]
aie check     [-g|--global]
aie list                     # liệt kê adapter + plugin
aie --help
```

- Bin giữ tên `ai-engineering` và `aie`, trỏ vào `cli/index.mjs`.
- Có TTY và **không** truyền cờ chọn rõ ràng → mở wizard tương ứng.
- Có `--yes` (hoặc đủ cờ) → chạy non-interactive; thiếu lựa chọn bắt buộc → báo lỗi rõ.
- Parser args thủ công (không thư viện), theo phong cách tham chiếu.

## 6. Provider layout (cả 4 active)

Nguồn chân lý: `PROVIDERS = ["codex", "claude", "cursor", "antigravity"]`.

| Provider | Đích ghi (tương đối `<scope-root>`) |
|---|---|
| claude | `.claude/skills/<id>/`, `.claude/commands/<slug>.md`, `.claude/agents/<id>.md`, `.claude/*.mcp.json` + managed-block trong `AGENTS.md`/`CLAUDE.md` |
| codex | `.codex/skills/<id>/`, `.codex/prompts/`, workflow files + managed-block trong `AGENTS.md` |
| cursor | `.cursor/rules/<plugin>-<file>.mdc` |
| antigravity | `AGENTS.md` (managed-block) + thư mục workflows/agents theo layout hiện tại |

Scope: `project` (mặc định, `process.cwd()`), `global` (`-g`, `os.homedir()`).
Env `AIE_INSTALL_ROOT` override gốc scope để test.

## 7. Wizard (step-machine)

`prompt.mjs` cung cấp primitives keypress zero-dep:

- `selectOne(title, items, opts)` → trả 1 value.
- `selectMany(title, items, {min})` → trả mảng values.
- `confirmStep(title, lines)` → `true` chạy / `BACK` quay lại.
- Phím: `↑/↓` hoặc `k/j` di chuyển; `space` toggle; `a` chọn tất cả; `enter`
  xác nhận; `b` quay lại; `q`/`Esc`/`Ctrl-C` huỷ.

`wizard.mjs` chạy step-machine `runSteps(steps)`; mỗi step trả value, `BACK`,
hoặc `CANCEL`. Logic tách khỏi I/O terminal (nhận `deps` injectable) để unit test
không cần TTY.

Flow từng lệnh:

- **install:** `scope → providers (multi, ≥1) → plugins (multi, ≥1) → confirm`
- **uninstall:** `scope → chọn provider/plugin đã cài (từ manifest) → confirm`
- **build:** `providers (multi, ≥1) → confirm`
- **check:** `scope → chạy ngay`

Menu tổng (khi `aie` không tham số): `selectOne` chọn 1 trong 4 hành động rồi vào
flow tương ứng.

## 8. Manifest & state

- Vị trí: `<scope-root>/.ai-engineering/manifest.json` (thư mục `.ai-engineering/`
  đã có trong `.gitignore`).
- Ghi khi install/uninstall; đọc khi check/uninstall.
- Cấu trúc:

```json
{
  "version": 1,
  "installs": [
    {
      "provider": "claude",
      "plugins": ["backend", "frontend"],
      "scope": "project",
      "files": ["relative/path/1", "relative/path/2"],
      "links": ["relative/path/link"],
      "managed": ["AGENTS.md", "CLAUDE.md"],
      "installedAt": "2026-07-01T00:00:00.000Z"
    }
  ]
}
```

- Manifest hỏng → fallback về manifest rỗng (không crash).
- Uninstall một phần (bỏ 1 plugin, giữ phần còn lại): gỡ file của entry rồi cài
  lại các plugin còn lại của provider đó.

## 9. Managed-block cho AGENTS.md / CLAUDE.md

- Port logic merge theo marker từ `init.mjs` cũ (`prepareInstructionFileContent`)
  sang `cli/lib/managed-block.mjs`.
- Chỉ vùng giữa marker `BEGIN/END` của khối "AI Engineering" được ghi/cập nhật;
  nội dung ngoài khối được giữ nguyên (đọc file cũ, thay khối, ghi lại).
- File chưa tồn tại → tạo mới với khối managed.
- Uninstall provider quản lý file này → gỡ khối managed, giữ phần còn lại. Nếu
  sau khi gỡ khối, file chỉ còn khoảng trắng → xoá file; ngược lại → giữ file với
  nội dung ngoài khối.
- Preserve BOM/encoding hiện có khi đọc-ghi (nhiều file UTF-8 có BOM).

## 10. Build & Check semantics

- **build:** `loadPlugins()` + `loadCore()` → với mỗi provider đích, gọi
  `adapter.build(plugins, {outDir, core})` → nhận `files[]` → `writeFiles()` vào
  `build/<provider>/`. Trước khi materialize, chạy **validation nhẹ** (mục 11).
  `install` tự gọi build nếu `build/<provider>/` thiếu.
- **check:** đọc manifest theo scope, verify từng file/link còn trên đĩa, báo cáo
  present/missing theo provider + plugin; cảnh báo file thiếu.

## 11. Validation nhẹ (gộp vào build/check)

Thay cho lệnh `validate` cũ, chạy kiểm tra tối thiểu trong `build` (và cảnh báo
trong `check`):

- `plugin.yaml` parse được và có trường bắt buộc (id, assets, skills).
- Mọi asset khai báo trong `plugin.yaml` tồn tại trên đĩa.
- Không có id trùng giữa các plugin.

Lỗi → dừng build với thông báo rõ (fail loud). Cập nhật `package.json` (`scripts`)
và `CLAUDE.md` để `npm run validate`/`doctor` không còn trỏ tới lệnh đã bỏ:
- `scripts.build` → `node cli/build.mjs`
- `scripts.test` → `node --test cli/test/*.mjs`
- Bỏ/đổi `scripts.validate`, `scripts.doctor` cho khớp (ghi rõ trong plan).

## 12. Test

`node --test cli/test/*.mjs`:

- `prompt`/`wizard`: step-machine (`runSteps`, BACK/CANCEL), selection logic
  (min, toggle-all) — inject deps, không cần TTY.
- `install`/`uninstall`/`check`: qua `AIE_INSTALL_ROOT` tạm; kiểm manifest ghi
  đúng, uninstall một phần, check báo present/missing.
- `build`: 4 adapter sinh `files[]` đúng đường dẫn provider.
- `managed-block`: chèn/cập nhật/gỡ khối, bảo toàn nội dung ngoài khối, giữ BOM.

## 13. Ngoài phạm vi (YAGNI)

- Không port `pack.mjs` (ZIP cho Cowork) trừ khi cần sau.
- Không giữ `upgrade`/`migrate`/`doctor`/`init` như lệnh riêng.
- Không giữ resolver/transaction/ownership/projection-contracts.
- Không đổi định dạng nội dung `plugins/`/`core/`.

## 14. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Mất an toàn atomic/rollback so với engine cũ | Backup đầy đủ; install ghi manifest sau khi ghi file; test bao phủ install/uninstall |
| Đè nhầm nội dung AGENTS.md/CLAUDE.md | Chỉ merge khối managed theo marker; test managed-block |
| Bỏ `validate` phá CI/`package.json`/`CLAUDE.md` | Gộp validation nhẹ vào build/check; cập nhật scripts + tài liệu |
| Layout provider lệch đầu ra cũ | Trích layout từ `projector.mjs` đã backup; test build đối chiếu |
| Symlink lỗi trên Windows không Developer Mode | Fallback copy + cảnh báo (giữ hành vi hiện tại) |
