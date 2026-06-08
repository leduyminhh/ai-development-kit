# Regression Review

Use this resource before saying a change is ready or when reviewing another agent's work.

## Review Areas

- Existing behavior that shares the same route, API, table, component, or service.
- Backward compatibility of request and response contracts.
- Migrations, seed data, generated types, and fixtures.
- Permission and role-specific behavior.
- Browser, viewport, and keyboard behavior for UI changes.
- Caching, stale data, retry, and duplicate action behavior.
- Error copy and observability for support/debugging.

## Evidence Rules

- Prefer command output and inspected tests over confidence.
- If verification cannot run, state the exact blocker.
- Do not accept architecture notes as test evidence.
- Do not accept visual similarity as functional proof.

## Handoff

Return:

- blocking findings
- non-blocking risks
- verification evidence
- release confidence
- recommended next test or fix
