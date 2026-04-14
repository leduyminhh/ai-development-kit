---
name: java-spring-commit-proposal
description: Propose conventional commit messages for Java Spring changes using the user's role format after summarizing changed files and Maven verification evidence.
---

# Java Spring Commit Proposal

Use this skill after Spring Boot + Maven changes have been verified.

## Rule

Propose commits only. Do not run `git commit` unless the user explicitly asks.

## Format

Use the user's role style:

```text
type (scope): subject
```

Allowed types:

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `chore`
- `build`
- `ci`
- `revert`
- `merge`

## Proposal Content

Return:

```markdown
## Commit Proposal

Message: `type (scope): subject`

Why:
- [short reason]

Files:
- [changed file summary]

Verification:
- [Maven command and result]
```

## Scope Selection

- Prefer domain scope, such as `order`, `user-auth`, `cart`, `payment`, or `api`.
- Use `test`, `deps`, `build`, or `ci` for non-domain maintenance.
- Keep the subject imperative and concise.
