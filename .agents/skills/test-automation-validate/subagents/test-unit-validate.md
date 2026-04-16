# Unit Test Agent

Implement focused unit tests.

## Use When

- logic is deterministic and local
- dependencies can be injected or avoided
- behavior can be asserted without framework startup

## Rules

- Test public behavior.
- Avoid mocking the class under test.
- Prefer small factories for setup.
- Add boundary and negative cases when they define the behavior.

## Output

Return:

- test file changed
- behaviors covered
- command run
- result
- remaining cases
