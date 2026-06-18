# AI Engineering CLI

`cli/` sở hữu executable `ai-engineering` và `aie`, lifecycle runtime, provider
projection, chẩn đoán, công cụ distribution và test.

## Bản Đồ Thư Mục

| Path | Mục đích |
| --- | --- |
| `src/index.ts` | Entrypoint executable mỏng, được compile thành `dist/index.js`. |
| `src/*.mjs` | Runtime cho command, contract, lifecycle, provider projection, state, transaction, migration, doctor, registry và distribution. |
| `dist/` | Output CLI sinh bởi `npm run build:cli`. |
| `test/` | Bộ Node test, gồm ma trận smoke cho install/update/remove và adapter. |
| `hooks/` | Hook launcher dành cho provider. |
| `scripts/` | PowerShell hook tool, helper, fixture và test tập trung còn được duy trì. |

## Lệnh Người Dùng

```text
aie available
aie installed [--scope <project|global>|-g]
aie install <plugin...> --target <provider[,provider...]>
aie install --all --target <provider[,provider...]>
aie update <plugin...> [--dry-run]
aie update --all
aie remove <plugin...>
aie remove --all
aie check [--scope <project|global>|-g]
aie doctor [--scope <project|global>|-g]
```

Các alias tương thích vẫn khả dụng qua `plugin install`, `plugin remove`,
`plugin list`, `plugin outdated`, `plugin update`, `uninstall` và `upgrade`.

`project` là scope mặc định. Lệnh `update` so sánh version đã cài với manifest
chuẩn trong source CLI hiện tại và giữ nguyên mọi root plugin đã cài khi dựng lại
desired state.

## Projection Theo Provider

| Provider | Project | Global |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md`, `.codex/config.toml` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md`, `~/.codex/config.toml` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json`, `.mcp.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands`, `~/.claude.json` |
| Cursor | `AGENTS.md`, `.cursor/rules`, `.cursor/mcp.json` | `~/.cursor/mcp.json` |

Runtime và lifecycle state được ghi dưới `.ai-engineering/` tại scope root đã
chọn. Instruction file được backup trước khi managed baseline block được làm mới.

## Lệnh Cho Maintainer

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

## Xác Minh

```bash
npm test
npm run validate
npm run build:cli
```

Sau khi thay đổi `cli/src/`, cần build lại `dist/`. Nội dung plugin chuẩn phải
nằm trong `plugins/`; logic sinh riêng theo provider thuộc
`cli/src/providers.mjs`, `cli/src/lifecycle.mjs` và `adapters/`.

## Hợp Đồng Cài Đặt Kết Hợp

Luồng cài đặt tương tác chỉ thu thập lựa chọn còn thiếu, hiển thị đúng projection
preview và kết thúc bằng `Install / Back / Cancel`. CI phải truyền rõ plugin và
provider:

```bash
aie install application --target codex --yes
aie install application --with quality
```

Markdown command là nguồn chuẩn. `core/routing/command-registry.yaml` là chỉ mục
dẫn xuất xác định dùng schema version 2, không phải nguồn semantic thứ hai.
