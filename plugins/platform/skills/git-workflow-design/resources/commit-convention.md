# Commit Convention

Use this file as the entry point for writing commit messages. Load the
referenced detail files only when the change requires that level of guidance.

## Selection Flow

1. Detect the change size: `small`, `medium`, `large`, or `breaking`.
2. Choose the smallest truthful commit type and scope.
3. Load [commit-convention/templates.md](commit-convention/templates.md) when a
   daily, structured, multi-module, refactor, fix, breaking, architecture, or PR
   template would make the output clearer.
4. Use a one-line commit only when the change is small and the title fully
   explains it.
5. Split unrelated changes instead of hiding them inside one large template.

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

If the user does not provide a message, generate both title and body from the
staged diff and nearby source context.

Use an English commit header by default. Body notes may be English or Vietnamese.
Use Vietnamese with diacritics unless repository instructions say otherwise.

## Required Rules

- Title must be imperative English and should normally stay under 72 characters.
- Use the smallest truthful scope for the changed feature, module, workflow, or
  documentation target.
- `What changed` and `Why changed` are mandatory.
- `Important notes / breaking impact` is optional unless config, environment, or
  compatibility impact makes it mandatory.
- Breaking changes must use `!` in the header and include `BREAKING CHANGE:` plus
  a `Migration:` section when consumers need action.
- Derive every bullet from the staged diff and nearby source context.
- Do not invent performance gains, security impact, migrations, or breaking
  changes.
- Do not add `Co-Authored-By` or assistant attribution trailers unless the user
  explicitly asks for them.
- Preserve Vietnamese diacritics and UTF-8 encoding.
- Do not silently remove Vietnamese diacritics unless the user explicitly approves that compromise.

## Commit Type Reference

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

## Scope Reference

Prefer:

- feature/module names
- infra/runtime areas
- tooling/workflow names
- docs target names

Examples:

- `auth`
- `camera`
- `rtsp`
- `ffmpeg`
- `workflow`
- `docker`
- `config`
- `readme`
- `agents`

Avoid broad scopes such as `system`, `core`, or `misc` unless truly
unavoidable.
