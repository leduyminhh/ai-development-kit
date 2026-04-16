# Branch Convention

## Roles

- `feature/*`: new feature or user-visible workflow.
- `bugfix/*`: normal bug fix.
- `chore/*`: maintenance, cleanup, repo organization.
- `refactor/*`: structure/readability improvement without behavior change.
- `release/*`: release preparation.
- `hotfix/*`: urgent production fix.

## Naming

- Use lowercase kebab-case after the prefix.
- Keep names short and meaningful.
- Match branch role to the dominant change type.

## Auto Branch Generation

When committing, generate a branch before the commit unless the current branch is already an appropriate non-main working branch.

Format:

```text
<role>/<scope-or-module>-<short-summary-slug>
```

Type to role mapping:

- `feat` -> `feature`
- `fix` -> `bugfix`
- `refactor` -> `refactor`
- `perf` -> `refactor`
- `docs`, `style`, `test`, `chore`, `build`, `ci` -> `chore`
- `release` or release preparation -> `release`
- urgent production `fix` explicitly described as hotfix -> `hotfix`
- `revert` -> `chore`
- `merge` -> keep the current merge branch unless the user asks to create one

Slug rules:

- Use the commit scope/module first.
- Add 2-5 words from the short summary.
- Use lowercase kebab-case.
- Remove punctuation and unsafe shell characters.
- Keep the branch short; prefer under 50 characters after the prefix.

Current branch rules:

- If current branch is `main`, `master`, `develop`, or `dev`, create/switch to the generated branch before committing.
- If current branch already matches the selected role and scope/module, keep it.
- If current branch is unrelated, tell the user the proposed branch switch before committing.
- Never create a worktree unless explicitly requested.

## Examples

```text
feature/git-workflow-design-skill
bugfix/audit-timezone
chore/link-installer
refactor/validator-config
release/2026-04
hotfix/audit-retention
```

Generated examples:

```text
feat(workflow): add linked skill installer -> feature/workflow-linked-skill-installer
fix(audit): use Ho Chi Minh date -> bugfix/audit-ho-chi-minh-date
docs(readme): document audited runner -> chore/readme-audited-runner
refactor(api): simplify user payload mapping -> refactor/api-user-payload-mapping
```

## Worktree Rule

Do not create or use a git worktree unless the user explicitly requests it. By default, work in the current repository checkout and current branch.
