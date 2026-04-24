---
name: git-workflow-design
description: Use when handling git branch, commit, merge, revert, release, hotfix, staging, push, or PR preparation workflows; must follow the repository commit and branch conventions, auto-generate commit message and Vietnamese description when the user does not provide them, avoid worktrees unless explicitly requested, and use subagent prompts for focused gitflow review.
---

# Git Workflow

## Overview

Use this skill for git operations and publishing flow. The agent should inspect the worktree, classify the change, generate a branch and conventional commit message when needed, and avoid staging unrelated changes.

## Operating Mode

1. Inspect `git status --short` and the relevant diff before staging or committing.
2. Do not create or use a git worktree unless the user explicitly requests it.
3. If the user provides a commit message, preserve the user's intent and only normalize obvious format issues.
4. Before committing, auto-generate a branch name from the selected commit type and scope/module unless the current branch is already an appropriate non-main working branch.
5. If the user does not provide a commit message, generate:
   - a commit title using `type(scope): short summary`
   - a short bullet body in Vietnamese with diacritics, with exactly three items in this order:
     - `What changed`
     - `Why changed`
     - `Important notes / breaking impact`
   - if the environment shows encoding corruption, retry with UTF-8-safe read/write settings before changing the text
6. Choose branch names from the configured branch roles when creating a branch.
7. Stage only intended files. Do not use broad staging when unrelated changes exist.
8. Run relevant verification before claiming the commit is ready when feasible.
9. Report commit, branch, push, and verification evidence in Vietnamese.

## Resource Map

- `resources/commit-convention.md`: commit type, scope, title, and Vietnamese body rules.
  The body examples and rules must use Vietnamese with diacritics.
- `resources/branch-convention.md`: branch role prefixes and branch naming.
- `resources/gitflow-checklist.md`: staging, commit, push, merge, revert, release, and hotfix safety checks.

## Subagent Prompts

Use files in `subagents/` as focused prompts when evaluating a gitflow step:

- `subagents/git-commit-write.md`: classify changes and draft commit title/body.
- `subagents/git-branch-design.md`: choose branch prefix/name and avoid worktree unless requested.
- `subagents/git-release-design.md`: review release/hotfix branch and verification expectations.
- `subagents/git-merge-design.md`: review merge, conflict, and revert safety.

## Output Format

Before commit:

```text
Branch de xuat:
Commit de xuat:
Ly do chon type/scope:
Files se stage:
Commit body:
- ...
- ...
- ...
Verification:
```

After commit/push:

```text
Branch:
Commit:
Push:
Verification:
Ghi chu:
```
