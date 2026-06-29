# Commit Message Templates

Use this resource after reading `commit-convention.md` when the staged diff
needs a template choice. Prefer the smallest template that explains the change
without hiding important review or migration context.

## Commit Size Selection

Detect the change size before drafting the message:

- `small`: one focused change with no meaningful body needed beyond the title.
- `medium`: one logical change with several related bullets.
- `large`: one logical change spanning multiple modules or operational areas.
- `breaking`: any incompatible behavior, removed contract, migration need, or
  required consumer action.

Rules:

- Prefer concise daily commits for normal work.
- Use structured sections only when they make review easier.
- Split unrelated changes instead of forcing them into a large template.
- Keep the commit header in English unless the user explicitly requests another
  language.
- Body notes may be English or Vietnamese; in this repository, Vietnamese with
  diacritics remains the default unless the user or repository says otherwise.

## Daily Commit Template

Use for small or medium daily commits.

```text
<type>(<scope>): <summary>

Changed:
- <what changed>
- <what changed>

Reason:
- <why this change was needed>
```

For a very small change, a one-line commit is acceptable when it is fully clear:

```text
fix(editor): correct font size label
```

## Structured Body Notes Template

Use when the change has distinct categories. Include only relevant sections.

```text
<type>(<scope>): <summary>

Added:
- <new behavior or capability>

Changed:
- <modified behavior>

Fixed:
- <bug fix>

Removed:
- <deleted behavior or file>
```

## Multi-Module Commit Template

Use when one coherent change touches multiple layers.

```text
<type>(<scope>): <summary>

Backend:
- <backend change>

Frontend:
- <frontend change>

Database:
- <database change>

CLI:
- <CLI change>

Adapters:
- <adapter change>

Documentation:
- <documentation change>
```

Omit modules that are not touched. Do not invent module impact that is not in
the staged diff.

## Refactor Commit Template

Use when improving structure without intended behavior changes.

```text
refactor(<scope>): <summary>

Changed:
- <structure change>
- <extraction or simplification>

Reason:
- <why the refactor was needed>

Impact:
- <expected behavior impact, usually no behavior change expected>
```

## Fix Commit Template

Use when fixing a bug and the root cause is known from the investigation.

```text
fix(<scope>): <summary>

Fixed:
- <bug fixed>

Root cause:
- <why the bug happened>

Impact:
- <who or what is affected>
```

## Breaking Change Template

Use for incompatible changes. The header must include `!`, and the body must
include `BREAKING CHANGE:` plus migration notes.

```text
<type>(<scope>)!: <summary>

BREAKING CHANGE: <short summary of incompatible change>

Changed:
- <changed behavior>

Removed:
- <removed behavior>

Migration:
- <required migration step>
- <required migration step>
```

## Large Architecture Commit Template

Use for major platform, migration, or architecture commits. Include only the
sections supported by the diff.

```text
<type>(<scope>)!: <summary>

BREAKING CHANGE: <one-line breaking summary>

Architecture:
- <architecture change>

Backend:
- <backend change>

Frontend:
- <frontend change>

CLI:
- <CLI change>

Adapters:
- <adapter change>

Documentation:
- <documentation change>

Cleanup:
- <removed files or obsolete logic>

Migration:
- <migration step>
```

## Pull Request Notes Template

Use when the user asks for PR preparation.

```md
Summary:

- 
- 

Changes:

Added:
- 

Changed:
- 

Fixed:
- 

Removed:
- 

Migration:

- 

Testing:

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual test
- [ ] Build passed

Risk:

- Low / Medium / High

Notes:

- 
```

## Quality Bar

Good body notes are specific:

```text
Changed:
- replace polling with websocket updates
- reduce repeated API calls during execution monitoring
```

Avoid vague notes:

```text
Changed:
- update code
- fix issue
- improve logic
```
