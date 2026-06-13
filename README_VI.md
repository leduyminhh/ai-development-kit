# AI Engineering Platform

Nền tảng kỹ thuật MCP-first gồm các capability pack có thể cài đặt, quy trình
khởi tạo dự án an toàn và adapter được sinh cho Codex, Claude và Cursor.

## Năng lực

- Bảy capability pack: architecture, application, data, security, quality, platform và knowledge.
- Mỗi capability pack có một MCP server contract riêng.
- Tạo hoặc merge `AGENTS.md` an toàn, chỉ cập nhật managed block và luôn backup.
- Cài đặt, gỡ bỏ pack có xử lý dependency.
- Sinh cấu hình MCP native cho Codex, Claude và Cursor.
- Hỗ trợ cài đặt theo phạm vi project và global của người dùng.
- Validate repository, doctor dự án đích, lập kế hoạch và dọn dẹp migration.

## Cài đặt

Yêu cầu Node.js 20 trở lên.

```bash
git clone https://github.com/leduyminhh/ai-development-kit.git
cd ai-development-kit
npm install
npm run build
npm link
```

## CLI

```bash
ai-engineering init
ai-engineering install application --target cursor --scope project
ai-engineering install --all --target codex,claude,cursor --scope global
ai-engineering doctor --scope project
ai-engineering doctor --scope global
ai-engineering uninstall security --scope project
ai-engineering list --scope global
ai-engineering update application
ai-engineering upgrade
ai-engineering generate-adapter quality --target codex
ai-engineering validate
ai-engineering migrate --dry-run
ai-engineering migrate --delete-legacy
```

Lệnh `init` không ghi đè nội dung AGENTS do dự án sở hữu. Lệnh chỉ tạo hoặc cập
nhật managed baseline block và ghi trạng thái dưới `.ai-engineering/`.

Project scope ghi runtime dưới `<project>/.ai-engineering/`. Global scope ghi
runtime dưới `<home>/.ai-engineering/` và không sinh command, skill, rule hoặc
`AGENTS.md` cho project.

Mỗi máy phải chạy lệnh install vì MCP stdio registration sử dụng đường dẫn
entrypoint tuyệt đối trên chính máy đó.

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
