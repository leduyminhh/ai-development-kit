# Commit Convention

## Format

```text
type(scope): short summary

What changed:
- ...
  • ...

- ...

Why changed:
- ...

Important notes / breaking impact:
- ...
  • ...
```

If the user does not provide a message, generate both title and body from the staged diff and nearby source context. Use Vietnamese with diacritics unless repository instructions say otherwise.

## Type And Scope

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`, `revert`, `merge`
- Scope should be the smallest truthful area, usually feature/module, workflow/tooling area, or docs target such as `readme`, `agents`, `config`
- Title should be imperative English, concise, and normally under 72 characters

## Body Rules

- `What changed` and `Why changed` are required; each should contain 1 to 5 main bullets depending on the real size of the change
- `Important notes / breaking impact` is optional and should appear only when there is a real migration note, compatibility concern, or breaking effect
- Automatically include `Important notes / breaking impact` when the staged change adds, removes, renames, or changes configuration, environment variables, secrets placeholders, runtime flags, profiles, ports, URLs, credentials, feature toggles, deployment settings, or required local/CI setup values
- Each main bullet may include optional detail lines prefixed with `•`
- Leave one blank line between main bullets, but keep `•` detail lines directly under the parent bullet
- Prefer 0 to 3 detail lines under a main bullet; if the main bullet is already clear, leave it without detail
- Derive bullets from the actual diff and nearby source context, not from a generic template
- Read the change like a developer: explain what was improved, fixed, simplified, or enabled, and describe the main flow before supporting flows
- Avoid file-by-file narration when the workflow, maintenance, or behavioral intent is visible
- Do not invent reasons, side effects, or impact that are not supported by the staged change
- Keep bullets short, natural, and useful for code review and history lookup

## Commit Splitting

- Split commits automatically when the worktree contains multiple independent change goals
- Group by change intent rather than file type alone
- Keep code, tests, and small supporting docs together when they belong to one logical change
- Avoid both overloaded “everything in one commit” commits and artificial micro-commits with no review value

## Encoding Safety

- Save and read commit text as UTF-8
- If the terminal shows mojibake, fix encoding handling before accepting the final message
- Do not silently remove Vietnamese diacritics unless the user explicitly approves that compromise

## Examples

```text
feat(workflow): add linked skill installer

What changed:
- Thêm installer để tạo link skill từ repo vào thư mục Codex local.
  • Dùng lại script cài đặt hiện có để giảm trùng logic.

- Cập nhật hướng dẫn sử dụng để phản ánh cách cài đặt mới.
  • Đồng bộ ví dụ lệnh với đường dẫn runtime skill mới.

- Giữ nguyên flow dùng skill mà không cần copy thủ công vào từng project.

Why changed:
- Cần tái sử dụng skill từ repo nhanh hơn và giảm thao tác cài đặt lặp lại.
```

```text
fix(audit): use Ho Chi Minh date for audit file names

What changed:
- Đặt tên file audit theo Asia/Ho_Chi_Minh thay vì lệch theo timezone mặc định.
  • Tránh đổi ngày ngoài ý muốn khi chạy gần nửa đêm UTC.

- Giữ nguyên timestamp UTC trong nội dung log để không mất tính nhất quán hệ thống.

- Đồng bộ cách sinh tên file giữa script ghi log và phần đọc log liên quan.

Why changed:
- Cần đồng bộ ngày vận hành audit theo múi giờ Việt Nam để tránh lệch ngày khi đối soát.

Important notes / breaking impact:
- Các job hoặc script ngoài repo đang parse tên file cũ có thể cần cập nhật lại pattern.
```
