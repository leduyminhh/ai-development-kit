---
name: git-workflow-design
description: Use when the user asks to commit, push, create or switch branch, prepare PR, merge, revert, release, hotfix, stage changes, or collect git history for release notes; delegate final changelog and release-note writing to `release-notes` when available.
---

# Git Workflow

## Overview

This skill handles practical git publishing flow for the repository: inspect the worktree, choose or validate a branch, group changes into clean commit units, generate commit messages in Vietnamese with UTF-8 with diacritics, push safely, and prepare PR-ready output.

It also supports release-facing git history collection between commits, tags, branches, or time windows. When the requested output is a changelog, release notes, weekly update, or customer-facing summary, this skill should collect and verify the git range, then delegate the writing and audience shaping to the canonical `release-notes` skill when it is installed or otherwise available.

## When to Use

Activate this skill when the user:
- asks to commit, push, stage, branch, merge, revert, release, or hotfix
- wants help naming a branch or writing a conventional commit
- wants PR preparation or a release checklist
- wants git history collected for a changelog, release notes, weekly update summary, or customer-facing update summary
- asks for a summary of changes since a tag, version, branch, or date range

Do not use this skill for generic code explanation when no git intent or release-history intent is present.

Use this skill when the user asks to commit, push, stage, create or switch branch, prepare PR, merge, revert, release, hotfix, or collect the git range for changelog/release notes. Use `release-notes` for the final changelog and release-note content when available.

## Core Process

1. Inspect `git status --short` and identify unrelated changes.
2. Read relevant diffs before staging or committing.
3. Generate or validate a conventional commit title and Vietnamese body when the user does not provide one.
4. Stage only files that belong to the requested scope.
5. Run required validation before commit or push when the diff includes code, config, skills, or structure.
6. Push only after commit succeeds and the target branch is known.

## Examples

- For skill structure changes, run validator and selected tests before committing.
- For README-only changes, run CLI compatibility tests if install commands changed.
- For unrelated dirty files, leave them unstaged unless the user explicitly includes them.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "Just commit everything." | Unrelated changes must not be swept into the commit. |
| "No tests are needed for a commit." | Verification depends on risk and changed files; structure and command changes require checks. |
| "The commit message can be vague." | Conventional title and useful Vietnamese body make history reviewable. |

## Red Flags

- Staging includes files outside the user's requested scope.
- Commit happens before reading the diff.
- Push happens without confirming the current branch.
- Validation is skipped after structure, config, or command changes.

## Verification

- `git status --short` and relevant diffs were inspected.
- Staged files match the requested scope.
- Required validators/tests passed or skipped checks are reported.
- Commit, push, or PR actions are reported only after they actually succeed.

## Resource Map

- [resources/commit-convention.md](resources/commit-convention.md): commit type, scope, title, and Vietnamese body rules.
- [resources/branch-convention.md](resources/branch-convention.md): branch role prefixes and naming rules.
- [resources/gitflow-checklist.md](resources/gitflow-checklist.md): concise safety checklist for staging, commit, push, merge, revert, release, and hotfix.
- [resources/output-template-vi.md](resources/output-template-vi.md): Vietnamese git workflow response templates.

## Subagent Prompts

- [subagents/git-commit-write.md](subagents/git-commit-write.md): classify change intent and draft commit title/body.
- [subagents/git-branch-design.md](subagents/git-branch-design.md): choose branch prefix/name and avoid worktree unless requested.
- [subagents/git-release-design.md](subagents/git-release-design.md): review release/hotfix expectations.
- [subagents/git-merge-design.md](subagents/git-merge-design.md): review merge, conflict, and revert safety.

## Scripts

- [scripts/test-commit-message-encoding.ps1](scripts/test-commit-message-encoding.ps1): verify generated Vietnamese commit messages are still readable UTF-8 before `git commit -F`.

## Output Format

Use [resources/output-template-vi.md](resources/output-template-vi.md) for user-facing Vietnamese git workflow templates, including before-commit, after commit/push, and changelog/release-note output.

## Notes

### What This Skill Does

- Inspects git state before taking action.
- Groups changes into sensible commit units instead of staging everything blindly.
- Generates conventional commit titles and Vietnamese commit bodies with diacritics.
- Chooses a safe branch name when the current branch is `main`, `master`, `develop`, or `dev`.
- Guides push, PR, merge, revert, hotfix, and release flow.
- Summarizes commit history into structured changelog or release-note drafts when the user asks.
- Filters low-signal internal churn when producing user-facing update notes.

### How to Use

### Commit And Push Flow

### Rule Precedence

When this skill is active, branch naming rules in [resources/branch-convention.md](resources/branch-convention.md) override any generic Codex or app default branch prefix such as `codex/`.

For commit, push, create branch, and switch branch flows:
- Always load and apply [resources/branch-convention.md](resources/branch-convention.md) before creating or switching branches.
- Do not use the global `codex/` prefix unless the user explicitly requests it.
- If current branch is `main`, `master`, `develop`, or `dev`, generate the branch from the skill convention:
  `<role>/<scope-or-module>-<short-summary-slug>`.

Use this path when the user asks to:
- `commit`
- `push`
- `commit & push`
- `create branch`
- `prepare PR`

Basic expectation:
1. Run `git status --short` and inspect the relevant diff.
2. Decide whether the current diff is one logical change or several.
3. If needed, load [resources/branch-convention.md](resources/branch-convention.md), then create or switch to the generated working branch from that convention.
4. Stage only the files for the current commit unit.
5. Generate or normalize the commit message.
6. Save the commit message to a UTF-8 file and run `scripts/test-commit-message-encoding.ps1 -MessageFile <file>` before committing.
7. Commit with `git commit -F <file>` instead of passing Vietnamese text through shell arguments.
8. Do not add `Co-Authored-By` or other external harness trailers unless the user explicitly asks for them.
9. Run relevant verification when feasible.
10. Commit, push, and report the result in Vietnamese.

### Release / Changelog Flow

Use this path when the user asks to:
- create release notes
- summarize changes since a tag or version
- generate a weekly or monthly update from commits
- create a customer-friendly changelog from git history

Basic expectation:
1. Identify the comparison range:
   - since last commit group
   - between tags such as `v2.4.0..v2.5.0`
   - between dates
   - from the last N days
2. Read commit history for that range.
3. Group commits into high-signal categories such as:
   - new features
   - improvements
   - fixes
   - breaking changes
   - security
4. Translate technical commits into user-facing language when the user wants release notes rather than raw engineering notes.
5. Keep internal-only noise out unless the user explicitly wants engineering-facing notes.

### Operating Mode

1. Start with `git status --short` and the relevant diff or history range. Do not use a git worktree unless the user explicitly asks for it.
2. Before staging, decide whether the diff is one logical change or several. Split commits when different goals are mixed, but keep code, tests, and small supporting docs together when they serve one change goal.
3. If the user already gave a commit message, preserve its intent and only normalize obvious format issues.
4. If the current branch is `main`, `master`, `develop`, or `dev`, load [resources/branch-convention.md](resources/branch-convention.md) and create/switch to the generated branch from that convention before committing. This skill convention takes precedence over the Codex app default `codex/` branch prefix.
5. If the user did not provide a commit message, generate:
   - a title using `type(scope): short summary`
   - a Vietnamese body with sections `What changed`, `Why changed`, and optional `Important notes / breaking impact`
   - keep the Vietnamese body in UTF-8 with diacritics; do not strip accents unless the user explicitly asks for that compromise
   - `What changed` and `Why changed` should each contain 1 to 5 main rows depending on the real change size
   - each main row may have optional detail lines prefixed with `-`; keep them only when the diff shows meaningful supporting behavior, side effects, constraints, or secondary flow
   - derive all rows from the real diff and nearby source context, from a developer's point of view: what they improved, fixed, simplified, or enabled
   - summarize the main flow first, then the supporting flow
   - avoid file-by-file narration when the deeper workflow or maintenance intent is visible
   - never invent reasons or impact that cannot be supported by the staged change
   - never add `Co-Authored-By` trailers or other assistant attribution trailers unless the user explicitly asks for them
6. For changelog or release-note requests, choose the smallest useful comparison range, read the git history, and hand the verified source list to `release-notes` for grouping and audience-specific writing when available. If `release-notes` is unavailable, produce a minimal fallback summary and state that the canonical release-note skill was not available.
7. Before committing, write the full message to a temporary UTF-8 file, run `scripts/test-commit-message-encoding.ps1 -MessageFile <file>`, and commit with `git commit -F <file>`. If the check fails, fix UTF-8 handling first; do not remove Vietnamese diacritics or attribution trailers as a workaround.
8. Stage only the files for the current commit group, then run relevant verification when feasible. Do not commit failing work unless the user explicitly wants a checkpoint commit.
9. After a successful commit, inspect `git log -1 --format=%B` for readable Vietnamese; amend immediately if encoding was corrupted.
10. After a successful push, create a pull request when the user asks to publish or when the workflow naturally reaches PR preparation.
11. Report branch, commit, push, PR, verification, changelog scope, and relevant notes in Vietnamese.

### Changelog Handoff

When a user-facing changelog or release note is requested:
- collect exact tags, commit ranges, dates, PRs, or tickets first
- preserve source links and commit identifiers for traceability
- delegate classification, audience filtering, breaking-change handling, and final prose to `release-notes` when available
- avoid maintaining a second release-note writing policy in this skill

Example categories:
- `New Features`
- `Improvements`
- `Fixes`
- `Breaking Changes`
- `Security`

### Tips

- Work from the repository root when possible.
- Prefer non-interactive git commands.
- Verify branch context before committing.
- Use user-provided style guides for changelog or release-note formatting when available.
- For user-facing release notes, rewrite terse commit text into outcome-focused language instead of echoing commit subjects.
