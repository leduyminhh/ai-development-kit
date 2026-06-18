# AI Engineering CLI

`cli/` sở hữu executable `ai-engineering` và `aie`, lifecycle runtime, provider
projection, chẩn đoán, công cụ distribution và test.

## Bản Đồ Thư Mục

| Path | Mục đích |
| --- | --- |
| `src/index.ts` | Entrypoint executable mỏng, được compile thành `dist/index.js`. |
| `src/*.mjs` | Runtime cho command, contract, lifecycle, projection, state, transaction, migration, doctor, registry và distribution. |
| `dist/` | Output CLI sinh bởi `npm run build:cli`. |
| `test/` | Bộ Node test, gồm kiểm tra install/update/remove và ma trận provider. |
| `hooks/` | Hook launcher dành cho provider. |
| `scripts/` | PowerShell tool, helper, fixture và test tập trung còn được duy trì. |

## Lệnh

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

`project` là scope mặc định. Trong môi trường không tương tác, install cần
`--yes` kèm root plugin và provider rõ ràng. Alias tương thích vẫn khả dụng qua
`plugin`, `uninstall` và `upgrade`.

## Projection Theo Provider

| Provider | Project | Global |
| --- | --- | --- |
| Codex | `AGENTS.md`, `.agents/skills`, `.codex/agents`, `.codex/workflows/commands.md` | `~/.codex/AGENTS.md`, `~/.agents/skills`, `~/.codex/agents`, `~/.codex/workflows/commands.md` |
| Claude | `CLAUDE.md`, `.claude/skills`, `.claude/commands`, `.claude-plugin/plugin.json` | `~/.claude/CLAUDE.md`, `~/.claude/skills`, `~/.claude/commands` |
| Cursor | `AGENTS.md`, `.cursor/rules` | Không sinh provider MCP config cho đến khi có active tools. |

Runtime và lifecycle state được ghi dưới `.ai-engineering/` tại scope root đã
chọn.

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

Markdown command là nguồn chuẩn. `core/routing/command-registry.yaml` là chỉ mục
dẫn xuất xác định dùng schema version 2.

## Xác Minh

```bash
npm test
npm run validate
npm run build:cli
```

Sau khi thay đổi `cli/src/`, cần build lại `dist/`.
