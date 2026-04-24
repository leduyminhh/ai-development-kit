---
name: security-code-review
description: Use when acting as a security reviewer for source code, diffs, configs, or dependency manifests across stacks; identify risks using OWASP Top 10, ASVS, and CWE Top 25; route to focused subagents for auth, secrets, dependency, verification, and Java/Spring-specific security review.
---

# Security Code Review

## Overview

Use this skill to review application code and configuration from a security perspective before or after implementation. The reviewer should stay evidence-driven, map findings to recognized standards, and keep the output actionable for engineers.

## Operating Mode

1. Identify the review scope: changed files, module, service, repository, config, or dependency manifest.
2. Detect the stack from project files such as `pom.xml`, `build.gradle`, `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Dockerfile`, CI config, and framework-specific security config.
3. Map the main attack surfaces before going deep:
   - auth and authorization
   - input validation and injection
   - secrets and configuration
   - cryptography and token handling
   - persistence and query behavior
   - deserialization, file handling, and SSRF-style sinks
   - dependency and supply-chain exposure
   - logging, error handling, and observability leakage
4. Load only the resources needed for the current risk area.
5. Start with the core security review subagent, then route to specialist subagents when signals justify it.
6. Prefer read-only review. Propose fixes and verification steps unless the user explicitly asks for implementation.
7. Report findings in Vietnamese with severity, evidence, and mapping to `OWASP`, `ASVS`, and `CWE`.

## Resource Map

- `resources/security-review-checklist.md`: baseline review flow, severity calibration, and evidence standard.
- `resources/owasp-asvs-cwe-mapping.md`: quick mapping between OWASP Top 10, ASVS control families, and common CWE categories.
- `resources/auth-session-review.md`: authentication, authorization, session, token, and access-control checks.
- `resources/input-validation-review.md`: injection, deserialization, SSRF, upload, and boundary validation checks.
- `resources/crypto-secrets-review.md`: password handling, crypto choices, key storage, token signing, and secret management checks.
- `resources/dependency-supply-chain-review.md`: package risk, lockfile drift, unsafe defaults, SBOM, and build-chain review.
- `resources/logging-error-handling-review.md`: sensitive logging, exception exposure, auditability, and observability hardening.
- `resources/java-spring-security-review.md`: Spring Security, method security, config, actuator, JPA, and Java-specific risk review.

## Task To Resource Routing

- General source review: start with `resources/security-review-checklist.md`.
- Access control, login, JWT, session, or permission review: load `resources/auth-session-review.md`.
- Request binding, validation, injection, upload, SSRF, or deserialization review: load `resources/input-validation-review.md`.
- Secrets, passwords, tokens, key management, or cryptography review: load `resources/crypto-secrets-review.md`.
- Dependency manifest, plugin, CI package install, or supply-chain review: load `resources/dependency-supply-chain-review.md`.
- Error leakage, audit logging, or observability review: load `resources/logging-error-handling-review.md`.
- Java or Spring review: load `resources/java-spring-security-review.md`.
- Standards mapping or reporting normalization: load `resources/owasp-asvs-cwe-mapping.md`.

## Scripts

- `scripts/changed-files-summary.sh`: summarize security-relevant changed files from git diff.
- `scripts/detect-stack-files.sh`: print stack and build/security signals from the current repository.
- `scripts/test-security-code-review.ps1`: verify the skill scaffold, core resources, and agent wiring.

Run scripts from the target repository root. Scripts are read-only except for normal command output.

## Must-Have Subagents

- `subagents/security-review.md`: core security reviewer that scopes risk, findings, and evidence.
- `subagents/auth-review.md`: authn/authz, session, token, and access-control review.
- `subagents/secrets-review.md`: secrets, crypto, token signing, and config leak review.
- `subagents/dependency-review.md`: dependency manifest, lockfile, package source, and CI supply-chain review.
- `subagents/java-spring-security-review.md`: Java/Spring-focused security review.
- `subagents/security-verification-review.md`: verification commands, confidence, and residual risk review.

## Review Defaults

- Prefer exploitability and impact over checklist counting.
- Treat missing authorization as high risk unless strong evidence says otherwise.
- Treat hardcoded secrets, unsafe crypto, auth bypass, and injection sinks as top-priority findings.
- Distinguish proven findings from suspicious patterns that need verification.
- Follow existing project conventions unless they weaken security or correctness.
- Prefer narrow evidence-backed findings over generic policy advice.

## Validation Commands

- `powershell -ExecutionPolicy Bypass -File .agents/skills/security-code-review/scripts/test-security-code-review.ps1`
- `powershell -ExecutionPolicy Bypass -File .agents/skills/naming-rule-validate/scripts/validate-naming-rule.ps1 -Root . -Paths @('.agents/skills/security-code-review/SKILL.md','.codex/agents/security-code-review.toml')`
- `powershell -ExecutionPolicy Bypass -File .agents/skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root .`

## Output Format

Return in Vietnamese:

- Pham vi review.
- Stack va be mat tan cong da xet.
- Findings theo muc do `Critical | High | Medium | Low`.
- Bang chung va mapping `OWASP | ASVS | CWE`.
- Lenh verify / kiem tra bo sung.
- Residual risk va unknowns.

