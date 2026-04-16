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

If the user does not provide a message, generate both title and structured body from the staged or intended diff. Write the body in Vietnamese unless repository instructions say otherwise.

## Types

- `feat`: new feature or functionality.
- `fix`: bug fix.
- `docs`: documentation updates or improvements.
- `style`: formatting or style-only changes without behavior change.
- `refactor`: code structure or readability changes without behavior change.
- `perf`: performance improvement.
- `test`: adding or modifying tests.
- `chore`: routine maintenance, cleanup, or housekeeping.
- `build`: build process or dependency changes.
- `ci`: CI/CD pipeline or automation changes.
- `revert`: revert a previous commit.
- `merge`: merge branches or resolve merge conflicts.

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

Write in Vietnamese with the exact sections below. Keep it short and focused on the main point.

```text
Why:
- 1 cau ngan ve ly do chinh.

What:
- 1-2 y chinh da thay doi.

Impact:
- Tac dong chinh hoac `Khong dang ke`.

Verify:
- Lenh chinh da chay hoac ly do chua chay.

Refs: ticket/link/issue/PR or `N/A`
```

Rules:

- Prefer one bullet per section; use two bullets only for two distinct points.
- Keep each bullet under 120 characters when feasible.
- Avoid background explanation, implementation narration, and repeated file lists.
- Focus only on why it matters, what changed, impact, and verification.
- Use `Refs: N/A` when there is no ticket, issue, PR, or external reference.
- Do not invent verification; state `Not run` with a reason when needed.
- Do not include unrelated files or changes in the body.

## Examples

```text
feat(workflow): add linked skill installer

Why:
- Can dung lai skill tu repo ma khong copy thu cong.

What:
- Them installer tao link skill va cap nhat huong dan dung.

Impact:
- Session khac nhan skill moi sau khi repo duoc pull.

Verify:
- Chay `scripts/test-install-skill-link.ps1` thanh cong.

Refs: N/A
```

```text
fix(audit): use Ho Chi Minh date for audit file names

Why:
- Ten file audit can khop ngay van hanh tai Viet Nam.

What:
- Dat ten file theo `Asia/Ho_Chi_Minh` va giu timestamp UTC.

Impact:
- De doi chieu audit theo ngay van hanh.

Verify:
- Chay `.codex/hooks/test-write-agent-audit.ps1` thanh cong.

Refs: N/A
```
