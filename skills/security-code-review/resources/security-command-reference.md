# Security Command Reference

Use this file when the user asks for `--help`, command syntax, aliases, or compatibility with older command names.

## Canonical Commands

Canonical commands:

- `/security-scan`
- `/security-rules`
- `/fix`
- `/security-review`

Always report canonical command names in final summaries, reports, metadata, and fix summaries even when the user invoked an alias.

## Help Commands

Recognize:

```text
/security-scan --help
/security-rules --help
/fix --help
/security-review --help
/sec-scan --help
/sec-rules --help
/security-fix --help
```

For `--help`, return concise usage text only. Do not scan, fix, write reports, run tools, or read source files beyond command documentation.

## Aliases

Scan aliases:

```text
/sec-scan -> /security-scan
/scan-security -> /security-scan
/security-scan-code -> /security-scan
```

Rule aliases:

```text
/sec-rules -> /security-rules
/security-rule -> /security-rules
```

Fix aliases:

```text
/security-fix -> /fix
/fix-security -> /fix
/sec-fix -> /fix
```

Review aliases:

```text
/security-code-review -> /security-review
/sec-review -> /security-review
/review-security -> /security-review
```

## Help Output Shape

For `/security-scan --help`, include:

- purpose: scoped source-first security scan
- required behavior: Rule Engine always runs
- default options
- tool options
- report options
- scope boundary warning
- aliases

For `/security-rules --help`, include:

- `check`
- `update`
- `list`
- `lock`
- freshness behavior
- offline behavior
- aliases

For `/fix --help`, include:

- required `--report`
- default severity and commit behavior
- `--dry-run`
- `--max-risk safe`
- scope rule from report metadata
- validation and commit safety
- aliases

For `/security-review --help`, include:

- review scope inputs: diff, file, module, dependency manifest, config
- standards mapping: OWASP, ASVS, CWE
- read-only default
- specialist review routing
- aliases
