---
name: git-workflow-design
description: Use when the user asks to commit, push, create or switch branch, prepare PR, merge, revert, release, hotfix, or stage changes, even if `$git-workflow-design` is not explicitly named; must follow the repository commit and branch conventions, auto-generate commit message and Vietnamese description when the user does not provide them, avoid worktrees unless explicitly requested, and use subagent prompts for focused gitflow review.
---

# Git Workflow

## Overview

Use this skill for git operations and publishing flow. Trigger it both when the user explicitly invokes `$git-workflow-design` and when the request clearly implies git intent such as commit, push, branch creation or switching, PR preparation, merge, revert, release, hotfix, or staging. Inspect the worktree first, group related changes into sensible commit units, then generate branch, commit, push, and PR output without staging unrelated work.

## Operating Mode

1. Start with `git status --short` and the relevant diff. Do not use a git worktree unless the user explicitly asks for it.
2. Before staging, decide whether the diff is one logical change or several. Split commits when different goals are mixed, but keep code, tests, and small supporting docs together when they serve one change goal.
3. If the user already gave a commit message, preserve its intent and only normalize obvious format issues.
4. If the current branch is `main`, `master`, `develop`, or `dev`, generate a suitable working branch from commit type and scope unless the current branch is already appropriate.
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
6. Stage only the files for the current commit group, then run relevant verification when feasible. Do not commit failing work unless the user explicitly wants a checkpoint commit.
7. After a successful push, create a pull request when the user asks to publish or when the workflow naturally reaches PR preparation.
8. Report branch, commit, push, PR, verification, and relevant notes in Vietnamese.

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
