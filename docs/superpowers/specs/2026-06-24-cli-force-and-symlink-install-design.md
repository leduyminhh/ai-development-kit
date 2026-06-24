# Thiết kế: Fix `--force` cho update + Symlink install mặc định (vào folder build)

- Ngày: 2026-06-24
- Phạm vi: CLI `aie` (lifecycle + transaction)
- Trạng thái: Đang brainstorm (đã pivot sang symlink-mặc-định), chờ duyệt lại

## Bối cảnh & vấn đề

Luồng projection chiếu nội dung canonical (`plugins/`) thành file provider-native rồi
ghi xuống đĩa tại thời điểm install/upgrade. Hai vấn đề:

1. **`--force` trong update/upgrade là no-op khi version trùng.** `updatePlugins`
   ([cli/src/lifecycle.mjs](../../../cli/src/lifecycle.mjs)) return sớm khi
   `applicable.length === 0`, *trước* chỗ `force` được dùng.

2. **Chưa có chế độ cài symlink.** Mục tiêu: khi source mới thì skills luôn mới
   mà không phải cài lại từng file.

## Quyết định đã chốt

- **Symlink là chế độ MẶC ĐỊNH và duy nhất** (không thêm cờ `--link` tuỳ chọn ở
  giai đoạn này). Mỗi file provider là symlink trỏ vào **một folder build chung**
  trong target.
- **Folder build đặt trong target:** `<target>/.ai-engineering/build/<relativePath>`
  (KHÔNG đặt trong thư mục package npm — xem mục "Tương thích npm").
- **Máy không hỗ trợ symlink** (Windows thiếu Developer Mode/quyền, EPERM) →
  **fallback copy + warning có hướng dẫn**. Warning nêu rõ: (a) đã chuyển sang
  copy nên file là snapshot, (b) cách bật Windows Developer Mode (Settings →
  Privacy & security → For developers → Developer Mode) hoặc chạy lại với quyền
  admin để dùng symlink, (c) nhắc chạy lại `aie update` để làm mới sau khi đổi
  nội dung.
- **Không thay đổi logic luồng remove/update.** Thiết kế symlink phải *trong suốt*
  với hai luồng này (xem Phần 3).

## Phần 1 — Fix `--force` trong update/upgrade

**Root cause:** return sớm ở `updatePlugins` (`if (dryRun || applicable.length === 0)`)
chặn trước khi `force` được dùng.

**Thay đổi:** tách điều kiện return trong `updatePlugins`:

- `dryRun` → giữ nguyên: return `{ changed: false, updates: applicable }`.
- `applicable.length === 0 && !force` → return `{ changed: false, ... }` (No updates).
- Còn lại (có update HOẶC `force`) → gọi `installPlugins({ ..., force })`.

Việc "xóa phần cũ → ghi lib mới" đã có sẵn: `planTransaction` với `force=true`
bỏ qua check drift, sinh action `remove-managed` cho file cũ không còn trong plan
và ghi đè file mới.

## Phần 2 — Symlink install mặc định (vào folder build)

**Cơ chế:** `applyTransaction` ghi file fully-managed theo chế độ symlink:

1. Materialize nội dung đã projic vào folder build
   `<target>/.ai-engineering/build/<relativePath>`.
2. Tạo symlink tại `<relativePath>` trỏ (đường dẫn tương đối) vào file build.
3. **Fallback:** nếu `symlink()` ném lỗi (EPERM/không hỗ trợ) → ghi copy trực tiếp,
   gom cảnh báo in ra cuối lệnh, kèm hướng dẫn bật Windows Developer Mode (hoặc
   chạy admin) và gợi ý chạy lại `aie update` để làm mới.

**Vì sao "source mới → skills luôn mới":** mọi file provider trỏ vào cùng folder
build. Một lần re-project (`aie update`/`aie build`) ghi lại toàn bộ folder build →
tất cả provider cập nhật đồng loạt, không cần cài lại từng file.

**Loại trừ symlink:** file merge-managed (`mergeStrategy` set: `CLAUDE.md`,
`AGENTS.md`, MCP config) **luôn** copy/merge vì chứa nội dung người dùng ngoài
managed block.

**Lưu trạng thái:** ghi `linkMode: "symlink"` vào `platform.lock`; thêm
`link: true` vào ownership của file ở chế độ symlink (vắng = copy/fallback). Đây là
phần neo để `check` báo đúng trạng thái.

## Phần 3 — Trong suốt với remove/update; check báo đúng trạng thái

**Không sửa logic remove/update.** Symlink trong suốt với hai luồng vì:

- **update/upgrade** = re-project qua `installPlugins`/`applyTransaction` y như cài
  mới: ghi lại folder build + tạo lại symlink theo đường `replace-*` sẵn có. Không
  cần nhánh đặc biệt. `linkMode` đọc lại từ lock và truyền vào `installPlugins`.
- **remove** = action `remove-managed` gọi `rm(destination)` — `rm` xoá symlink
  bình thường. Folder build nằm dưới `.ai-engineering/` (không phải provider path)
  nên không lẫn vào nội dung người dùng; khi gỡ hết plugin, dọn theo cơ chế prune
  hiện có. Không thêm nhánh symlink trong remove.

**`aie check` (`checkInstalled`) — read-only, không đổi hành vi gỡ/cập nhật:**

- Thêm `current.linkMode` (`"symlink"` | `"copy"`) đọc từ lock.
- Verify nhẹ: với mỗi file ownership có `link: true`, dùng `lstat`/`readlink` kiểm
  tra (a) đích là symlink, (b) file build tồn tại. Trả thêm
  `links: { mode, broken: [...] }`. Link gãy được liệt kê để người dùng biết cần
  chạy `aie update`.

## Tương thích npm (Step 2)

Package publish gồm `plugins`, `core`, `adapters`, `providers`, `cli`
([package.json](../../../package.json)); `bin` → `cli/dist/index.js`. CLI đọc
canonical source từ thư mục cài của package (`REPOSITORY_ROOT`).

- **Work khi publish npm** vì folder build nằm trong **target project**
  (`<target>/.ai-engineering/build/`), độc lập vị trí cài npm (global/npx/local).
- **Tuyệt đối không** đặt folder build trong thư mục package npm: `npm update -g`
  thay/relocate thư mục → symlink gãy; global install thường read-only; nhiều
  project share một cache là sai.
- "Source mới → skills mới" **không tự động tức thì**: projection phụ thuộc lựa
  chọn plugin/provider của từng target nên `npm update` không tự chạy được. Cần
  một lệnh CLI re-project (`aie update`/`aie build`); sau đó symlink phản ánh ngay.

## Kế hoạch kiểm thử

Phần 1:
- `aie update --force` re-project khi version trùng.
- `aie update` không force, version trùng → No updates (regression).

Phần 2:
- Symlink tạo đúng; đọc qua link ra nội dung đã projic đúng; trỏ vào folder build.
- Fallback copy khi `symlink` bị chặn (giả lập lỗi) + có cảnh báo.
- File merge-managed (`CLAUDE.md`/`AGENTS.md`) vẫn copy ở chế độ symlink.
- Re-project ghi lại folder build → đọc qua symlink thấy nội dung mới (chứng minh
  "source mới → skills mới").

Phần 3:
- `remove` chạy không đổi, xoá được symlink.
- `update`/`upgrade` giữ `linkMode` qua nhiều lần chạy, không cần nhánh riêng.
- `check` báo đúng `linkMode` và phát hiện link gãy.

## Rủi ro & ràng buộc

- **Symlink mặc định + Windows:** phần lớn người dùng Windows không bật Developer
  Mode sẽ luôn fallback copy → mất tính "luôn mới". Cần warning rõ + tài liệu hoá.
- `sha256File`/`readBytesIfExists` đi theo symlink (đọc nội dung build) nên check
  drift vẫn hoạt động; xác nhận trong test.
- Rollback (`restore`) ghi lại bytes thành file thường — chấp nhận cho đường hồi
  phục hiếm; ghi chú, không xử lý đặc biệt ở MVP.
