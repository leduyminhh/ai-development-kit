# Commit Message Examples

These examples intentionally use Vietnamese commit bodies because this repository generates Vietnamese commit descriptions by default. The surrounding guidance remains English-only.

## Long Database Body

```text
feat(databases): add PostgreSQL per-db backup layout

Changed:
- Thêm layout combined/per-db và backup theo bảng cho PostgreSQL.
  • per-db ghi mỗi database vào một thư mục con.
  • Mode full kèm globals.sql.gz.
  • Cờ --table ánh xạ từ POSTGRES_BACKUP_TABLES.

- Theo dõi job thống nhất bằng job_group và source.
  • Luồng list bao gồm cả registry, cron và ad-hoc.
  • Health-check và metrics bỏ qua timestamp rỗng.

- Tách flow thực thi và log theo loại thao tác.
  • Backup ghi backup.log; restore tiếp tục ghi restore.log.
  • Cờ --detach re-exec job qua setsid sau khi validate config.

Reason:
- Hỗ trợ backup nhiều database hoặc bảng thành artifact tách bạch, có thể verify và restore độc lập.

- Dùng một nguồn sự thật cho định danh job và tránh tính sai last-success/next-run.

Important notes / Breaking impact:
- Cập nhật script và cron tự gọi sang --job-group và trường job_group trong job.json.
  • db-job.sh create không còn nhận tên engine làm --id.
  • Chưa smoke test với PostgreSQL thật.
```

## Feature

```text
feat(rtsp): add ffmpeg reconnect configuration

Changed:
- Thêm cấu hình reconnect cho luồng RTSP qua FFmpeg.
  • Hỗ trợ retry timeout và reconnect delay riêng cho từng stream.

- Đồng bộ flow khởi tạo process để áp dụng runtime config mới.

Reason:
- Cần giảm tình trạng stream bị chết khi camera mất kết nối tạm thời.

Important notes / Breaking impact:
- Thêm biến môi trường bắt buộc:
  • RTSP_RECONNECT_DELAY
  • RTSP_RECONNECT_TIMEOUT
  • FFMPEG_MAX_QUEUE

- Cần cập nhật .env cho staging và production trước khi deploy.
```

## Fix

```text
fix(audit): use Ho Chi Minh date for audit file names

Changed:
- Đặt tên file audit theo Asia/Ho_Chi_Minh thay vì timezone mặc định.
  • Tránh lệch ngày khi chạy gần nửa đêm UTC.

- Giữ nguyên timestamp UTC trong nội dung log để không ảnh hưởng hệ thống đối soát.

Reason:
- Cần đồng bộ ngày vận hành audit theo múi giờ Việt Nam.

Important notes / Breaking impact:
- Script parse tên file cũ có thể cần cập nhật lại pattern.
```

## Refactor

```text
refactor(camera): simplify stream session lifecycle

Changed:
- Gom logic quản lý session stream vào service lifecycle chung.
  • Loại bỏ flow cleanup trùng lặp giữa reconnect và shutdown.

- Tách validation camera state khỏi process startup.

Reason:
- Giảm coupling giữa session manager và FFmpeg worker.
- Dễ maintain reconnect flow hơn khi mở rộng multi-stream support.
```
