# AI Engineering Platform

Nền tảng kỹ thuật MCP-first gồm các capability pack có thể cài đặt, quy trình
khởi tạo dự án an toàn và adapter được sinh cho Codex, Claude và Cursor.

## Năng lực

- Bảy capability pack: architecture, application, data, security, quality, platform và knowledge.
- Mỗi capability pack có một MCP server contract riêng.
- Tạo hoặc merge `AGENTS.md` an toàn, chỉ cập nhật managed block và luôn backup.
- Cài đặt, gỡ bỏ pack có xử lý dependency.
- Sinh provider adapter và `.mcp.json`.
- Validate repository, doctor dự án đích, lập kế hoạch và dọn dẹp migration.

## Cài đặt

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run build
npm link
```

## CLI

```bash
ai-engineering init
ai-engineering install application
ai-engineering install platform security --target cursor
ai-engineering uninstall security
ai-engineering list
ai-engineering update application
ai-engineering upgrade
ai-engineering generate-adapter quality --target codex
ai-engineering validate
ai-engineering doctor
ai-engineering migrate --dry-run
ai-engineering migrate --delete-legacy
```

Lệnh `init` không ghi đè nội dung AGENTS do dự án sở hữu. Lệnh chỉ tạo hoặc cập
nhật managed baseline block và ghi trạng thái dưới `.ai-engineering/`.

## Cấu trúc

```text
core/          contract, routing, policy, template và schema dùng chung
packs/         capability pack có thể cài đặt
mcp-servers/   MCP server skeleton theo namespace
adapters/      provider template và metadata nguồn
cli/           TypeScript CLI và shell utility còn được sử dụng
docs/          tài liệu migration và kiến trúc
tests/         integration test xuyên package
```

Mỗi pack gồm:

```text
README.md
pack.yaml
commands/
skills/
templates/
workflows/
schemas/
```

## Phát triển

```bash
npm test
npm run validate
npm run build:cli
```

Quyết định migration được ghi tại
[`docs/migration/legacy-review-matrix.md`](docs/migration/legacy-review-matrix.md).
