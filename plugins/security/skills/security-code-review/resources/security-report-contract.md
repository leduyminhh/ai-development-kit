# Security Report Contract

Use this contract for `/security-scan` report output.

## Report Folder Naming

Pattern:

```text
{HHmmss}_{ddMMyyyy}_{normalized-scope}
```

Examples:

```text
145230_02062026_backend-auth-service
145811_02062026_frontend
150015_02062026_full-project
```

Normalize scope:

```text
backend/auth-service -> backend-auth-service
services/user-service -> services-user-service
frontend -> frontend
. -> full-project
```

Use `scripts/generate-security-report-id.ps1` to generate this ID.

## Required Files

```text
security-reports/<scan-id>/
  summary.md
  summary.json
  findings.json
  cost-log.json
  metadata.json
  rule-freshness.md
  rule-engine/findings.json
```

Optional tool folders:

```text
sonar/sonar-scan.log
sonar/sonar-summary.json
trivy/trivy-fs-report.json
trivy/trivy-fs-report.sarif
```

## metadata.json Fields

Include:

- `scan_id`
- `started_at`
- `finished_at`
- `scope`
- `normalized_scope`
- `recursive`
- `report_dir`
- `tools_requested`
- `tools_executed`
- `tools_skipped`

## findings.json Fields

Each finding should include:

- `id`
- `source`
- `severity`
- `category`
- `title`
- `file`
- `line`
- `cwe`
- `owasp`
- `description`
- `recommendation`
- `masked_secret`

## cost-log.json Rules

Always write `cost-log.json`.

Record:

- duration
- commands executed
- files scanned estimate
- report files generated
- finding counts
- tool runtime seconds
- agent cost metadata

If token or cost metadata is unavailable, record `0` and explain. Never invent token or cost numbers.

## Build Gate

Default fail condition:

```text
CRITICAL > 0 OR HIGH > 0
```

Status:

- `PASS`: no findings violate `--fail-on`
- `FAIL`: at least one finding violates `--fail-on`
- `ERROR`: serious scan/runtime failure

SonarQube or Trivy errors do not automatically make the scan `ERROR` if Rule Engine completed successfully.
