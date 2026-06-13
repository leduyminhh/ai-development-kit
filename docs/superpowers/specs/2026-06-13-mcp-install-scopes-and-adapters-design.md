# MCP Install Scopes And Adapter Verification Design

## Mục tiêu

Nâng cấp nền tảng để:

1. Mọi MCP tool đã khai báo đều có handler thực thi được.
2. CLI hỗ trợ cài capability theo scope `project` và `global`.
3. Adapter Codex, Claude và Cursor sinh đúng cấu hình MCP của từng IDE và được
   kiểm chứng end-to-end.

## Phạm vi

Thiết kế áp dụng cho bảy capability pack hiện có:

- `architecture`
- `application`
- `data`
- `knowledge`
- `platform`
- `quality`
- `security`

Không bổ sung transport HTTP, registry từ xa hoặc cơ chế tự cập nhật package
trong thay đổi này. MCP server tiếp tục dùng stdio và runtime Node.js dùng chung.

## Kiến trúc

CLI giữ một mô hình MCP server chuẩn gồm `name`, `command`, `args` và `env`.
Provider adapter chuyển mô hình này sang định dạng native của từng IDE. Runtime
và server source được cài vào scope đã chọn; config provider chỉ trỏ tới
entrypoint thuộc scope đó.

Các trách nhiệm được tách như sau:

- `cli/src/lifecycle.mjs`: resolve pack, runtime root và desired state.
- `cli/src/mcp-config.mjs`: mô hình cấu hình MCP chuẩn và merge cấu hình an toàn.
- `cli/src/install-scope.mjs`: resolve đường dẫn project/global.
- `cli/src/providers.mjs`: projection skill, command và MCP config theo provider.
- `cli/src/doctor.mjs`: kiểm tra runtime, config và adapter theo scope.
- `mcp-servers/*-mcp`: contract và handler thuộc capability.
- `core/mcp/stdio-runtime.js`: protocol, dispatch và startup validation dùng
  chung.

## Giao diện CLI

Các lệnh lifecycle nhận `--scope project|global`. Giá trị mặc định là
`project` để giữ tương thích:

```powershell
ai-engineering install platform --target codex --scope project
ai-engineering install --all --target codex,claude,cursor --scope global
ai-engineering doctor --scope global
ai-engineering list --scope global
ai-engineering uninstall platform --scope global
```

`--target` tiếp tục chỉ provider. Không đổi tên cờ này trong phạm vi hiện tại.
CLI từ chối scope hoặc provider không hợp lệ bằng lỗi có mã và hướng dẫn sửa.

## Bố trí theo scope

### Project scope

Runtime:

```text
<project>/.ai-engineering/core/mcp/
<project>/.ai-engineering/mcp-servers/
```

Provider config:

| Provider | Config |
| --- | --- |
| Codex | `<project>/.codex/config.toml` |
| Claude | `<project>/.mcp.json` |
| Cursor | `<project>/.cursor/mcp.json` |

Skill, command, agent và rule projection vẫn nằm trong project như hiện tại.

### Global scope

Runtime:

```text
<home>/.ai-engineering/core/mcp/
<home>/.ai-engineering/mcp-servers/
```

Provider config:

| Provider | Config |
| --- | --- |
| Codex | `<home>/.codex/config.toml` |
| Claude | `<home>/.claude.json` |
| Cursor | `<home>/.cursor/mcp.json` |

Global install chỉ quản lý runtime, MCP registrations và state toàn cục. Nó
không ghi `AGENTS.md`, command, rule hoặc skill vào một project ngẫu nhiên.

State toàn cục nằm dưới `<home>/.ai-engineering/` và dùng cùng ownership contract
với project scope.

## Provider projection

### Codex

Mỗi server được ghi thành TOML table:

```toml
[mcp_servers.platform]
command = "node"
args = ["<absolute-entrypoint>"]
```

Project và user config dùng cùng cấu trúc. Merge chỉ thay table
`mcp_servers.<managed-name>`; các key khác được bảo toàn.

### Claude

Project scope dùng `.mcp.json`:

```json
{
  "mcpServers": {
    "platform": {
      "command": "node",
      "args": ["<absolute-entrypoint>"],
      "env": {}
    }
  }
}
```

Global scope merge vào `mcpServers` trong `~/.claude.json`. Các project state,
authentication và user settings khác phải được bảo toàn.

### Cursor

Project scope dùng `.cursor/mcp.json`; global scope dùng `~/.cursor/mcp.json`.
Cả hai dùng object `mcpServers` giống mô hình JSON chuẩn. Adapter tiếp tục sinh
rules hiện có ở project scope, nhưng global scope không sinh project rules.

## Merge, ownership và backup

- Parser có cấu trúc được dùng cho JSON và TOML; không nối chuỗi tùy ý.
- Trước lần sửa đầu tiên đối với config đã tồn tại, CLI tạo backup có timestamp
  dưới `<state-root>/backups/provider-config/`.
- Chỉ MCP entry do platform quản lý được update hoặc remove.
- Entry trùng tên nhưng chưa có ownership gây conflict; `--force` mới cho phép
  nhận quyền quản lý entry đó.
- Transaction phải rollback cả runtime, state và provider config khi một bước
  thất bại.
- Đường dẫn entrypoint được chuẩn hóa tuyệt đối để IDE có thể khởi động server
  từ mọi working directory.

## Hoàn thiện MCP handler

Mỗi tool trong `mcp-servers/*-mcp/mcp.json` phải có:

- Structured tool definition với input schema, output schema và annotations.
- Một handler trong `src/tools/`.
- Registration rõ ràng trong `src/server.js`.
- Validation input và lỗi có thể hành động.
- `structuredContent` ổn định để adapter/client có thể dùng kết quả.

Runtime validate contract-handler parity khi server khởi động. Server không được
start nếu có tool khai báo thiếu handler hoặc handler không có contract tương
ứng. Cơ chế fail-loud lúc gọi tool hiện tại được giữ như lớp bảo vệ phụ, không
còn là trạng thái hợp lệ của server phát hành.

Handler trong giai đoạn này là workflow-oriented và read-only: phân tích input,
trả checklist, kế hoạch, findings hoặc artifact model. Chúng không tự chạy lệnh
phá hủy hay ghi source của target project.

## Doctor và adapter verification

`doctor --scope <scope>` kiểm tra:

1. State và ownership đúng scope.
2. Runtime và từng MCP entrypoint tồn tại.
3. Provider config parse được và chứa đúng managed registrations.
4. Command, args và entrypoint trong config khớp state.
5. Mỗi server khởi động, trả lời `initialize`, `tools/list` và `ping`.
6. Contract-handler parity hợp lệ.

Adapter smoke test chạy cho ma trận:

| Scope | Codex | Claude | Cursor |
| --- | --- | --- | --- |
| Project | required | required | required |
| Global | required | required | required |

Test không phụ thuộc binary IDE để giữ deterministic. Khi binary có sẵn, một
optional smoke check chạy lệnh native như `codex mcp list` hoặc
`claude mcp list`; thiếu binary được báo `skipped`, không làm unit/integration
suite thất bại.

## Chiến lược test

- Unit test cho scope resolver, config model, JSON merge và TOML merge.
- Contract test bảo đảm mọi declared tool có handler.
- MCP integration test gọi ít nhất một valid case và một invalid case cho từng
  tool.
- Lifecycle test cài, update, uninstall và rollback cho cả hai scope.
- Adapter test parse output và xác nhận giữ nguyên config user-owned.
- End-to-end smoke test cài bảy pack cho ba provider, chạy doctor rồi khởi động
  toàn bộ entrypoint đã sinh.

Checklist cuối:

```powershell
npm test
npm run validate
npm run build:cli
```

## Tương thích và migration

- Không truyền `--scope` tương đương `--scope project`.
- `.mcp.json` project hiện có tiếp tục được Claude sử dụng.
- Codex và Cursor được bổ sung config native; file user-owned không bị thay thế
  toàn bộ.
- Project đã cài trước đó được nâng cấp bằng `ai-engineering update --all`; CLI
  thêm registrations mới và cập nhật ownership.
- Uninstall chỉ xóa entry managed, không xóa provider config nếu vẫn còn nội
  dung của người dùng.

## Rủi ro và rollback

- Provider có thể đổi schema config: cô lập format trong provider projection và
  contract test để giảm phạm vi sửa.
- Config global có dữ liệu nhạy cảm: không log toàn bộ file hoặc đưa nội dung
  backup vào output.
- Absolute path làm install không portable giữa máy: mỗi máy phải chạy install;
  không commit global config.
- Rollback dùng backup provider config và transaction journal. Nếu rollback
  không hoàn tất, CLI phải báo chính xác file cần phục hồi, không báo thành công.

## Tiêu chí hoàn thành

- Tất cả 21 tool hiện có thực thi handler và không còn kết quả `has no handler`.
- Cài đặt, doctor, update và uninstall hoạt động ở project/global scope.
- Codex, Claude và Cursor nhận đúng MCP registration theo scope.
- Sáu tổ hợp provider/scope vượt qua smoke test deterministic.
- Checklist repository vượt qua và mọi kiểm tra optional bị skip được báo rõ.
