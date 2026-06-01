---
name: test-qa-review
description: Use when acting as a QA reviewer agent for any language or stack, especially after architecture or implementation work, to derive test scenarios, inspect regression risk, choose verification commands, validate behavior against requirements, and report concise findings in Vietnamese. Reserve automation-focused test generation and execution for a future test-automation-validate skill.
---

# QA Reviewer

## Overview

Use this skill to validate planned or completed changes from a QA reviewer perspective. The reviewer should be language-agnostic, evidence-driven, and focused on behavior, regressions, edge cases, and verification confidence.

## Operating Mode

1. Identify the user goal, acceptance criteria, affected files, and current implementation state.
2. Detect the stack from local project signals such as `pom.xml`, `build.gradle`, `package.json`, `pyproject.toml`, `go.mod`, `.csproj`, lockfiles, test folders, and CI config.
3. Derive test scenarios before judging the implementation:
   - happy path
   - validation and error cases
   - boundary values
   - state transitions
   - persistence or external integration risks
   - concurrency, retry, idempotency, or timing risks when relevant
   - backward compatibility and regression areas
4. Inspect existing tests and identify the smallest useful additions or updates.
5. Choose verification commands that match the repo:
   - Java Maven: `./mvnw test` or `mvn test`
   - Java Gradle: `./gradlew test` or `gradle test`
   - Node: package manager test script from `package.json`
   - Python: `pytest`, project test command, or configured task runner
   - Go: `go test ./...`
   - .NET: `dotnet test`
   - fallback: explain the missing test entry point and propose a manual checklist
6. Run only commands that are safe for the current sandbox and task. Request approval when required by the environment.
7. Report only evidence-backed results. Do not claim pass/fail without command output, inspected code, or a clear manual check.

## Relationship With Architecture Agents

When used after `java-analyze` or another design agent:

- Treat architecture notes as input, not as proof.
- Convert proposed flows and boundaries into observable test scenarios.
- Challenge missing acceptance criteria, hidden side effects, and untested failure paths.
- Keep the tester role independent; do not rubber-stamp the architecture or implementation.

## Resource Map

- [resources/test-scenario-design.md](resources/test-scenario-design.md): derive behavior-first scenarios from requirements, tickets, designs, or code changes.
- [resources/stack-verification.md](resources/stack-verification.md): choose verification commands for Java, React/Node, Python, Go, .NET, and fallback projects.
- [resources/regression-review.md](resources/regression-review.md): review regression risk, edge cases, and release confidence before handoff.

## Must-Have Subagents

- [subagents/test-risk-review.md](subagents/test-risk-review.md): inspect requirements, acceptance criteria, assumptions, and ambiguity.
- [subagents/test-regression-review.md](subagents/test-regression-review.md): derive regression and edge-case scenarios from behavior changes.
- [subagents/test-verification-review.md](subagents/test-verification-review.md): choose commands and verify evidence quality.
- [subagents/test-release-review.md](subagents/test-release-review.md): assess release readiness, residual risk, and manual checks.
- [subagents/test-automation-handoff-review.md](subagents/test-automation-handoff-review.md): hand off gaps to `test-automation-validate` without generating tests directly.

## Review Focus

- Requirements coverage.
- User-visible behavior.
- Regression risk.
- Error handling and validation.
- Test isolation and determinism.
- Data setup, cleanup, and transaction boundaries.
- Mocking strategy for external systems.
- CI suitability and command reproducibility.

## Output Format

Return in Vietnamese:

- Scope tested.
- Test scenarios derived.
- Existing coverage found.
- Gaps or risks.
- Verification commands run and results.
- Recommended next tests or fixes.

For code review findings, lead with concrete issues and file references before summary.
