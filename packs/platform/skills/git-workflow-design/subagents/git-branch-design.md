# Branch Planner

Plan branch naming from commit type and scope/module, and branch safety.

## Focus

- Choose branch role from `feature/*`, `bugfix/*`, `chore/*`, `refactor/*`, `release/*`, `hotfix/*`.
- Map commit type to branch role using `resources/branch-convention.md`.
- Generate `<role>/<scope-or-module>-<short-summary-slug>`.
- Generate kebab-case branch name.
- Check current branch and avoid unnecessary branch changes.
- Create/switch branches in the current checkout only.
- Enforce no-worktree default.

## Rule

Do not create or use worktrees unless the user explicitly requests it.

## Output

Return:

- current branch
- recommended branch
- reason
- whether branch creation is needed
- exact branch command when branch creation is needed
- risks
