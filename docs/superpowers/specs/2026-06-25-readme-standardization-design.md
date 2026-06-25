# Thiết kế: Chuẩn hóa README

- Ngày: 2026-06-25
- Trạng thái: Đã duyệt thiết kế, chờ duyệt spec
- Phạm vi: Toàn repo `ai-engineering-platform` (loại trừ `node_modules/`)

## 1. Bối cảnh và hiện trạng

Repo chiếu nội dung canonical thành file native cho nhiều provider. Tài liệu chủ
yếu đi theo cặp `README.md` / `README_VI.md` (xem `CLAUDE.md`), nhưng các README
hiện không nhất quán. Các điểm đã xác minh bằng cách đọc trực tiếp:

- **Thiếu cặp song ngữ:** `cli/README.md`, `cli/scripts/README.md`,
  `adapters/codex/README.md`, `adapters/antigravity/README.md` chỉ có bản EN.
  Có cặp đủ: gốc, `core/`, `plugins/`, `providers/`, `docs/`.
- **Tên mục "cấu trúc" mỗi nơi một kiểu:** "Project Structure" (gốc),
  "Folder Map" (`cli/`, `core/`), "Layout" (`cli/scripts/`),
  "Plugin Anatomy" (`plugins/`).
- **Cặp EN/VI gốc bị lệch:** `README_VI.md` có badge phiên bản và mục
  "Development"; `README.md` không có badge và dùng "Maintainer Workflow"; danh
  sách `Contents` và thứ tự mục khác nhau.
- **Quy ước rời rạc đã tồn tại:** `plugins/README.md` và `core/README.md` có sẵn
  câu "Update English README.md first, then synchronize README_VI.md" và mục
  "Change Checklist"; các README khác không theo.
- **Standard hiện có chỉ tiếng Anh:** `core/standards/` gồm
  `agent-authoring-standard.md`, `skill-authoring-standard.md`,
  `output-format-standard.md` — đều không có bản VI.
- **Cơ chế validate:** `aie validate` gọi `validateRepository(root)` trong
  `cli/src/contracts.mjs:454`, gom lỗi vào mảng `errors` rồi `throw`
  `PlatformError` nếu có lỗi. Mô hình hiện tại là pass/fail, chưa có "warning".

## 2. Mục tiêu và phạm vi

### Trong phạm vi
- Viết một chuẩn README: `core/standards/readme-authoring-standard.md`.
- Áp dụng chuẩn lại cho các README hiện có (vá thiếu, đồng bộ cặp, thống nhất
  heading).
- Thêm kiểm tra README **cứng** (fail `aie validate`) và test tự động.

### Ngoài phạm vi
- Tạo README mới cho `completions/` và cấp `adapters/` (đang không có README).
- README trong `node_modules/`.
- Dịch các standard khác sang VI.
- Tự động commit (sẽ hỏi trước theo quy ước repo).

## 3. Chuẩn README

### 3.1 Phân tầng

| Tầng | Đường dẫn | Yêu cầu song ngữ |
| --- | --- | --- |
| A — Directory README | gốc, `core/`, `plugins/`, `providers/`, `docs/`, `cli/` | Bắt buộc cặp `README.md` + `README_VI.md`. EN là canonical. |
| B — Technical README | `cli/scripts/`, `adapters/codex/`, `adapters/antigravity/` | Chỉ cần `README.md` (EN). VI tùy chọn. |

### 3.2 Cấu trúc canonical cho README tầng A

Thứ tự bắt buộc:

1. **H1 title** — tên riêng của thành phần. Đúng một H1 trên toàn file.
2. **Đoạn mở đầu** — thành phần này sở hữu gì và khi nào dùng.
3. **`## Structure`** — bảng cấu trúc, cột tối thiểu `Path` (hoặc `Folder`) và
   `Purpose`; cho phép thêm cột như `Edit When`. Đây là tên mục thống nhất thay
   cho "Project Structure" / "Folder Map" / "Layout" / "Plugin Anatomy".
4. **Các mục domain** — tùy thành phần, giữ nguyên nội dung hữu ích hiện có.
5. **`## Change Checklist`** (footer chuẩn) — luôn gồm hai dòng:
   - "Update English README.md first, then synchronize README_VI.md".
   - Nhắc chạy `npm run validate` khi thay đổi liên quan tới phần được validate.

### 3.3 Quy ước song ngữ EN/VI

- EN (`README.md`) là canonical; sửa EN trước, đồng bộ VI sau.
- Cặp EN/VI phải có **cùng tập heading và cùng thứ tự**.
- Khối code và lệnh shell **giống hệt** giữa hai bản; chỉ dịch phần văn xuôi.
- Không đặt badge phiên bản trong README; tham chiếu phiên bản qua
  `CHANGELOG.md`.

### 3.4 README tầng B

- Có đúng một H1 và một đoạn mở đầu.
- `## Structure` áp dụng khi có mô tả thư mục con (ví dụ `cli/scripts/`).
- Không bắt buộc bản VI và không bắt buộc `## Change Checklist`.

## 4. Validator

Thêm hàm `validateReadmeStandard(root, errors)` và gọi từ
`validateRepository(root)` trong `cli/src/contracts.mjs`. Chế độ: **enforce** —
mọi vi phạm đẩy vào `errors`, khiến `aie validate` fail (không dùng warning).

Quy tắc enforce:

1. Mỗi đường dẫn tầng A phải có cả `README.md` lẫn `README_VI.md`.
2. Không tồn tại `README_VI.md` mồ côi (không có `README.md` cùng cấp), loại trừ
   `node_modules/`.
3. Mỗi README dự án bắt đầu bằng đúng một dòng H1 (`# `).
4. Cặp EN/VI tầng A phải bằng nhau về **số lượng heading** (bắt drift cấu trúc).

Không hard-enforce: từ vựng heading chi tiết và thứ tự mục — các quy tắc văn
phong này chỉ nằm trong tài liệu chuẩn để tránh validator giòn.

Danh sách đường dẫn tầng A và tầng B được khai báo tường minh trong validator
(không suy đoán theo cây thư mục), khớp với mục 3.1.

## 5. Kế hoạch áp dụng (theo file)

1. Tạo `core/standards/readme-authoring-standard.md` (EN, khớp các standard anh
   em — không tạo bản VI).
2. Thêm `cli/README_VI.md` dịch từ `cli/README.md`.
3. Đồng bộ cặp gốc `README.md` ↔ `README_VI.md`:
   - Khớp tên và thứ tự mục; thống nhất "Maintainer Workflow" / "Development".
   - Khớp danh sách `Contents`.
   - Bỏ badge phiên bản trong `README_VI.md`.
4. Thống nhất heading mục cấu trúc về `## Structure` ở `core/README.md`,
   `plugins/README.md`, `cli/README.md`, `cli/scripts/README.md` và các bản VI
   tương ứng (`core/README_VI.md`, `plugins/README_VI.md`).
5. Thêm footer `## Change Checklist` cho README tầng A đang thiếu: gốc,
   `providers/` (cặp EN/VI), `docs/` (cặp EN/VI), `cli/` (EN + VI mới).
6. Cắm `validateReadmeStandard` vào `validateRepository` và bật enforce sau khi
   các bước 1–5 hoàn tất.

Lưu ý mã hóa: giữ nguyên BOM của các file UTF-8 hiện có khi sửa; file mới ghi
UTF-8 (có diacritics đúng cho nội dung tiếng Việt).

## 6. Kiểm thử

- Thêm `cli/test/readme-standard.test.mjs`: dựng cây tạm có/không cặp, orphan VI,
  thiếu H1, lệch số heading; khẳng định `validateRepository` (hoặc helper) fail
  đúng trường hợp và pass khi hợp lệ.
- Chạy `npm run build:cli` rồi `node --test cli/test/readme-standard.test.mjs`.
- Chạy `npm run validate` trên repo thật để xác nhận pass sau khi áp dụng.

## 7. Rủi ro và rollback

- **Rủi ro:** bật enforce trước khi vá hết README sẽ làm fail CI. Giảm thiểu:
  thực hiện bước 6 sau cùng, chỉ sau khi 1–5 xong và `npm run validate` xanh.
- **Rủi ro:** đổi heading hàng loạt có thể làm hỏng anchor link nội bộ (mục
  `Contents` trỏ tới heading cũ). Giảm thiểu: cập nhật đồng thời các anchor trong
  cùng file.
- **Rollback:** thay đổi thuần tài liệu + một hàm validator; revert commit là đủ.

## 8. Tiêu chí hoàn tất

- `core/standards/readme-authoring-standard.md` tồn tại và mô tả đủ mục 3.
- Mọi README tầng A có cặp EN/VI cùng tập heading; mục cấu trúc là `## Structure`.
- README tầng A có footer `## Change Checklist`.
- `validateReadmeStandard` được enforce và `npm run validate` pass.
- `cli/test/readme-standard.test.mjs` pass.
