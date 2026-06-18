# MCP Servers

`mcp-servers/` chứa một MCP server có namespace cho mỗi capability pack. Luồng
install của CLI copy server vào `.ai-engineering/mcp-servers/` thuộc scope đã
chọn và ghi MCP registration native của provider trỏ tới entrypoint cục bộ.

Các server này là phía runtime của command trong pack. Metadata của pack nói
command cần MCP tool nào; contract của server tương ứng khai báo tool đó.
Mỗi server dùng chung runtime JSON-RPC stdio tại `core/mcp/stdio-runtime.js`.
Runtime xử lý khởi tạo MCP, `ping`, `tools/list` và dispatch `tools/call`. Tất cả
tool phát hành đều có input/output schema và annotation read-only. Server không
khởi động nếu contract và handler registration không khớp.

## Cấu trúc một server

Mỗi thư mục `<pack>-mcp/` có cấu trúc:

- `mcp.json`: contract ổn định của server; gồm tên server, version và tool id.
- `package.json`: metadata package và script `start`.
- `src/index.js`: entrypoint được cấu hình MCP native của provider sử dụng.
- `src/server.js`: server factory mỏng, đọc `mcp.json` và đăng ký handler.
- `src/tools/`: tool handler thuộc sở hữu capability server.
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

Khi người dùng chạy
`ai-engineering install <pack...> --target <provider> --scope <project|global>`:

1. Dependency graph resolve các pack được yêu cầu.
2. Lifecycle builder gom command, skill, adapter và MCP server skeleton của pack.
3. File server được copy vào scope đã chọn dưới
   `.ai-engineering/mcp-servers/<pack>-mcp/`.
4. Runtime dùng chung được copy một lần vào
   `.ai-engineering/core/mcp/stdio-runtime.js`.
5. Cấu hình native của Codex, Claude hoặc Cursor trỏ tới entrypoint tuyệt đối
   `.ai-engineering/mcp-servers/<pack>-mcp/src/index.js`.
6. Ownership metadata ghi nhận runtime và config entry được quản lý để
   uninstall/update vẫn bảo toàn cấu hình của người dùng.

## Checklist thay đổi

- Thêm hoặc đổi tên MCP tool đồng thời trong `mcp.json`, metadata command của
  pack và routing registry. Không lặp lại tool id trong `src/server.js`.
- Khai báo input/output schema và annotation cho tool đã triển khai.
- Giữ tên thư mục server theo phạm vi `<pack>-mcp`.
- Không đưa lại folder provider plugin legacy làm runtime path đang hoạt động.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` và smoke test dự án đích sau thay đổi MCP contract.
