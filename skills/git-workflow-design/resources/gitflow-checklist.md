# Gitflow Checklist

## Before Staging

- Check `git status --short` and the relevant diff
- Decide whether the worktree is one commit or several logical commit groups
- Leave unrelated or accidental changes unstaged

## Before Commit

- Confirm commit type, scope, and working branch
- Make sure the staged set belongs to one logical change goal
- Generate the title/body using `commit-convention.md`
- Run relevant verification when feasible
- Avoid committing known-failing work unless the user explicitly wants a checkpoint

## After Commit

- Push only the current branch; use tracking when needed
- Create a PR after push when the user asks to publish or the workflow naturally reaches PR preparation
- Include remote, branch, PR link, verification, and any moved-repo note in the final report

## Merge, Revert, Release, Hotfix

- Merge: inspect source/target carefully, resolve conflicts intentionally, avoid destructive reset or checkout
- Revert: prefer `git revert`, identify the exact commit, and keep the revert title explicit
- Release/Hotfix: keep scope narrow, verify carefully, and merge back into the correct active branches
