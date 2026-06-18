# Docs

`docs/` chứa tài liệu repository ổn định: hồ sơ migration, quyết định thiết kế,
lý do cleanup và ghi chú triển khai cần tồn tại lâu hơn một task hoặc PR.

Không dùng thư mục này như nơi đổ report sinh tự động. Chỉ đưa report vào
`docs/` khi nó trở thành tài liệu tham chiếu được bảo trì của dự án.

## Bản Đồ Thư Mục

| Thư mục | Sở hữu nội dung gì | Sửa khi nào |
| --- | --- | --- |
| `migration/` | Đặc tả migration, legacy review matrix và completion checklist. | Khi kế hoạch migration, cấu trúc canonical, danh sách deprecated path hoặc acceptance criteria thay đổi. |

## Tài Liệu Migration

- `migration/migrate-existing-source-to-plugins-platform.md`: target migration
  hiện tại theo hướng plugin-first cho AI IDE plugin và artifact sinh bởi
  adapter.
- `migration/implementation-spec-v1.1.md`: thiết kế migration MCP-first lịch sử,
  được giữ lại làm ngữ cảnh cho các quyết định cấu trúc trước đó.
  chúng được thay thế, deprecate, giữ lại hoặc xóa.
- `migration/completion-checklist.md`: checklist lịch sử cho acceptance criteria
  của đợt migration trước.

## Nội Dung Nên Đặt Ở Đây

- Tài liệu kiến trúc hoặc migration giải thích vì sao cấu trúc repository tồn
  tại.
- Ghi chú handoff bền vững cho maintainer sau này.
- Quyết định cleanup cần truy vết sau khi legacy path bị xóa.
- Tài liệu xuyên package không thuộc riêng một plugin.

## Nội Dung Không Nên Đặt Ở Đây

- Output lệnh tạm thời, scan report hoặc ghi chú debug cục bộ.
- Tài liệu usage do plugin sở hữu. Ưu tiên tài liệu thật sự được bảo trì trong
  plugin sở hữu; không tạo README placeholder chỉ để giữ folder.
- Tài liệu registry MCP provider; đặt trong `providers/README.md` hoặc
  `providers/mcp/`.

## Checklist Thay Đổi

- Giữ mọi nhận định truy vết được tới code, config, test, migration spec hoặc
  quyết định rõ ràng.
- Giữ ngữ cảnh lịch sử khi cập nhật tài liệu migration; không âm thầm viết lại
  quyết định cũ như thể chúng chưa từng thay đổi.
- Cập nhật `README.md` tiếng Anh trước, rồi đồng bộ `README_VI.md`.
- Chạy `npm run validate` sau thay đổi tài liệu ảnh hưởng tới cấu trúc, command
  id, MCP tool id hoặc acceptance rule của migration.
