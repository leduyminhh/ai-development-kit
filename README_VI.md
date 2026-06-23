# AI Engineering Platform

Nền tảng plugin AI IDE cho Codex, Claude Code, Cursor và Google Antigravity. Nội dung capability chuẩn nằm trong `plugins/`; CLI project nội dung đó thành file native theo từng provider, workflow definition, instruction được quản lý và MCP runtime registration tùy chọn.

## Cài Đặt

Yêu cầu Node.js 20 trở lên.

```bash
git clone https://github.com/leduyminhh/ai-development-kit.git
cd ai-development-kit
npm install
npm run build
npm link
```

Có thể dùng cả `ai-engineering` và alias ngắn `aie`.

## Workflow Nhanh

```bash
cd /path/to/project

aie init
aie install
aie check
```

## Flow CLI Tương Tác

### Step 1: Cài Đặt

Chạy `aie install` trong terminal tương tác để mở wizard cài đặt. CLI tự phát hiện tín hiệu provider và ngữ cảnh project, đề xuất plugin, hỗ trợ `antigravity`, hiển thị plan trước khi ghi file, và có thể tiếp tục phiên bị gián đoạn từ `.ai-engineering/install/session.json`.

Phím trong wizard:

- `↑/↓` hoặc `j/k`: di chuyển giữa các mục.
- `Space`: bật/tắt plugin hoặc provider.
- `Enter`: đi tiếp hoặc xác nhận install plan.
- `Esc` hoặc `q`: thoát.
- `b`: quay từ step con ra step cha.
- `Install all plugins`: tick toàn bộ plugin; bật lại lần nữa sẽ xóa toàn bộ tick.

Với CI hoặc môi trường không tương tác, truyền lựa chọn rõ ràng cùng `--yes`:

```bash
aie install application --target codex --yes
aie install --all --target codex --yes
aie install --all --target antigravity --yes
aie install application --with quality
```

### Step 2: Check

Chạy `aie check` sau khi cài để kiểm tra plugin, skill, command, agent, workflow và file native theo provider.

```bash
aie check
aie doctor
```

### Step 3: Uninstall

Chạy `aie remove` để gỡ asset plugin do hệ thống quản lý nhưng vẫn giữ file người dùng sở hữu.

```bash
aie remove security
aie remove --all
```

Scope mặc định là project. Dùng `-g` hoặc `--scope global` để cài vào vị trí global của người dùng:

```bash
aie install --all --target codex -g
```

MCP registration được sinh với đường dẫn runtime local tuyệt đối, vì vậy cần chạy install trên từng máy sẽ dùng provider integration.

## Kế Hoạch Nâng Cấp

- v1 hiện có wizard cài đặt tương tác, tự phát hiện provider/plugin, lựa chọn cài tất cả, preview plan, và state cài đặt có thể resume.
- Nâng cấp tiếp theo: màn hình wizard sinh từ template, prompt resume rõ ràng, phát hiện ngữ cảnh project sâu hơn, và trang help riêng cho nhóm lệnh workflow/maintainer.

## Đường Dẫn Provider

Mọi scope đều lưu runtime, ownership, lock và backup dưới `<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `.cursor/mcp.json` |
| Antigravity | `AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` | `.antigravity/AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` |

Khi cập nhật instruction file, hệ thống giữ nguyên nội dung do người dùng sở hữu nằm ngoài AI Engineering baseline block và ghi backup dưới `.ai-engineering/backups/`.

## Cấu Trúc Repository

```text
adapters/      logic projection theo provider, hook và định nghĩa agent cho Codex
cli/           runtime CLI, dist sinh ra, test, hook và shell tool
core/          AGENTS policy, routing, schema, standard, template và workflow dùng chung
docs/          hồ sơ migration, design spec và kế hoạch triển khai
providers/     registry MCP chưa active, schema cấu hình, policy và ví dụ
plugins/       manifest, command, skill, workflow và schema chuẩn có thể cài đặt
```

Markdown command trong `plugins/<plugin>/commands/*.md` là nguồn command chuẩn. `core/routing/command-registry.yaml` là chỉ mục dẫn xuất xác định dùng schema version 2.

Workflow definition nằm trong `core/workflows/` cho orchestration dùng chung và trong `plugins/<plugin>/workflows/` cho workflow do plugin sở hữu. Dùng `aie workflow <subcommand>` để khởi tạo, liệt kê, validate, build, chạy, inspect và dọn workflow run dưới `.ai-engineering/workflows/` trong project đích.

## Lệnh Cho Maintainer

```bash
aie validate
aie build --all
aie artifact verify --all
aie registry generate
aie migrate --dry-run
aie migrate --delete-legacy
aie generate-adapter <plugin...> --target <provider[,provider...]>
```

## Xác Minh

```bash
npm test
npm run validate
npm run build:cli
```

Quyết định migration và acceptance note được ghi trong `docs/migration/`, với target plugin-first hiện tại tại [`docs/migration/migrate-existing-source-to-plugins-platform.md`](docs/migration/migrate-existing-source-to-plugins-platform.md) và tiêu chí hoàn tất tại [`docs/migration/completion-checklist.md`](docs/migration/completion-checklist.md).
