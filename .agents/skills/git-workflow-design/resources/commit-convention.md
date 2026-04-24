# Commit Convention

## Format

```text
type(scope): short summary

- What changed
- Why changed
- Important notes / breaking impact
```

If the user does not provide a message, generate both title and bullet body from the staged or intended diff. Write the body in Vietnamese with diacritics unless repository instructions say otherwise.

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

Write in Vietnamese with diacritics using exactly three bullets in the order below. Keep it short and focused on the main point.

```text
- Đã thay đổi gì.
- Vì sao thay đổi.
- Ghi chú quan trọng hoặc ảnh hưởng breaking change; nếu không có, ghi `Không có breaking change`.
```

Rules:

- Use exactly three bullets, one line each.
- Keep each bullet under 120 characters when feasible.
- Use proper Vietnamese diacritics. Do not write body bullets in ASCII-only Vietnamese.
- Avoid background explanation, implementation narration, and repeated file lists.
- Focus only on what changed, why it changed, and notable impact.
- Mention breaking impact only when it is real; otherwise state that there is no breaking change.
- Do not include unrelated files or changes in the body.

## Encoding Safety

- Save and read commit convention files as UTF-8.
- If the terminal or tool shows mojibake, fix encoding handling first and regenerate the text.
- Do not silently strip Vietnamese diacritics just to avoid an encoding issue.
- Only use a non-diacritic fallback if the user explicitly approves that compromise.

## Examples

```text
feat(workflow): add linked skill installer

- Thêm installer tạo link skill và cập nhật hướng dẫn sử dụng.
- Cần tái sử dụng skill từ repo mà không copy thủ công.
- Không có breaking change.
```

```text
fix(audit): use Ho Chi Minh date for audit file names

- Đặt tên file audit theo Asia/Ho_Chi_Minh và giữ timestamp UTC.
- Cần đồng bộ ngày vận hành audit theo múi giờ Việt Nam.
- Không có breaking change.
```
