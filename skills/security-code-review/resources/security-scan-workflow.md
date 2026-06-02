# Security Scan Workflow

Use this file for `/security-scan` requests. The scan is source-first and agent-first: it must work without SonarQube or Trivy, but may enrich findings with those tools when available.

Rule Engine is required for every scan. SonarQube and Trivy are optional.

## Command Contract

Supported forms:

```text
/security-scan
/security-scan --help
/security-scan --scope .
/security-scan --scope backend/auth-service
/security-scan --scope frontend
/security-scan --tool all|rule-engine|sonar|trivy
/security-scan --report md,json,sarif
/security-scan --severity CRITICAL,HIGH,MEDIUM
/security-scan --fail-on CRITICAL,HIGH|none
```

Aliases are defined in [security-command-reference.md](security-command-reference.md). Normalize aliases to `/security-scan` before applying defaults, scope validation, tools, or report output.

Defaults:

```text
--scope .
--tool all
--report md,json
--severity CRITICAL,HIGH,MEDIUM
--fail-on CRITICAL,HIGH
```

## Required Flow

1. Validate scope with `scripts/resolve-security-scan-scope.ps1`.
2. Detect stack from files inside the validated scope only.
3. Load the Rule Engine resource and run source review inside scope.
4. Check rule freshness and record `OK`, `OUTDATED`, `UNKNOWN`, or `OFFLINE_MODE`.
5. Run SonarQube only when requested or `--tool all` and credentials/config exist.
6. Run Trivy only when requested or `--tool all` and `trivy --version` succeeds.
7. Merge findings by file, line, category, CWE, OWASP, title, and source.
8. Export requested reports.
9. Always write `metadata.json`, `findings.json`, `summary.md`, `summary.json`, and `cost-log.json`.
10. Return the final Vietnamese response using the report contract.

## Scope Boundary

`--scope <folder>` includes only that folder and descendants.

Do not scan:

- parent directories
- sibling modules
- repository root when scope is not `.`
- symlink targets outside the repository
- referenced dependencies outside the requested scope

If source inside scope references a file outside scope, report:

```text
WARNING
Referenced dependency exists outside scan scope: <path>
Not analyzed because it is outside requested scope.
```

## SonarQube Optional Logic

SonarQube runs only when `SONAR_HOST_URL` and `SONAR_TOKEN` exist, or when the user provides host/token explicitly. Never print token values.

For Maven scopes with `pom.xml`, prefer:

```text
mvn -f <scope>/pom.xml clean verify sonar:sonar
```

For other scopes, prefer `sonar-scanner` with `sonar.projectBaseDir=<scope>`.

If SonarQube fails, do not fail the whole scan when Rule Engine completed:

```text
SonarQube status: ERROR
Fallback: Rule Engine completed successfully
```

## Trivy Optional Logic

Trivy runs only when `trivy --version` succeeds. For scoped scans, run `trivy fs <scope>`, never `trivy fs .` unless scope is `.`.

Use JSON output when `json` is requested and SARIF output when `sarif` is requested.

## Final Response Shape

Return in Vietnamese:

- scan status: `PASS`, `FAIL`, or `ERROR`
- exact scope as `<scope>/**`
- tools used and skipped
- severity summary
- report paths
- cost log summary
- next actions
