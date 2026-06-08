# MCP Servers

`mcp-servers/` chứa một MCP server skeleton được namespace cho mỗi capability
pack. Luồng install của CLI copy các server skeleton được chọn vào dự án đích
dưới `.ai-engineering/mcp-servers/` và ghi các entry `.mcp.json` trỏ tới
entrypoint nằm ngay trong dự án đích.

Các server này là phía runtime của command trong pack. Metadata của pack nói
command cần MCP tool nào; contract của server tương ứng khai báo tool đó.

## Cấu trúc một server

Mỗi thư mục `<pack>-mcp/` có cấu trúc:

- `mcp.json`: contract ổn định của server; gồm tên server, version và tool id.
- `package.json`: metadata package và script `start`.
- `src/index.js`: entrypoint thực thi được `.mcp.json` dùng.
- `src/server.js`: server factory và danh sách tool hiện được khai báo.
- `src/tools/`: vị trí tool handler hoặc placeholder.
- `src/resources/`: vị trí MCP resource handler hoặc placeholder.
- `src/prompts/`: vị trí MCP prompt handler hoặc placeholder.

## Bản đồ server

| Server | Pack sở hữu | Tool được khai báo |
| --- | --- | --- |
| `architecture-mcp` | `architecture` | `architecture.generate_system_design`, `architecture.review_architecture`, `architecture.generate_adr` |
| `application-mcp` | `application` | `application.review_source_code`, `application.generate_service`, `application.review_api` |
| `data-mcp` | `data` | `data.analyze_schema`, `data.review_index`, `data.migration_plan` |
| `knowledge-mcp` | `knowledge` | `knowledge.generate_readme`, `knowledge.generate_runbook`, `knowledge.review_docs` |
| `platform-mcp` | `platform` | `platform.review_docker`, `platform.review_kubernetes`, `platform.deployment_plan` |
| `quality-mcp` | `quality` | `quality.generate_test_plan`, `quality.review_coverage`, `quality.performance_review` |
| `security-mcp` | `security` | `security.scan_source`, `security.scan_dependencies`, `security.generate_threat_model` |

## Quan hệ với luồng install

Khi người dùng chạy `ai-engineering install <pack...> --target <provider>`:

1. Dependency graph resolve các pack được yêu cầu.
2. Lifecycle builder gom command, skill, adapter và MCP server skeleton của pack.
3. File server được copy vào dự án đích dưới
   `.ai-engineering/mcp-servers/<pack>-mcp/`.
4. `.mcp.json` trong dự án đích trỏ tới
   `.ai-engineering/mcp-servers/<pack>-mcp/src/index.js`.
5. Ownership metadata ghi nhận các file server được copy để uninstall/update có
   thể xóa hoặc thay thế file được quản lý một cách an toàn.

## Checklist thay đổi

- Thêm hoặc đổi tên MCP tool đồng thời trong `mcp.json`, `src/server.js`,
  metadata command của pack và routing registry.
- Giữ tên thư mục server theo phạm vi `<pack>-mcp`.
- Không đưa lại folder provider plugin legacy làm runtime path đang hoạt động.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` và smoke test dự án đích sau thay đổi MCP contract.
