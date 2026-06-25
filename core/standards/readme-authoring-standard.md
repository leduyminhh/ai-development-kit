# Readme Authoring Standard

- README EN (`README.md`) là canonical; sửa EN trước, đồng bộ `README_VI.md` sau.
- Tier A (cặp EN+VI bắt buộc): root, `core/`, `plugins/`, `providers/`, `docs/`, `cli/`.
- Tier B (chỉ EN bắt buộc, VI tùy chọn): `cli/scripts/`, `adapters/codex/`, `adapters/antigravity/`.
- Mỗi README có đúng một H1 là tên riêng của thành phần, theo sau là đoạn mở đầu nêu thành phần sở hữu gì và khi nào dùng.
- Mục bản đồ thư mục dùng heading thống nhất: EN `## Structure`, VI `## Cấu Trúc`; bảng có cột tối thiểu `Path`/`Folder` và `Purpose`, cho thêm cột như `Edit When`.
- README Tier A kết thúc bằng `## Change Checklist` (VI `## Checklist Thay Đổi`) gồm dòng "Update English README.md first, then synchronize README_VI.md" và nhắc chạy `npm run validate` khi liên quan.
- Cặp EN/VI phải có cùng số lượng heading cấp 2 (`##`) và cùng thứ tự mục; khối code và lệnh shell giống hệt, chỉ dịch phần văn xuôi.
- Không đặt badge phiên bản trong README; tham chiếu phiên bản qua `CHANGELOG.md`.
- Khi thêm README ở thư mục mới cần được kiểm tra, đăng ký thư mục đó vào danh sách trong `validateReadmeStandard` (`cli/src/contracts.mjs`).
