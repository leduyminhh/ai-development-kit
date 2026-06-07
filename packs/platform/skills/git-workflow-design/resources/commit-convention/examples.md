# Commit Message Examples

These examples intentionally use Vietnamese commit bodies because this repository generates Vietnamese commit descriptions by default. The surrounding guidance remains English-only.

## Feature

```text
feat(rtsp): add ffmpeg reconnect configuration

What changed:
- Thêm cấu hình reconnect cho luồng RTSP qua FFmpeg.
  • Hỗ trợ retry timeout và reconnect delay riêng cho từng stream.

- Đồng bộ flow khởi tạo process để áp dụng runtime config mới.

Why changed:
- Cần giảm tình trạng stream bị chết khi camera mất kết nối tạm thời.

Important notes / breaking impact:
- Thêm biến môi trường bắt buộc:
  • RTSP_RECONNECT_DELAY
  • RTSP_RECONNECT_TIMEOUT
  • FFMPEG_MAX_QUEUE

- Cần cập nhật `.env` cho staging và production trước khi deploy.
```

## Fix

```text
fix(audit): use Ho Chi Minh date for audit file names

What changed:
- Đặt tên file audit theo Asia/Ho_Chi_Minh thay vì timezone mặc định.
  • Tránh lệch ngày khi chạy gần nửa đêm UTC.

- Giữ nguyên timestamp UTC trong nội dung log để không ảnh hưởng hệ thống đối soát.

Why changed:
- Cần đồng bộ ngày vận hành audit theo múi giờ Việt Nam.

Important notes / breaking impact:
- Script parse tên file cũ có thể cần cập nhật lại pattern.
```

## Refactor

```text
refactor(camera): simplify stream session lifecycle

What changed:
- Gom logic quản lý session stream vào service lifecycle chung.
  • Loại bỏ flow cleanup trùng lặp giữa reconnect và shutdown.

- Tách validation camera state khỏi process startup.

Why changed:
- Giảm coupling giữa session manager và FFmpeg worker.
- Dễ maintain reconnect flow hơn khi mở rộng multi-stream support.
```
