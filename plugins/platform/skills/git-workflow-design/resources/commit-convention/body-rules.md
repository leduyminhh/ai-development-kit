# Commit Body Rules

## General Rules

- Prefer behavior-oriented summaries:
  - what was enabled
  - what was fixed
  - what workflow changed
- Do not narrate files one by one unless the change is purely structural.
- Read the diff like a reviewer: explain intent, behavior, workflow,
  operational impact, and maintenance effect.
- Keep commit bodies concise but operationally useful.
- Do not invent performance gains, security impact, migration needs, or breaking
  changes unless they are directly supported by the staged diff.

## Required Sections

`What changed` and `Why changed` are mandatory.

Each section should contain:

- 1 to 5 main bullets
- only meaningful changes
- grouped by behavior or workflow intent

Avoid:

- repeating the title
- trivial formatting-only commentary
- file-by-file narration

## Bullet Formatting

Main bullets:

```text
- ...
```

Optional detail lines:

```text
  • ...
```

Rules:

- Keep detail lines directly under the parent bullet.
- Leave one blank line between main bullets.
- Prefer 0 to 3 detail lines per bullet.
- Keep bullets short and review-friendly.

## Commit Splitting

Split commits automatically when changes represent:

- independent workflows
- unrelated fixes
- separate operational concerns

Prefer grouping by:

- behavior
- workflow
- deploy impact
- feature intent

instead of only by file type.

Keep code, related tests, and small supporting docs together when they belong to
the same logical change.

Avoid:

- giant mixed commits
- meaningless micro commits

## Refactor Commits

For `refactor` commits:

- explain what complexity was reduced
- explain what duplication was removed
- explain what structure became easier to maintain

Avoid claiming behavior changes unless supported by the diff.

## Performance Commits

For `perf` commits:

- describe the bottleneck or hot path
- mention the affected flow
- mention resource impact when visible:
  - CPU
  - memory
  - startup time
  - IO
  - latency
