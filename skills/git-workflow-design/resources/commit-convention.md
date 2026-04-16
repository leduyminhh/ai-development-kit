# Commit Convention

## Format

```text
type(scope): short summary

Why:
- ...

What:
- ...

Impact:
- ...

Verify:
- ...

Refs: ...
```

If the user does not provide a message, generate both title and structured body from the staged or intended diff. Write the body in concise Vietnamese with diacritics unless repository instructions say otherwise.

## Types

- `feat`: dùng khi thêm chức năng mới hoặc mở rộng hành vi mà người dùng hoặc hệ thống có thể sử dụng.
- `fix`: dùng khi sửa lỗi, khôi phục hành vi đúng, hoặc xử lý regression.
- `docs`: dùng khi chỉ thay đổi tài liệu, hướng dẫn, mô tả hoặc ví dụ mà không đổi hành vi chạy.
- `style`: dùng khi chỉ chỉnh format, lint, naming style, hoặc trình bày mã mà không đổi logic.
- `refactor`: dùng khi tổ chức lại mã, cấu trúc, tách lớp, đổi luồng nội bộ mà không đổi hành vi kỳ vọng.
- `perf`: dùng khi tối ưu hiệu năng, giảm chi phí xử lý, hoặc cải thiện tài nguyên sử dụng.
- `test`: dùng khi thêm, sửa, hoặc dọn test mà mục tiêu chính là độ bao phủ hay chất lượng kiểm thử.
- `chore`: dùng cho việc bảo trì thường kỳ, dọn cấu hình, cập nhật metadata, hoặc housekeeping không thuộc nhóm trên.
- `build`: dùng khi thay đổi build pipeline, dependency phục vụ build, bundling, packaging, hoặc release artifact.
- `ci`: dùng khi thay đổi workflow CI/CD, runner, job, step, hoặc automation của hệ thống tích hợp.
- `revert`: dùng khi hoàn tác một commit trước đó.
- `merge`: dùng khi merge nhánh hoặc xử lý conflict của merge commit.

## Scope

Choose a concise scope from the affected area:

- feature or module name: `user-auth`, `cart`, `api`, `database`
- workflow or tooling name: `workflow`, `audit`, `git`, `hooks`, `skills`
- docs target: `readme`, `agents`, `config`

Prefer the smallest truthful scope. Use one scope only.

## Title

- Use imperative English.
- Keep it short and specific.
- Do not end with a period.
- Use `type(scope): short summary` without a space between `type` and `(`.
- Keep the title under 72 characters when feasible.

## Body

Write in Vietnamese with diacritics and the exact sections below. Keep it short, direct, and focused on grouped functional changes.

```text
Why:
- 1-2 câu ngắn về lý do chính.

What:
- Những ý chính, ưu tiên gom theo nhóm chức năng hoặc nhóm thay đổi liên quan.

Impact:
- Tác động chính hoặc `Không đáng kể`.

Verify:
- Lệnh chính đã chạy hoặc lý do chưa chạy.

Refs: ticket/link/issue/PR or `N/A`
```

Rules:

- Prefer one bullet per section; use two bullets only for two distinct points.
- Keep each bullet under 120 characters when feasible.
- Avoid background explanation, implementation narration, and repeated file lists.
- In `What`, describe changes by functional group instead of enumerating files when possible.
- Focus only on why it matters, what changed, impact, and verification.
- Use `Refs: N/A` when there is no ticket, issue, PR, or external reference.
- Do not invent verification; state `Not run` with a reason when needed.
- Do not include unrelated files or changes in the body.
