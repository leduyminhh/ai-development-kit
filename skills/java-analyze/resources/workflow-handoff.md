# Workflow Handoff

Use this resource when architecture output should feed another agent such as `react-code-generate` or `test-qa-review`.

## Handoff To React JS

Provide:

- feature goal and user workflow
- route, screen, or component affected
- API contract summary
- auth, permissions, and environment assumptions
- loading, empty, error, and success states
- design constraints or source links
- files or modules likely to change

Avoid:

- prescribing React internals unless the backend contract requires them
- hiding unresolved API ambiguity
- mixing backend implementation notes into UI copy

## Handoff To QA Reviewer

Provide:

- acceptance criteria
- expected behavior by scenario
- known edge cases
- persistence and transaction risks
- concurrency, retry, and idempotency risks
- verification command candidates
- areas that require manual or integration testing

## Completion Shape

Return a compact handoff block:

```text
Goal:
Contract:
State cases:
Risks:
Suggested verification:
Open questions:
```
