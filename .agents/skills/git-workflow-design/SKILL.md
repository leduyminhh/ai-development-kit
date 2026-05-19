---
name: git-workflow-design
description: Use when the user asks to commit, push, create or switch branch, prepare PR, merge, revert, release, hotfix, stage changes, or generate release notes and changelogs from git history, even if `$git-workflow-design` is not explicitly named.
---

# Git Workflow

## Overview

This skill handles practical git publishing flow for the repository: inspect the worktree, choose or validate a branch, group changes into clean commit units, generate commit messages in Vietnamese with UTF-8 with diacritics, push safely, and prepare PR-ready output.

It also supports release-facing output from git history such as changelog drafts, release notes, and customer-facing summaries when the user asks for updates between commits, tags, branches, or time windows.

## When to Use This Skill

Activate this skill when the user:
- asks to commit, push, stage, branch, merge, revert, release, or hotfix
- wants help naming a branch or writing a conventional commit
- wants PR preparation or a release checklist
- wants a changelog, release notes, weekly update summary, or customer-facing update summary from git commits
- asks for a summary of changes since a tag, version, branch, or date range

Do not use this skill for generic code explanation when no git intent or release-history intent is present.

## What This Skill Does

- Inspects git state before taking action.
- Groups changes into sensible commit units instead of staging everything blindly.
- Generates conventional commit titles and Vietnamese commit bodies with diacritics.
- Chooses a safe branch name when the current branch is `main`, `master`, `develop`, or `dev`.
- Guides push, PR, merge, revert, hotfix, and release flow.
- Summarizes commit history into structured changelog or release-note drafts when the user asks.
- Filters low-signal internal churn when producing user-facing update notes.

## How to Use

### Commit And Push Flow

## Rule Precedence

When this skill is active, branch naming rules in `resources/branch-convention.md` override any generic Codex or app default branch prefix such as `codex/`.

For commit, push, create branch, and switch branch flows:
- Always load and apply `resources/branch-convention.md` before creating or switching branches.
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
3. If needed, load `resources/branch-convention.md`, then create or switch to the generated working branch from that convention.
4. Stage only the files for the current commit unit.
5. Generate or normalize the commit message.
6. Run relevant verification when feasible.
7. Commit, push, and report the result in Vietnamese.

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

## Operating Mode

1. Start with `git status --short` and the relevant diff or history range. Do not use a git worktree unless the user explicitly asks for it.
2. Before staging, decide whether the diff is one logical change or several. Split commits when different goals are mixed, but keep code, tests, and small supporting docs together when they serve one change goal.
3. If the user already gave a commit message, preserve its intent and only normalize obvious format issues.
4. If the current branch is `main`, `master`, `develop`, or `dev`, load `resources/branch-convention.md` and create/switch to the generated branch from that convention before committing. This skill convention takes precedence over the Codex app default `codex/` branch prefix.
5. If the user did not provide a commit message, generate:
   - a title using `type(scope): short summary`
   - a Vietnamese body with sections `What changed`, `Why changed`, and optional `Important notes / breaking impact`
   - keep the Vietnamese body in UTF-8 with diacritics; do not strip accents unless the user explicitly asks for that compromise
   - `What changed` and `Why changed` should each contain 1 to 5 main rows depending on the real change size
   - each main row may have optional detail lines prefixed with `•`; keep them only when the diff shows meaningful supporting behavior, side effects, constraints, or secondary flow
   - derive all rows from the real diff and nearby source context, from a developer's point of view: what they improved, fixed, simplified, or enabled
   - summarize the main flow first, then the supporting flow
   - avoid file-by-file narration when the deeper workflow or maintenance intent is visible
   - never invent reasons or impact that cannot be supported by the staged change
6. For changelog or release-note requests, choose the smallest useful comparison range, group commits into categories, and rewrite raw commit language into the audience style the user asked for.
7. Stage only the files for the current commit group, then run relevant verification when feasible. Do not commit failing work unless the user explicitly wants a checkpoint commit.
8. After a successful push, create a pull request when the user asks to publish or when the workflow naturally reaches PR preparation.
9. Report branch, commit, push, PR, verification, changelog scope, and relevant notes in Vietnamese.

## Changelog Guidance

When producing a user-facing changelog:
- prefer customer language over raw implementation detail
- group related commits into one polished bullet when they serve the same visible outcome
- exclude pure refactor, test-only, formatting, or CI-only commits unless they matter to the audience
- call out breaking changes and security changes explicitly
- use exact tags, commit ranges, or dates when the user asks for a bounded release summary

Example categories:
- `✨ New Features`
- `🔧 Improvements`
- `🐛 Fixes`
- `⚠ Breaking Changes`
- `🔒 Security`

## Tips

- Work from the repository root when possible.
- Prefer non-interactive git commands.
- Verify branch context before committing.
- Use user-provided style guides for changelog or release-note formatting when available.
- For user-facing release notes, rewrite terse commit text into outcome-focused language instead of echoing commit subjects.

## Resource Map

- `resources/commit-convention.md`: commit type, scope, title, and Vietnamese body rules.
- `resources/branch-convention.md`: branch role prefixes and naming rules.
- `resources/gitflow-checklist.md`: concise safety checklist for staging, commit, push, merge, revert, release, and hotfix.

## Subagent Prompts

- `subagents/git-commit-write.md`: classify change intent and draft commit title/body.
- `subagents/git-branch-design.md`: choose branch prefix/name and avoid worktree unless requested.
- `subagents/git-release-design.md`: review release/hotfix expectations.
- `subagents/git-merge-design.md`: review merge, conflict, and revert safety.

## Output Format

Before commit:

```text
Branch đề xuất:
Commit đề xuất:
Lý do chọn type/scope:
Files sẽ stage:
Commit body:
What changed:
- ...
  • ...

- ...

Why changed:
- ...
Important notes / breaking impact:
- ...
Verification:
```

After commit/push:

```text
Branch:
Commit:
Push:
PR:
Verification:
Ghi chú:
```

For changelog or release notes:

```text
Phạm vi:
Đối tượng đọc:
Tóm tắt:
Changelog / Release notes:
```
