# Security Fix Workflow

Use this file for `/fix` requests after `/security-scan` generated a report.

## Command Contract

Supported forms:

```text
/fix --report security-reports/<scan-id>
/fix --report security-reports/latest/<scope>
/fix --report security-reports/<scan-id> --severity CRITICAL,HIGH
/fix --report security-reports/<scan-id> --commit
/fix --report security-reports/<scan-id> --dry-run
/fix --help
```

Aliases are defined in [security-command-reference.md](security-command-reference.md). Normalize aliases to `/fix` before loading reports, planning fixes, writing summaries, or committing.

Defaults:

```text
--severity CRITICAL,HIGH
--commit true
--dry-run false
--max-risk safe
--rerun-scan true
```

## Required Validation

Before editing, validate:

1. report folder exists
2. `metadata.json` exists
3. `findings.json` exists
4. metadata scope exists in the repository
5. metadata scope resolves inside the repository
6. findings belong to the same scope
7. current git working tree is safe to modify

If unrelated staged changes exist, stop and ask the user how to proceed.

## Fix Flow

1. Load report folder.
2. Read `metadata.json`.
3. Read `findings.json`.
4. Filter findings by severity.
5. Group findings by fix strategy.
6. Create a fix plan.
7. Apply safe fixes only.
8. Run formatter if applicable.
9. Run tests/build if applicable.
10. Re-run `/security-scan` for the same scope when `--rerun-scan true`.
11. Compare before/after findings.
12. Generate `fix-summary.md`.
13. Generate `fix-summary.json`.
14. Commit only if validation succeeds and `--commit true`.
15. Return final response in Vietnamese.

## Grouping Rules

Group by:

- same file
- same category
- same CWE
- same OWASP category
- same dependency/package
- same fix strategy

## Safe Fix Policy

Allowed safe fixes:

- mask or remove obvious secrets from sample/example files
- replace hardcoded config with environment variable placeholders
- add missing input validation when behavior is clear
- use a safer equivalent API when the mapping is obvious
- add Docker non-root `USER` when app path and permissions are clear
- add `HEALTHCHECK` when endpoint is known
- replace `yaml.load` with `safe_load`
- replace `subprocess shell=True` when command args are static and clear
- add missing security headers in supported config

High-risk changes require manual confirmation:

- auth flow rewrite
- authorization model redesign
- JWT/session lifecycle redesign
- dependency major version upgrade
- database migration
- public API behavior change
- encryption/key rotation
- endpoint removal or broad permission change
- architecture-level refactor

## Scope Rule

`/fix` must obey the original scan scope from `metadata.json`.

Allowed:

- read and modify files inside metadata scope

Not allowed:

- modify files outside metadata scope
- read sibling module source code for patching
- expand scope automatically

## Validation

Choose validation commands from the scope stack:

- Maven: `mvn -f <scope>/pom.xml test` or `verify`
- Gradle: `./gradlew test` or `build`
- Node/React: `npm test -- --watch=false`, `npm run lint`, `npm run build`
- Python: `python -m pytest`, `python -m compileall <scope>`
- Docker: `docker build -t security-fix-validation:<normalized-scope> <scope>`

Do not commit if validation fails.

## Fix Report Folder

Pattern:

```text
{HHmmss}_{ddMMyyyy}_{normalized-scope}_fix
```

Required files:

```text
fix-summary.md
fix-summary.json
before-findings.json
after-findings.json
patch.diff
validation.log
commit.txt
cost-log.json
```

## Commit Rule

Commit message format:

```text
fix(security): resolve security scan findings
```

Do not commit if:

- validation failed
- no file changed
- changes are outside scope
- secrets would appear in the commit message
- unrelated staged changes exist
