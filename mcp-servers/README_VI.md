# MCP Servers

`mcp-servers/` chứa các MCP server runtime tùy chọn cho plugin năng lực. Luồng
install của CLI chỉ copy những server được khai báo trong manifest của plugin đã
cài vào `.ai-engineering/mcp-servers/` thuộc scope đã chọn, rồi ghi MCP
registration native của provider trỏ tới entrypoint cục bộ.

Các server này là lớp tool có thể thực thi. Metadata của plugin khai báo server
runtime và tool id cần dùng; metadata command có thể nối command hướng người
dùng với một tool id bằng `mcpTool`. Mỗi server dùng chung runtime JSON-RPC stdio
tại `core/mcp/stdio-runtime.js`. Runtime xử lý khởi tạo MCP, `ping`,
`tools/list` và dispatch `tools/call`. Tất cả tool phát hành đều có input/output
schema và annotation read-only. Server không khởi động nếu contract và handler
registration không khớp.

## Cấu Trúc Server

Mỗi thư mục `<plugin>/` có cấu trúc:

- `mcp.json`: contract ổn định của server; gồm tên server, version và tool id.
- `package.json`: metadata package và script `start`.
- `src/index.js`: entrypoint được cấu hình MCP native của provider sử dụng.
- `src/server.js`: server factory mỏng, đọc `mcp.json` và đăng ký handler.
- `src/tools/`: tool handler thuộc sở hữu capability server.
- `src/resources/`: vị trí MCP resource handler hoặc placeholder.
- `src/prompts/`: vị trí MCP prompt handler hoặc placeholder.

## Bản Đồ Server

| Server | Plugin sở hữu | Tool được khai báo |
| --- | --- | --- |
| `architecture` | `architecture` | `architecture.generate_system_design`, `architecture.review_architecture`, `architecture.generate_adr` |
| `application` | `application` | `application.review_source_code`, `application.generate_service`, `application.review_api` |
| `data` | `data` | `data.analyze_schema`, `data.review_index`, `data.migration_plan` |
| `knowledge` | `knowledge` | `knowledge.generate_readme`, `knowledge.generate_runbook`, `knowledge.review_docs` |
| `platform` | `platform` | `platform.review_docker`, `platform.review_kubernetes`, `platform.deployment_plan` |
| `quality` | `quality` | `quality.generate_test_plan`, `quality.review_coverage`, `quality.performance_review` |
| `security` | `security` | `security.scan_source`, `security.scan_dependencies`, `security.generate_threat_model` |

## Quan Hệ Với Luồng Install

Khi người dùng chạy
`ai-engineering install <plugin...> --target <provider> --scope <project|global>`:

1. Dependency graph resolve các plugin được yêu cầu.
2. Lifecycle builder gom command, skill, adapter và MCP runtime được khai báo
   trong manifest plugin.
3. File server được copy vào scope đã chọn dưới
   `.ai-engineering/mcp-servers/<plugin>/`.
4. Runtime dùng chung được copy một lần vào
   `.ai-engineering/core/mcp/stdio-runtime.js`.
5. Cấu hình native của Codex, Claude hoặc Cursor trỏ tới entrypoint tuyệt đối
   `.ai-engineering/mcp-servers/<plugin>/src/index.js`.
6. Ownership metadata ghi nhận runtime và config entry được quản lý để
   uninstall/update vẫn bảo toàn cấu hình của người dùng.

## Checklist Thay Đổi

- Thêm hoặc đổi tên MCP tool đồng thời trong `mcp.json`,
  `plugin.yaml.runtime.mcp.tools`, metadata command và routing registry. Không
  lặp lại tool id trong `src/server.js`.
- Khai báo input/output schema và annotation cho tool đã triển khai.
- Giữ tên thư mục server theo phạm vi `<plugin>`.
- Không đưa lại folder provider plugin legacy làm runtime path đang hoạt động.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` và smoke test dự án đích sau thay đổi MCP contract.
