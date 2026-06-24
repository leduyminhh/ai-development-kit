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

Changed:
- ...
  • ...

- ...

Reason:
- ...

Important notes / Breaking impact:
- ...
  • ...
```

If the user does not provide a message, generate both title and body from the
staged diff and nearby source context.

Use an English commit header by default. Body notes may be English or Vietnamese.
Use Vietnamese with diacritics unless repository instructions say otherwise.

Commit messages render as plain text; write the body without Markdown backticks
around file names, identifiers, section names, commands, or flags.

## Entry-Point Rules

- Title must be imperative English and should normally stay under 72 characters.
- Use the smallest truthful scope for the changed feature, module, workflow, or
  documentation target.
- Breaking changes must use `!` in the header and include `BREAKING CHANGE:` plus
  a `Migration:` section when consumers need action.

Body content, generation grounding, encoding safety, and config/environment
rules live in the files below; do not restate them here.

## Detail References

- [commit-convention/templates.md](commit-convention/templates.md): size-based
  templates (daily, structured, multi-module, refactor, fix, breaking,
  architecture, and PR notes).
- [commit-convention/body-rules.md](commit-convention/body-rules.md): mandatory
  `Changed` / `Reason` sections, bullet formatting, commit splitting,
  refactor/perf bodies, and the "do not invent impact" rule.
- [commit-convention/ai-generation-rules.md](commit-convention/ai-generation-rules.md):
  automatic generation grounding, the no-`Co-Authored-By` rule, and UTF-8 /
  Vietnamese diacritics encoding safety.
- [commit-convention/config-env-rules.md](commit-convention/config-env-rules.md):
  when `Important notes / Breaking impact` becomes mandatory and how to disclose
  config/environment changes.
- [commit-convention/examples.md](commit-convention/examples.md): full Vietnamese
  commit message examples.

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
