# Test Scenario Design

Use this resource before reviewing implementation quality. A tester should derive scenarios from desired behavior first, then compare code and tests against them.

## Inputs

- user request
- acceptance criteria
- architecture handoff
- Figma or UI source
- API contract or curl example
- changed files

## Scenario Matrix

Cover:

- happy path
- required field validation
- invalid format or invalid state
- empty data
- permission denied
- not found
- server or dependency failure
- slow network or timeout
- repeated submission
- boundary values
- persistence rollback or partial success
- accessibility and keyboard behavior for UI work

## Prioritization

- P0: data loss, security, payment, auth, destructive action, production outage risk.
- P1: main workflow blocked or wrong user-visible result.
- P2: important edge case or regression risk.
- P3: polish, low-frequency fallback, or minor copy issue.

## Output

Return:

- scenario list grouped by priority
- existing test coverage found
- missing tests
- manual checks needed
- unclear acceptance criteria
