# Core

`core/` là lớp hợp đồng dùng chung của AI Engineering Platform. Các file ở đây
định nghĩa rule, registry, schema và template cấp platform để pack, adapter, MCP
server và CLI cùng sử dụng.

Dùng thư mục này khi một rule hoặc hợp đồng trung lập theo provider và có thể
tái sử dụng bởi nhiều capability pack. Hành vi riêng của từng pack phải nằm
trong `packs/<pack>/`.

## Bản đồ thư mục

| Thư mục | Sở hữu nội dung gì | Sửa khi nào |
| --- | --- | --- |
| `agents/` | AGENTS baseline được quản lý, template AGENTS cho dự án đích và merge policy dùng bởi `ai-engineering init`. | Khi instruction sinh ra cho project hoặc ranh giới merge thay đổi. Luôn giữ nội dung người dùng sở hữu ngoài managed block. |
| `checklists/` | Checklist dùng chung có thể được command, skill hoặc migration tham chiếu. | Khi checklist thật sự tái sử dụng được giữa nhiều pack. Checklist riêng của pack đặt trong pack sở hữu. |
| `prompts/` | Mảnh prompt trung lập theo provider và các khối prompt tái sử dụng. | Khi wording áp dụng xuyên provider hoặc pack. Output prompt riêng theo provider đặt dưới `adapters/`. |
| `routing/` | Registry intent, command và skill để nối user intent với command của pack và MCP tool contract. | Khi thêm, đổi tên hoặc xóa command id, skill id hoặc intent route. Giữ khớp với `pack.yaml` và `mcp-servers/*/mcp.json`. |
| `schemas/` | JSON schema cho các hợp đồng platform như metadata pack và install state. | Khi contract được serialize thay đổi. Cập nhật validator và fixture trong cùng thay đổi. |
| `standards/` | Chuẩn authoring cho agent, skill và định dạng output. | Khi chuẩn viết hoặc chuẩn hành vi cấp repository thay đổi. Không đặt ghi chú quy trình riêng của pack ở đây. |
| `templates/` | Template tái sử dụng cho tài sản được sinh hoặc scaffold. | Khi nhiều pack hoặc generator cần cùng một cấu trúc khởi tạo. |
| `workflows/` | Định nghĩa workflow dùng chung và ghi chú orchestration xuyên pack. | Khi workflow trải qua nhiều pack hoặc là một phần baseline platform. |

## Hợp đồng quan trọng

- `core/agents/AGENTS.template.md` là file đầu tiên được copy cho dự án đích mới.
- `core/agents/AGENTS.baseline.md` là managed block có thể được refresh trong
  `AGENTS.md` đã tồn tại ở dự án đích.
- `core/routing/command-registry.yaml` phải tham chiếu command file có thật dưới
  `packs/<pack>/commands/`.
- Tên MCP tool được routing và metadata pack tham chiếu phải tồn tại trong
  `mcp-servers/<pack>-mcp/mcp.json`.

## Checklist thay đổi

- Đọc pack sở hữu, runtime code và test liên quan trước khi đổi hợp đồng dùng chung.
- Giữ hướng dependency đi vào trong: pack, adapter và CLI có thể phụ thuộc
  `core/`; `core/` không nên phụ thuộc chi tiết triển khai của pack.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` sau khi đổi routing, schema, standard, template hoặc
  AGENTS baseline.
