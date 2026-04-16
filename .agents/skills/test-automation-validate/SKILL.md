---
name: test-automation-validate
description: Use when creating, updating, running, debugging, or planning automated tests across stacks, including unit tests, integration/API tests, end-to-end tests, test fixtures/data, coverage gap analysis, and flaky test stabilization. Use after QA review when the next step is executable automated test implementation or verification.
---

# Automation Testing

## Overview

Use this skill to turn requirements, QA review findings, bug reports, architecture notes, or code changes into executable automated tests. It covers unit, integration/API, Testcontainers-backed persistence, transactional test behavior, edge case analysis, concurrency tests, contract tests, E2E, fixtures, coverage gaps, and flaky test stabilization. Use `test-qa-review` first when the work is only independent review or manual test planning.

## Operating Mode

1. Identify the behavior under test, acceptance criteria, and affected files.
2. Detect the stack and existing test framework before adding tests.
3. Load `resources/test-prompt-selector.md`, then load only the relevant resource or subagent prompt.
4. Prefer test-first for bug fixes and new behavior:
   - write the smallest failing test
   - verify the failure is meaningful
   - implement or adjust code only when requested or required by the test task
   - verify the test passes
5. Reuse existing test helpers, fixtures, factories, page objects, mock servers, and CI commands.
6. Keep tests deterministic, isolated, and behavior-focused.
7. Run the narrowest useful command first, then broader commands when risk justifies it.
8. Report commands, results, coverage gaps, and any remaining manual checks in Vietnamese.

## Resource Map

- `resources/test-prompt-selector.md`: choose test level, resource, and subagent prompt.
- `resources/framework-detection.md`: identify stack, package manager, test runner, and command selection.
- `resources/test-implementation-rules.md`: rules for deterministic, behavior-first automated tests.
- `resources/verification-report.md`: final test result and evidence format.

## Anti-Overuse Rules

- Do not add E2E tests for logic that a unit or integration test can cover reliably.
- Do not mock the class under test.
- Do not assert private implementation order.
- Do not create large test frameworks when one focused test is enough.
- Do not rewrite production code unless the user asks for implementation or the test task requires a small fix.

## Output Format

```text
Pham vi automation:
Test level da chon:
Files changed:
Commands run:
Ket qua:
Coverage gaps:
Rui ro / manual checks:
```



