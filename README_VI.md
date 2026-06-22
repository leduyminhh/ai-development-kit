# AI Engineering Platform

Nền tảng plugin cho Codex, Claude Code, Cursor và Google Antigravity. Nội dung capability chuẩn nằm
trong `plugins/`; CLI project nội dung đó thành file native theo từng provider
và các MCP runtime registration tùy chọn.

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
aie install --all --target codex
aie install --all --target claude
aie install --all --target cursor
aie install --all --target antigravity
aie install --all --target codex,claude,cursor
aie install --all --target codex,claude,cursor,antigravity

aie doctor
aie check
aie available
aie installed

aie update application
aie update --all
aie remove security
aie remove --all
```

Cài một phần plugin hoặc optional dependency khi không cần toàn bộ capability:

```bash
aie install application --target codex --yes
aie install security quality --target cursor
aie install application --with quality
```

Scope mặc định là project. Dùng `-g` hoặc `--scope global` để cài vào vị trí
global của người dùng:

```bash
aie install --all --target codex -g
```

Trong môi trường không tương tác, install phải truyền `--yes` kèm root plugin và
provider target rõ ràng. Trong terminal tương tác, CLI chỉ hỏi lựa chọn còn
thiếu và hiển thị plan trước khi ghi file.

MCP registration được sinh với đường dẫn runtime local tuyệt đối, vì vậy cần
chạy install trên từng máy sẽ dùng provider integration.

## Đường Dẫn Provider

Mọi scope đều lưu runtime, ownership, lock và backup dưới
`<scope-root>/.ai-engineering/`.

| Provider | Project scope | Global scope |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `.cursor/mcp.json` |
| Antigravity | `AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` | `.antigravity/AGENTS.md`, `antigravity-plugin.json`, `skills/`, `commands/`, `rules/`, `mcp/mcp.json` |

Khi cập nhật instruction file, hệ thống giữ nguyên nội dung do người dùng sở hữu
nằm ngoài AI Engineering baseline block và ghi backup dưới
`.ai-engineering/backups/`.

## Cấu Trúc Repository

```text
adapters/      metadata projection theo provider và định nghĩa agent cho Codex
cli/           runtime CLI, dist sinh ra, test, hook và shell tool
core/          policy, routing, schema, template, prompt và workflow dùng chung
docs/          hồ sơ migration và kế hoạch triển khai
providers/     registry, schema cấu hình, policy và ví dụ MCP
plugins/       manifest, command và skill chuẩn có thể cài đặt
```

Markdown command trong `plugins/<plugin>/commands/*.md` là nguồn command chuẩn.
`core/routing/command-registry.yaml` là chỉ mục dẫn xuất xác định dùng schema version 2.

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
