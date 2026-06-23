# Thiết kế nâng cấp `aie install` interactive

Ngày: 2026-06-22

## Mục tiêu

Chuẩn hóa `aie install` thành luồng interactive CLI ít nhập liệu: người dùng chủ yếu dùng `Space` để bật/tắt lựa chọn và `Enter` để đi tiếp. CLI tự phát hiện ngữ cảnh project/provider, đề xuất plugin phù hợp, render install plan, tự áp dụng cài đặt, và có state để resume nếu phiên bị gián đoạn.

## Phạm vi

Trong phạm vi đầu tiên:

- Nâng cấp riêng lệnh `aie install`.
- Giữ compatibility với các mode hiện có: non-interactive `--yes`, `--json`, `--all`, `--target`, `--scope`.
- Tận dụng pipeline hiện có: `install-request -> install-wizard -> install-plan -> lifecycle`.
- Thêm interactive checklist cho plugin/provider/scope/confirm.
- Thêm đề xuất plugin dựa trên project context.
- Thêm lựa chọn cài tất cả plugin trong wizard.
- Thêm resumable state cho install session.

Ngoài phạm vi lần đầu:

- Không tạo `aie setup` tổng hợp.
- Không thay toàn bộ workflow engine.
- Không đổi format plugin manifest lớn nếu chưa cần.

## Hành vi người dùng

Khi chạy `aie install` không tham số trong TTY:

1. CLI detect provider từ project, ví dụ `.codex`, `.cursor`, `CLAUDE.md`, `.mcp.json`.
2. CLI detect project context từ file tín hiệu, package/dependency, và cấu trúc repo.
3. CLI đề xuất danh sách plugin mặc định.
4. Người dùng dùng `Space` để bật/tắt plugin, `Enter` để xác nhận step.
5. Có item `Install all plugins` để chuyển nhanh sang cài toàn bộ.
6. CLI render install plan bằng nội dung rõ ràng trước khi ghi file.
7. Người dùng `Enter` để apply, hoặc chọn back/cancel.
8. Nếu bị dừng, chạy lại `aie install` sẽ hỏi resume phiên trước hoặc bắt đầu mới.

## Thiết kế kỹ thuật

### 1. Auto detection

Thêm module detection dành cho install, ví dụ `cli/src/install-detection.mjs`.

Nguồn tín hiệu ban đầu:

- Provider: dùng lại `detectProviders` hiện có.
- Java/Spring, Python, React/Node: dựa trên `pom.xml`, `build.gradle`, `pyproject.toml`, `requirements.txt`, `package.json`, framework dependencies.
- Documentation/architecture signals: `docs/`, `adr/`, `*.puml`, `*.drawio`, kiến trúc nhiều module.
- Security/quality signals: dependency manifests, lockfiles, CI config, test directories.

Mapping đề xuất plugin mặc định:

- Luôn ưu tiên `platform` nếu project chưa có nền AI Engineering.
- React/Node/app signals -> `application`, `quality`.
- Java/Python/backend signals -> `architecture`, `quality`.
- Lockfiles/CI/secrets/security keywords -> `security`.
- Multi-module/docs/ADR signals -> `architecture`.

Detection trả về dữ liệu có lý do để UI giải thích: `{ pluginId, confidence, reasons }`.

### 2. Interactive CLI

Nâng `cli/src/install-wizard.mjs` từ prompt nhập số sang component terminal checklist.

Phím hỗ trợ:

- `Space`: bật/tắt item hiện tại.
- `Enter`: xác nhận step.
- `Up/Down` hoặc `j/k`: di chuyển.
- `a`: toggle `Install all plugins` khi đang ở step plugin.
- `b`: quay lại step trước.
- `q` hoặc `Esc`: cancel.

Nếu terminal không hỗ trợ raw keypress, fallback về prompt số hiện tại để giữ tương thích.

### 3. Template/render layer

Không đưa template engine lớn ngay từ đầu. Tách render thành các hàm thuần trong install wizard/plan:

- `renderPluginSelectionStep(context)`
- `renderProviderSelectionStep(context)`
- `renderScopeStep(context)`
- `renderConfirmStep(plan)`

Các hàm này nhận state/config và trả text model để sau này có thể thay bằng config-driven template engine.

### 4. Resumable state

Thêm install session state tại project target:

- `.ai-engineering/install/session.json`
- `.ai-engineering/install/events.jsonl`

State tối thiểu:

- `schemaVersion`
- `sessionId`
- `status`: `running | completed | cancelled | failed`
- `currentStep`
- `draft`: rootPlugins/all/providers/optionalPlugins/scope/force
- `detectedProviders`
- `detectedPlugins`
- `planHash`
- `createdAt`, `updatedAt`

Resume policy:

- Nếu có session `running`, `aie install` hỏi resume bằng Enter mặc định.
- Nếu config/plugin catalog thay đổi làm `planHash` lệch, CLI rebuild plan từ draft và báo rõ.
- Sau apply thành công, đánh dấu `completed`.
- `--yes` và non-interactive không resume trừ khi sau này có flag explicit.

### 5. Auto install

Giữ `prepareInstallation` và `applyPreparedInstallation` làm nguồn sự thật. Wizard chỉ tạo intent/plan rồi gọi lifecycle hiện có. Nếu project chưa init, lifecycle tiếp tục auto init như hiện tại.

## Kiểm thử

Cần thêm test cho:

- `aie install` non-TTY vẫn yêu cầu explicit choices như hiện tại.
- Detection đề xuất plugin từ fixture React/Node.
- Detection đề xuất plugin từ fixture Java/Python/backend.
- Wizard plugin checklist hỗ trợ toggle và `Install all` qua prompter giả lập.
- Resume ghi/đọc session draft đúng.
- Existing direct install tests vẫn pass.

## Rủi ro và giảm thiểu

- Raw terminal input có thể khác nhau theo shell: giữ fallback prompt số.
- Auto-detect có thể đề xuất sai: luôn cho user toggle bằng Space và hiển thị lý do.
- State cũ có thể stale: dùng `planHash` và rebuild plan an toàn.
- Thay đổi wizard có thể ảnh hưởng non-interactive: giữ nhánh `--yes`/non-TTY không đi qua raw UI.

## Tiêu chí hoàn tất

- `aie install` trong TTY mở wizard checklist với đề xuất plugin tự động.
- Người dùng có thể cài theo mặc định chỉ bằng Enter.
- Người dùng có thể dùng Space để bật/tắt plugin/provider.
- Có lựa chọn cài tất cả plugin.
- Phiên install bị dừng có thể resume.
- Các test install hiện có không regress.
