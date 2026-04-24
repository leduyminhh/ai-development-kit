# Commit Convention

## Format

```text
type(scope): short summary

What changed:
- ...
- ...
- ...
Why changed:
- ...
Important notes / breaking impact:
- ...
```

If the user does not provide a message, generate both title and body from the staged or intended diff. Write the body in Vietnamese with diacritics unless repository instructions say otherwise.

## Types

- `feat`: new feature or functionality.
- `fix`: bug fix.
- `docs`: documentation updates or improvements.
- `style`: formatting or style-only changes without behavior change.
- `refactor`: code structure/readability changes without behavior change.
- `perf`: performance improvement.
- `test`: adding or modifying tests.
- `chore`: routine maintenance, cleanup, or housekeeping.
- `build`: build process or dependency changes.
- `ci`: CI/CD pipeline or automation changes.
- `revert`: revert a previous commit.
- `merge`: merge branches or resolve merge conflicts.

## Scope

Choose a concise scope from the affected area:

- feature/module name: `user-auth`, `cart`, `api`, `database`
- workflow/tooling name: `workflow`, `audit`, `git`, `hooks`, `skills`
- docs target: `readme`, `agents`, `config`

Prefer the smallest truthful scope. Use one scope only.

## Title

- Use imperative English.
- Keep it short and specific.
- Do not end with a period.
- Use `type(scope): short summary` without a space between `type` and `(`.
- Keep the title under 72 characters when feasible.

## Body

Write in Vietnamese with diacritics using the sections below. Keep it concise, but make the summary strong enough for medium-to-large commits.

```text
What changed:
- ...
- ...
- ...
Why changed:
- ...
Important notes / breaking impact:
- ...
```

Rules:

- `What changed` is required and must contain at least 3 bullet rows.
- `Why changed` is required and must contain at least 1 bullet row.
- `Important notes / breaking impact` is optional.
- If `Important notes / breaking impact` appears, each bullet must contain a real notable note, migration concern, compatibility impact, or breaking change.
- Prefer 1-3 bullets for `Why changed`.
- Prefer 1-3 bullets for `Important notes / breaking impact` when it is needed.
- Keep each bullet under 140 characters when feasible.
- Use proper Vietnamese diacritics. Do not write body bullets in ASCII-only Vietnamese.
- Avoid background explanation, implementation narration, and repeated file lists.
- Focus only on what changed, why it changed, and notable impact.
- Do not add the `Important notes / breaking impact` section just to say there is no impact.
- Do not include unrelated files or changes in the body.

## Encoding Safety

- Save and read commit convention files as UTF-8.
- If the terminal or tool shows mojibake, fix encoding handling first and regenerate the text.
- Do not silently strip Vietnamese diacritics just to avoid an encoding issue.
- Only use a non-diacritic fallback if the user explicitly approves that compromise.

## Examples

```text
feat(workflow): add linked skill installer

What changed:
- Thêm installer để tạo link skill từ repo vào thư mục Codex local.
- Cập nhật hướng dẫn sử dụng để phản ánh cách cài đặt mới.
- Giữ nguyên flow dùng skill mà không cần copy thủ công vào từng project.
Why changed:
- Cần tái sử dụng skill từ repo nhanh hơn và giảm thao tác cài đặt lặp lại.
```

```text
fix(audit): use Ho Chi Minh date for audit file names

What changed:
- Đặt tên file audit theo Asia/Ho_Chi_Minh thay vì lệch theo timezone mặc định.
- Giữ nguyên timestamp UTC trong nội dung log để không mất tính nhất quán hệ thống.
- Đồng bộ cách sinh tên file giữa script ghi log và phần đọc log liên quan.
Why changed:
- Cần đồng bộ ngày vận hành audit theo múi giờ Việt Nam để tránh lệch ngày khi đối soát.
Important notes / breaking impact:
- Các job hoặc script ngoài repo đang parse tên file cũ có thể cần cập nhật lại pattern.
```
