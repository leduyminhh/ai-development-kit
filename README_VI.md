# AI Engineering Platform

Nền tảng plugin AI IDE cho Codex, Claude Code, Cursor và Google Antigravity. Nội dung capability chuẩn nằm trong `plugins/`; CLI chiếu nội dung đó thành file native theo từng provider, workflow definition, instruction được quản lý và MCP runtime registration tùy chọn.

**Phiên bản: [v1.1.0](CHANGELOG.md)** — Chuẩn hóa plugin, shell completions, CI/CD automation

## Có Gì Mới ở v1.1.0

- **Chuẩn hóa đặt tên** trên 7 plugin: skills (noun-action), commands (verb-noun), workflows (domain-pipeline)
- **Gộp 7 phase-specific skills** thành core implementation skills (java-implement, python-implement, react-implement)
- **Shell completions** cho bash/zsh với command, subcommand, và flag completion
- **Release automation** với GitHub Actions CI/CD
- **Hướng dẫn migration** toàn diện cho user upgrade từ v1.0

Xem [CHANGELOG.md](CHANGELOG.md) để biết chi tiết. Upgrade từ v1.0? Xem [MIGRATION.md](MIGRATION.md).

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

### Shell Completions (Tùy Chọn)

Bật tab-completion trong bash/zsh:

```bash
# Bash
source /path/to/aie-repo/completions/aie.bash

# Zsh
fpath=(/path/to/aie-repo/completions $fpath)
autoload -U compinit && compinit
```

Xem [SHELL_SETUP.md](SHELL_SETUP.md) để setup chi tiết.

## Workflow Nhanh

```bash
cd /path/to/project

aie init
aie install
aie check
aie remove
aie upgrade
```

Dùng `aie -h` hoặc `aie --help` để in cùng hướng dẫn CLI ưu tiên wizard ngay trong terminal.

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

Chạy `aie remove` trong terminal tương tác để mở uninstall wizard. Wizard liệt kê plugin đã cài, mặc định không chọn mục nào để an toàn, hỗ trợ quay lại/thoát, và yêu cầu xác nhận cuối trước khi gỡ asset do hệ thống quản lý nhưng vẫn giữ file người dùng sở hữu.

```bash
aie remove
aie remove security
aie remove --all --yes
```

Với CI hoặc script không tương tác, truyền tên plugin rõ ràng hoặc dùng `--all --yes`.

### Step 4: Upgrade

Chạy `aie upgrade` trong terminal tương tác để mở upgrade wizard. Wizard kiểm tra plugin lỗi thời, chọn sẵn các bản cập nhật khả dụng, hỗ trợ quay lại/thoát, và yêu cầu xác nhận trước khi áp dụng thay đổi.

```bash
aie upgrade
aie upgrade --all --yes
aie update platform security --yes
aie upgrade --dry-run
```

Dùng alias lifecycle `aie update` khi muốn nâng cấp trực tiếp một số plugin cụ thể.

Scope mặc định là project. Dùng `-g` hoặc `--scope global` để cài vào vị trí global của người dùng:

```bash
aie install --all --target codex -g
```

MCP registration được sinh với đường dẫn runtime local tuyệt đối, vì vậy cần chạy install trên từng máy sẽ dùng provider integration.

## Chuẩn Hóa Plugin (v1.1)

Tất cả 7 plugin giờ tuân theo quy ước đặt tên thống nhất:

| Loại Asset | Pattern | Ví Dụ |
|----------|---------|----------|
| **Skills** | noun-action | `java-implement`, `react-implement`, `test-qa-review` |
| **Commands** | verb-noun | `plan-migration`, `plan-deployment`, `implement-backend` |
| **Workflows** | domain-pipeline | `feature-delivery-pipeline`, `security-audit-pipeline` |

**Thay đổi chính từ v1.0:**

- Gỡ bỏ 7 phase-specific feature-* skills; dùng stack-specific skills thay thế
  - `feature-implement` → `java-implement`, `python-implement`, `react-implement`
  - `feature-review` → dùng implementation skills cùng test skills
  - `feature-plan`, `feature-integrate`, `feature-test`, `feature-fix` → gộp vào commands
- Đổi tên core skills để thống nhất
  - `java-analyze` → `java-implement`
  - `python-backend-engineer` → `python-implement`
  - `react-code-generate` → `react-implement`
- Đổi tên commands theo thứ tự verb-noun
  - `migration-plan` → `plan-migration`
  - `deployment-plan` → `plan-deployment`
- Đổi tên workflows để rõ ràng hơn
  - `fullstack-feature` → `feature-delivery-pipeline`

**Nâng cấp từ v1.0?** Xem [MIGRATION.md](MIGRATION.md) để có ví dụ before/after.

## Kế Hoạch Nâng Cấp

- v1 hiện có wizard cài đặt, gỡ cài đặt và nâng cấp tương tác, tự phát hiện provider/plugin, lựa chọn cài tất cả, preview plan, state cài đặt có thể resume, và coverage wizard cho các luồng CLI chính.
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

### Chiếu agent

`assets.agents` của plugin được chiếu thành định nghĩa agent chạy được cho **Codex** (`.codex/agents/<id>.toml`, copy), **Claude** (`.claude/agents/<id>.md`) và **Antigravity** (`agents/<id>.md`) — bản Markdown render từ định nghĩa agent chuẩn. Cursor không có khái niệm subagent nên chỉ nhận instruction được quản lý (`AGENTS.md`).

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
aie schema check <plugin> <json-file> [--schema <relpath>]
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
