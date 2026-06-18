# AI Engineering Platform

Nền tảng plugin cho Codex, Claude Code và Cursor. Nội dung capability chuẩn nằm
trong `plugins/`; CLI và `adapters/` sinh projection riêng cho từng provider.
MCP server là lớp runtime tùy chọn.

## Năng Lực

- Bảy plugin có thể cài đặt: architecture, application, data, security, quality,
  platform và knowledge.
- Cài đặt, cập nhật, gỡ bỏ, liệt kê và chẩn đoán có xử lý dependency.
- Projection theo phạm vi project và global cho Codex, Claude và Cursor.
- Instruction file được quản lý nhưng vẫn bảo toàn nội dung do người dùng sở hữu.
- Theo dõi ownership theo transaction cho file sinh ra và cấu hình MCP được merge.

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

## Workflow Cho Project

```bash
cd /path/to/project

# Khởi tạo managed baseline trong AGENTS.
aie init

# Cài cho một provider hoặc tất cả provider được hỗ trợ.
aie install --all --target codex
aie install --all --target claude
aie install --all --target cursor
aie install --all --target codex,claude,cursor

# Xác minh sau khi cài đặt hoàn tất.
aie doctor
aie check

# Xem, cập nhật và gỡ plugin.
aie available
aie installed
aie update application
aie update --all
aie remove security
aie remove --all

# Cài tập plugin nhỏ hơn khi cần.
aie install application --target codex
aie install security quality --target cursor

# Cài vào vị trí global của người dùng.
aie install --all --target codex -g
aie install --all --target claude -g
aie install --all --target cursor -g
```

Lệnh `update` so sánh version đã cài với manifest plugin chuẩn trong source CLI
hiện tại, sau đó dựng lại đầy đủ tập root plugin đã cài. Lifecycle hiện chưa tải
artifact từ remote registry.

MCP registration được sinh với đường dẫn runtime local tuyệt đối, vì vậy cần chạy
lệnh cài đặt trên từng máy.

## Đường Dẫn Native Theo Provider

Mọi scope đều lưu runtime, ownership, lock và backup dưới
`<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md`, `.codex/config.toml` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md`, `~/.codex/config.toml` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json`, `.mcp.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands`, `~/.claude.json` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `~/.cursor/mcp.json` |

Khi cập nhật instruction file, hệ thống giữ nguyên nội dung nằm ngoài managed
baseline block và ghi backup dưới `.ai-engineering/backups/`.

## Cấu Trúc Repository

```text
adapters/      metadata nguồn theo provider và định nghĩa agent cho Codex
cli/           runtime CLI, dist sinh ra, test, hook và shell tool
core/          policy, routing, schema, template, prompt và workflow dùng chung
docs/          hồ sơ migration và kế hoạch triển khai
mcp-servers/   MCP runtime server tùy chọn theo namespace
plugins/       manifest, command và skill chuẩn có thể cài đặt
```

Mỗi `plugins/<plugin-id>/` dùng boundary chuẩn sau:

```text
plugin.yaml
commands/
skills/
agents/
rules/
templates/
workflows/
schemas/
```

Asset group chưa dùng được khai báo là `none` trong `plugin.yaml`. Không tạo
README placeholder chỉ để giữ thư mục. Source root `packs/` cũ không còn active.

## Lệnh Cho Maintainer

```bash
aie validate
aie build --all
aie artifact verify --all
aie registry generate
aie migrate --dry-run
aie migrate --delete-legacy
```

## Xác Minh

```bash
npm test
npm run validate
npm run build:cli
```

Quyết định migration được ghi tại
[`docs/migration/legacy-review-matrix.md`](docs/migration/legacy-review-matrix.md).
