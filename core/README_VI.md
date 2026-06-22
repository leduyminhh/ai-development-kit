# Core

`core/` là lớp hợp đồng dùng chung của AI Engineering Platform. Các file ở đây
định nghĩa rule, registry, schema, standard, template và workflow cấp platform để
plugin, adapter, provider config và CLI cùng sử dụng.

Dùng thư mục này khi một rule hoặc hợp đồng trung lập provider và có thể tái sử
dụng bởi nhiều AI IDE plugin. Hành vi riêng của từng plugin phải nằm trong
`plugins/<plugin>/`.

## Bản Đồ Thư Mục

| Thư mục | Sở hữu nội dung gì | Sửa khi nào |
| --- | --- | --- |
| `agents/` | AGENTS baseline được quản lý, template AGENTS cho dự án đích và merge policy dùng bởi `ai-engineering init`. | Khi instruction sinh ra cho project hoặc ranh giới merge thay đổi. Luôn giữ nội dung người dùng sở hữu ngoài managed block. |
| `routing/` | Registry intent, command và skill để nối user intent với command của plugin. | Khi thêm, đổi tên hoặc xóa command id, skill id hoặc intent route. Giữ khớp với `plugin.yaml`. |
| `schemas/` | JSON schema cho các hợp đồng platform như metadata plugin và install state. | Khi serialized contract thay đổi. Cập nhật validator và fixture trong cùng thay đổi. |
| `standards/` | Chuẩn authoring cho agent, skill và định dạng output. | Khi chuẩn viết hoặc chuẩn hành vi cấp repository thay đổi. Không đặt ghi chú quy trình riêng của plugin ở đây. |
| `templates/` | Template tái sử dụng cho tài sản được sinh hoặc scaffold. | Khi nhiều plugin hoặc generator cần cùng một cấu trúc khởi tạo. |
| `workflows/` | Workflow definition dùng chung và orchestration xuyên plugin. | Khi workflow trải qua nhiều plugin hoặc là một phần baseline platform. |

## Hợp Đồng Quan Trọng

- `core/agents/AGENTS.template.md` là file đầu tiên được copy cho dự án đích mới.
- `core/agents/AGENTS.baseline.md` là managed block có thể được refresh trong
  `AGENTS.md` đã tồn tại ở dự án đích.
- `core/routing/command-registry.yaml` phải tham chiếu command file có thật dưới
  `plugins/<plugin>/commands/`.
- `core/workflows/*.yaml` định nghĩa workflow orchestration dùng chung có thể
  được CLI list, validate, build và sử dụng.
- Registry, policy và ví dụ MCP thuộc `providers/mcp/`.

## Checklist Thay Đổi

- Đọc plugin sở hữu, runtime code và test liên quan trước khi đổi hợp đồng dùng
  chung.
- Giữ hướng dependency đi vào trong: plugin, adapter và CLI có thể phụ thuộc
  `core/`; `core/` không nên phụ thuộc chi tiết triển khai của plugin.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` sau khi đổi routing, schema, standard, template hoặc
  AGENTS baseline.