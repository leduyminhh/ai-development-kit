# Providers

`providers/` quản lý các hợp đồng cấu hình hướng provider cho AI IDE và đăng ký
MCP runtime.

Tập provider target hiện tại gồm `codex`, `claude`, `cursor` và `antigravity`.
Projection file native theo provider nằm trong `adapters/`; thư mục này chỉ giữ
registry, policy, schema và ví dụ MCP dùng chung.

Repository hiện không cung cấp MCP tool active theo mặc định. Các file MCP ở đây
chỉ là registry, policy, schema và ví dụ để tương lai có cấu trúc chuẩn mà không
ghép plugin với source code MCP server executable.

## Cấu Trúc

```text
providers/
  mcp/
    registry.json       registry MCP chưa active
    policies.json       policy runtime và ownership
    config.schema.json  schema cấu hình trung lập provider
    examples/           cấu hình ví dụ không active
```

## Quy Tắc

- Giữ `registry.json.activeTools` rỗng cho đến khi chủ động hỗ trợ một MCP
  runtime external thật.
- Đặt ví dụ trong `providers/mcp/examples/`; ví dụ chỉ dùng làm tài liệu và
  không được install như active tool.
- Không thêm source code MCP server implementation vào thư mục này.
- Provider adapters có thể đọc thư mục này để lấy policy và schema, còn plugin
  vẫn là capability manifest, không phải runtime server project.