---
name: security-code-review
description: Use when acting as a security reviewer or security scan agent for source code, diffs, configs, dependencies, or scoped project scans; supports `/security-scan`, source-first Rule Engine review, optional SonarQube and Trivy enrichment, Markdown/JSON/SARIF report guidance, `/fix` from prior scan reports, OWASP Top 10, ASVS, CWE Top 25, and Java/Spring-focused review.
---

# Security Code Review

## Overview

Use this skill to review or scan application code and configuration from a security perspective before or after implementation. The reviewer should stay evidence-driven, map findings to recognized standards, keep the output actionable for engineers, and never expand beyond the user-provided scope.

## When to Use

Use this skill for security review of source code, diffs, configs, dependencies, project scan scope, prior scan reports, `/security-scan`, or `/fix` requests based on previous security findings.

## Core Process

1. Resolve scope and stack before judging findings.
2. Run source-first Rule Engine review using the relevant resource pack.
3. Use optional SonarQube or Trivy evidence only as enrichment, not as a replacement for source review.
4. Map findings to OWASP, ASVS, CWE, impact, exploitability, and remediation.
5. For `/fix`, read the prior report and apply only the requested, verifiable fixes.
6. Produce Markdown/JSON/SARIF guidance when requested and report residual risk.

## Examples

- Load `resources/input-validation-review.md` when reviewing request parsing or user input.
- Load `resources/crypto-secrets-review.md` when secrets, tokens, keys, or encryption appear.
- Use `scripts/resolve-security-scan-scope.ps1` to make scan scope explicit.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "The scanner did not find anything." | Scanner silence is not proof; source-first Rule Engine review is required. |
| "This endpoint is internal." | Internal surfaces still need auth, authorization, input validation, and logging review. |
| "We can fix broadly." | Security fixes must be scoped, traceable to findings, and regression-tested. |

## Red Flags

- Findings lack source file, impact, and remediation.
- Optional tool output replaces manual rule review.
- Secrets, auth/session logic, or dependency changes are not reviewed.
- `/fix` changes behavior beyond the prior report scope.

## Verification

- Scope and stack are explicit.
- Rule Engine evidence is included.
- Findings are mapped to security taxonomy where possible.
- Fixes include focused validation commands and residual risk.

## Resource Map

- [resources/security-review-checklist.md](resources/security-review-checklist.md): baseline review flow, severity calibration, and evidence standard.
- [resources/owasp-asvs-cwe-mapping.md](resources/owasp-asvs-cwe-mapping.md): quick mapping between OWASP Top 10, ASVS control families, and common CWE categories.
- [resources/auth-session-review.md](resources/auth-session-review.md): authentication, authorization, session, token, and access-control checks.
- [resources/input-validation-review.md](resources/input-validation-review.md): injection, deserialization, SSRF, upload, and boundary validation checks.
- [resources/crypto-secrets-review.md](resources/crypto-secrets-review.md): password handling, crypto choices, key storage, token signing, and secret management checks.
- [resources/dependency-supply-chain-review.md](resources/dependency-supply-chain-review.md): package risk, lockfile drift, unsafe defaults, SBOM, and build-chain review.
- [resources/logging-error-handling-review.md](resources/logging-error-handling-review.md): sensitive logging, exception exposure, auditability, and observability hardening.
- [resources/java-spring-security-review.md](resources/java-spring-security-review.md): Spring Security, method security, config, actuator, JPA, and Java-specific risk review.
- [resources/output-template-vi.md](resources/output-template-vi.md): Vietnamese security review and scan response templates.

- General source review: start with [resources/security-review-checklist.md](resources/security-review-checklist.md).
- Access control, login, JWT, session, or permission review: load [resources/auth-session-review.md](resources/auth-session-review.md).
- Request binding, validation, injection, upload, SSRF, or deserialization review: load [resources/input-validation-review.md](resources/input-validation-review.md).
- Secrets, passwords, tokens, key management, or cryptography review: load [resources/crypto-secrets-review.md](resources/crypto-secrets-review.md).
- Dependency manifest, plugin, CI package install, or supply-chain review: load [resources/dependency-supply-chain-review.md](resources/dependency-supply-chain-review.md).
- Error leakage, audit logging, or observability review: load [resources/logging-error-handling-review.md](resources/logging-error-handling-review.md).
- Java or Spring review: load [resources/java-spring-security-review.md](resources/java-spring-security-review.md).
- Standards mapping or reporting normalization: load [resources/owasp-asvs-cwe-mapping.md](resources/owasp-asvs-cwe-mapping.md).

## Subagent Prompts

- [subagents/security-review.md](subagents/security-review.md): core security reviewer that scopes risk, findings, and evidence.
- [subagents/auth-review.md](subagents/auth-review.md): authn/authz, session, token, and access-control review.
- [subagents/secrets-review.md](subagents/secrets-review.md): secrets, crypto, token signing, and config leak review.
- [subagents/dependency-review.md](subagents/dependency-review.md): dependency manifest, lockfile, package source, and CI supply-chain review.
- [subagents/java-spring-security-review.md](subagents/java-spring-security-review.md): Java/Spring-focused security review.
- [subagents/security-verification-review.md](subagents/security-verification-review.md): verification commands, confidence, and residual risk review.

## Scripts

Supported command intent:

```text
/security-scan
/security-scan --help
/security-scan --scope .
/security-scan --scope backend/auth-service
/security-scan --tool all|rule-engine|sonar|trivy
/security-scan --report md,json,sarif
/security-scan --severity CRITICAL,HIGH,MEDIUM
/security-scan --fail-on CRITICAL,HIGH|none
/security-rules --help
/fix --report security-reports/<scan-id>
/fix --help
```

Defaults:

```text
--scope .
--tool all
--report md,json
--severity CRITICAL,HIGH,MEDIUM
--fail-on CRITICAL,HIGH
```

Scan invariants:

- Rule Engine is required for every scan.
- SonarQube is optional and runs only with `SONAR_HOST_URL` plus `SONAR_TOKEN`, or explicit user-provided host/token.
- Trivy is optional and runs only when `trivy --version` succeeds.
- Report export is required for scan mode.
- Cost logging is required for scan and fix mode; every scan or fix report must include `cost-log.json`.
- Never print Sonar tokens or full secret values.
- Never scan outside requested scope.

Command help and aliases:

- Use [resources/security-command-reference.md](resources/security-command-reference.md) when the user asks for `--help`, command usage, aliases, or compatibility with older command names.
- Canonical commands are `/security-scan`, `/security-rules`, and `/fix`.
- Recognize aliases but report canonical command names in summaries and generated reports.

- [scripts/changed-files-summary.sh](scripts/changed-files-summary.sh): summarize security-relevant changed files from git diff.
- [scripts/detect-stack-files.sh](scripts/detect-stack-files.sh): print stack and build/security signals from the current repository.
- [scripts/resolve-security-scan-scope.ps1](scripts/resolve-security-scan-scope.ps1): validate and normalize a requested scan or fix scope.
- [scripts/generate-security-report-id.ps1](scripts/generate-security-report-id.ps1): generate timestamped report folder IDs using `HHmmss_ddMMyyyy_normalized-scope`.
- [scripts/test-security-code-review.ps1](scripts/test-security-code-review.ps1): verify the skill scaffold, core resources, and agent wiring.

Run scripts from the target repository root. Scripts are read-only except for normal command output and report files explicitly requested by scan or fix mode.

## Output Format

Use [resources/output-template-vi.md](resources/output-template-vi.md) for user-facing Vietnamese security review and scan response templates.

## Notes

### Operating Mode

1. Identify the task mode:
   - Review mode: source-code, diff, config, dependency, or architecture security review.
   - Scan mode: `/security-scan` with a strict `--scope`.
   - Fix mode: `/fix` from an existing security scan report.
2. Identify the review or scan scope: changed files, module, service, repository, config, dependency manifest, or the exact `--scope` folder.
3. For scan or fix mode, load [resources/security-scan-workflow.md](resources/security-scan-workflow.md), validate scope with [scripts/resolve-security-scan-scope.ps1](scripts/resolve-security-scan-scope.ps1), and do not read outside that scope.
4. Detect the stack from project files such as `pom.xml`, `build.gradle`, `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Dockerfile`, CI config, and framework-specific security config.
5. Map the main attack surfaces before going deep:
   - auth and authorization
   - input validation and injection
   - secrets and configuration
   - cryptography and token handling
   - persistence and query behavior
   - deserialization, file handling, and SSRF-style sinks
   - dependency and supply-chain exposure
   - logging, error handling, and observability leakage
6. Load only the resources needed for the current risk area.
7. Start with the core security review subagent, then route to specialist subagents when signals justify it.
8. For scan mode, always run the Rule Engine path first; use SonarQube and Trivy only as optional enrichment when available.
9. Prefer read-only review. Do not auto-fix security issues unless the user explicitly requests `/fix` or implementation.
10. Report findings in Vietnamese with severity, evidence, and mapping to `OWASP`, `ASVS`, and `CWE`.

### Scope Rules

- `--scope <folder>` means scan that folder and descendants only.
- If `--scope` is not `.`, do not scan sibling modules, parent folders, or the full repository.
- Validate that the scope exists, is readable, resolves inside the repository, and is not a dangerous symlink.
- If a referenced dependency is outside scope, warn and do not analyze it.

Use [scripts/resolve-security-scan-scope.ps1](scripts/resolve-security-scan-scope.ps1) before scanning or fixing a scoped report.

### Scan And Fix Resources

- [resources/security-scan-workflow.md](resources/security-scan-workflow.md): `/security-scan` command flow, tool defaults, scope boundaries, SonarQube/Trivy optional logic, and final response.
- [resources/security-command-reference.md](resources/security-command-reference.md): `--help` output contract and aliases for scan, rules, review, and fix commands.
- [resources/security-rule-engine.md](resources/security-rule-engine.md): required rule-engine categories, source-first checks, rule freshness, and masking rules.
- [resources/security-report-contract.md](resources/security-report-contract.md): report folder naming, summary/findings/metadata/cost-log shape, build gate, and export expectations.
- [resources/security-fix-workflow.md](resources/security-fix-workflow.md): `/fix` report validation, grouping, safe-fix policy, validation, rescan, commit, and fix summary contract.
- [resources/rule-pack.lock.json](resources/rule-pack.lock.json): local rule-pack freshness baseline for agent-first scan reporting.

### Review Defaults

- Prefer exploitability and impact over checklist counting.
- Treat missing authorization as high risk unless strong evidence says otherwise.
- Treat hardcoded secrets, unsafe crypto, auth bypass, and injection sinks as top-priority findings.
- Distinguish proven findings from suspicious patterns that need verification.
- Follow existing project conventions unless they weaken security or correctness.
- Prefer narrow evidence-backed findings over generic policy advice.
- Mask all secret values in reports and logs.
- Do not claim rule packs are latest when freshness checks fail or run offline.
- Do not commit scan fixes unless `/fix --commit true` is requested, validation passes, and changes stay inside the original report scope.

### Validation Commands

- `powershell -ExecutionPolicy Bypass -File skills/security-code-review/scripts/test-security-code-review.ps1`
- `powershell -ExecutionPolicy Bypass -File skills/naming-rule-validate/scripts/validate-naming-rule.ps1 -Root . -Paths @('skills/security-code-review/SKILL.md','.codex/agents/security-code-review.toml')`
