# Gitflow Checklist

## Before Staging

- Inspect `git status --short`.
- Inspect relevant diffs.
- Identify unrelated changes and leave them unstaged.
- Confirm whether generated/test artifacts should be excluded.

## Before Commit

- Confirm commit type and scope.
- Generate or validate branch name from type and scope/module.
- If current branch is `main`, `master`, `develop`, or `dev`, create/switch to the generated working branch before committing.
- Generate message with `type(scope): short summary` if the user did not provide one.
- Generate a Vietnamese body with diacritics and exactly three bullets: `What changed`, `Why changed`, and `Important notes / breaking impact`.
- If encoding looks corrupted, fix UTF-8 handling and regenerate before accepting the message.
- Run relevant verification when feasible.
- Do not commit failing work unless the user explicitly asks for a checkpoint commit.

## Push

- Push current branch only.
- Use tracking when pushing a new branch.
- Report remote and branch.

## Merge

- Inspect source and target branch.
- Avoid destructive reset or checkout.
- Resolve conflicts intentionally.
- Use `merge (<scope>): <short title>` when committing merge resolution.

## Revert

- Identify the exact commit to revert.
- Prefer `git revert` over history rewriting.
- Use `revert: revert "<original title>"` format.

## Release And Hotfix

- Release branches should focus on stabilization, versioning, changelog, and final verification.
- Hotfix branches should be narrow, verified, and merged back into active release/development branches as needed.
