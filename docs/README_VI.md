# Docs

`docs/` chứa tài liệu repository ổn định: hồ sơ migration, quyết định thiết kế,
lý do cleanup và ghi chú triển khai cần tồn tại lâu hơn một task hoặc PR.

Không dùng thư mục này như nơi đổ report sinh tự động. Chỉ đưa report vào
`docs/` khi nó trở thành tài liệu tham chiếu được bảo trì của dự án.

## Bản đồ thư mục

| Thư mục | Sở hữu nội dung gì | Sửa khi nào |
| --- | --- | --- |
| `migration/` | Đặc tả migration MCP-first, legacy review matrix và completion checklist. | Khi kế hoạch migration, cấu trúc canonical, danh sách deprecated path hoặc acceptance criteria thay đổi. |

## Tài liệu migration

- `migration/implementation-spec-v1.1.md`: nguồn thiết kế chính cho kiến trúc
  MCP-first capability-pack, layout dự án đích, lifecycle CLI, adapter
  generation, validation, doctor và các phase cleanup.
- `migration/legacy-review-matrix.md`: bảng quyết định cho folder legacy và việc
  chúng được thay thế, deprecate, giữ lại hoặc xóa.
- `migration/completion-checklist.md`: checklist cuối cho biết phần migration nào
  đã hoàn tất và acceptance criteria nào đã được kiểm chứng.

## Nội dung nên đặt ở đây

- Tài liệu kiến trúc hoặc migration giải thích vì sao cấu trúc repository tồn tại.
- Ghi chú handoff bền vững cho maintainer sau này.
- Quyết định cleanup cần truy vết sau khi legacy path bị xóa.
- Tài liệu xuyên package không thuộc riêng một pack.

## Nội dung không nên đặt ở đây

- Output lệnh tạm thời, scan report hoặc ghi chú debug cục bộ.
- Tài liệu usage do pack sở hữu; đặt trong `packs/<pack>/README.md`.
- Tài liệu runtime MCP server; đặt trong `mcp-servers/README.md` hoặc thư mục
  server sở hữu.

## Checklist thay đổi

- Giữ mọi nhận định truy vết được tới code, config, test, migration spec hoặc
  quyết định rõ ràng.
- Giữ ngữ cảnh lịch sử khi cập nhật tài liệu migration; không âm thầm viết lại
  quyết định cũ như thể chúng chưa từng thay đổi.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` sau thay đổi tài liệu ảnh hưởng tới cấu trúc, command
  id, MCP tool id hoặc acceptance rule của migration.
