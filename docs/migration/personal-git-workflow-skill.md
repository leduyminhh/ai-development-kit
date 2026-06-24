# Personal Git Workflow Skill

## Purpose

This skill defines a practical Git workflow for daily development, clean commit history, and readable release notes.

It focuses on:

- Conventional Commit format
- Clear commit body notes
- Small daily commits
- Structured large commits
- Migration notes for breaking changes
- Review-friendly pull requests

---

## Commit Message Standard

Use Conventional Commit format:

```text
<type>(<scope>): <summary>
```

For breaking changes:

```text
<type>(<scope>)!: <summary>

BREAKING CHANGE: <what is incompatible>
```

---

## Commit Types

| Type | Use when |
|---|---|
| `feat` | Add a new feature |
| `fix` | Fix a bug |
| `refactor` | Improve structure without changing behavior |
| `perf` | Improve performance |
| `docs` | Update documentation |
| `test` | Add or update tests |
| `build` | Change build system or dependencies |
| `ci` | Change CI/CD configuration |
| `chore` | Maintenance work |
| `revert` | Revert a previous commit |

---

## Scope Rules

Scope should describe the affected area.

Good scopes:

```text
auth
socket
workspace
editor
pipeline
schedule
quartz
plugin
adapter
cli
infra
docs
```

Examples:

```text
fix(socket): prevent duplicate subscriptions
feat(workspace): add schedule validation
refactor(plugin): simplify manifest loading
docs(readme): update local setup guide
```

---

## Daily Commit Template

Use this for normal day-to-day commits.

```text
<type>(<scope>): <summary>

- <what changed>
- <what changed>
- <what changed>
```

Example:

```text
fix(editor): prevent font size dropdown overflow

- constrain dropdown width
- normalize font size option list
- keep selected value visible
```

---

## Body Notes Template

Use body notes when the commit contains more than one meaningful change.

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

Only include sections that are relevant.

Example:

```text
feat(websocket): add workspace status streaming

Added:
- workspace node status topic
- reconnect-safe subscription flow

Changed:
- replace polling with websocket updates

Fixed:
- prevent duplicate status events after reconnect
```

---

## Multi-Module Commit Template

Use this when one commit touches multiple layers.

```text
<type>(<scope>): <summary>

Backend:
- <backend change>

Frontend:
- <frontend change>

Database:
- <database change>

Documentation:
- <documentation change>
```

Example:

```text
feat(schedule): add workspace schedule validation

Backend:
- validate cron expression before saving
- reject duplicate active schedules

Frontend:
- show localized validation messages
- disable submit while validating

Database:
- add unique index for active workspace schedule

Documentation:
- add schedule validation examples
```

---

## Refactor Commit Template

Use this when improving code structure.

```text
refactor(<scope>): <summary>

Changed:
- <structure change>
- <extraction or simplification>

Reason:
- <why the refactor was needed>

Impact:
- <expected impact>
```

Example:

```text
refactor(workspace): extract schedule validation service

Changed:
- move validation logic out of controller
- extract duplicate schedule check into service layer

Reason:
- reduce controller complexity
- make validation reusable by CLI and API flows

Impact:
- no API behavior change expected
```

---

## Fix Commit Template

Use this when fixing a bug.

```text
fix(<scope>): <summary>

Fixed:
- <bug fixed>

Root cause:
- <why the bug happened>

Impact:
- <who or what is affected>
```

Example:

```text
fix(quartz): handle missing lock table error

Fixed:
- prevent scheduler crash loop when Quartz lock table is missing

Root cause:
- cluster manager attempted to acquire database lock before schema was initialized

Impact:
- service now fails with clearer startup validation error
```

---

## Breaking Change Template

Use this for incompatible changes.

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

Example:

```text
refactor(platform)!: migrate to multi-plugin architecture

BREAKING CHANGE: Legacy single-core plugin architecture has been removed.

Changed:
- replace core/ with plugins/<id>/
- build adapters from discovered plugin manifests

Removed:
- legacy prompts directory
- legacy skill installation flow

Migration:
- rebuild generated artifacts from plugins/
- remove old skill configuration from local setup
```

---

## Large Architecture Commit Template

Use this for major platform, migration, or architecture commits.

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
- <cli change>

Adapters:
- <adapter change>

Documentation:
- <documentation change>

Cleanup:
- <removed files or obsolete logic>

Migration:
- <migration step>
```

---

## Commit Size Rules

### Small Commit

Use one-line commit when the change is simple.

```text
fix(editor): correct font size label
```

### Medium Commit

Use bullet body when the change has several related updates.

```text
feat(socket): improve reconnect handling

- add reconnect state
- reset stale subscriptions
- expose connection status event
```

### Large Commit

Use structured body when the change affects architecture, migration, or multiple modules.

```text
refactor(platform)!: migrate to multi-plugin architecture

BREAKING CHANGE: Legacy architecture removed.

Architecture:
- ...

Migration:
- ...
```

---

## Good Body Notes

Good commit body notes are specific.

Good:

```text
Changed:
- replace polling with websocket updates
- reduce repeated API calls during execution monitoring
```

Bad:

```text
Changed:
- update code
- fix issue
- improve logic
```

---

## Commit Checklist

Before committing, check:

- [ ] Commit has correct type
- [ ] Scope is specific
- [ ] Summary is short and action-oriented
- [ ] Body explains important changes
- [ ] Breaking change uses `!`
- [ ] Breaking change includes `BREAKING CHANGE:`
- [ ] Migration steps are included when needed
- [ ] Commit does not mix unrelated changes
- [ ] Generated build artifacts are excluded unless intentionally committed
- [ ] Sensitive values are not committed

---

## Pull Request Notes Template

Use this in PR description.

```md
## Summary

- 
- 
- 

## Changes

### Added
- 

### Changed
- 

### Fixed
- 

### Removed
- 

## Migration

- 

## Testing

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual test
- [ ] Build passed

## Risk

- Low / Medium / High

## Notes

- 
```

---

## AI Assistant Instructions

When helping with Git commits, always:

1. Detect the change size:
   - small
   - medium
   - large
   - breaking

2. Suggest the correct commit format.

3. Prefer concise daily commits.

4. Use structured body notes only when useful.

5. Avoid vague body notes like:
   - update code
   - fix issue
   - improve logic

6. For breaking changes, always include:
   - `!` in the header
   - `BREAKING CHANGE:`
   - `Migration:` section

7. For multi-module changes, group body notes by module.

8. For refactor commits, include `Reason:` and `Impact:` when helpful.

---

## Recommended Daily Patterns

```text
feat(<scope>): add <capability>
fix(<scope>): prevent <bug>
refactor(<scope>): simplify <area>
docs(<scope>): update <document>
test(<scope>): add <case>
chore(<scope>): clean <maintenance item>
```

Examples:

```text
feat(cli): add plugin filter option
fix(socket): prevent duplicate subscription
refactor(adapter): normalize build contract
docs(workflow): add commit body templates
test(schedule): add cron validation cases
chore(repo): ignore generated build output
```

---

## Personal Preference

Preferred style:

- English commit header
- English or Vietnamese body is acceptable
- Keep body notes structured
- Use short bullets
- Use migration notes for breaking changes
- Avoid long paragraphs
- Optimize for future changelog generation
