# Flaky Test Debugger

Stabilize nondeterministic tests.

## Use When

- tests pass/fail intermittently
- failures depend on timing, order, environment, network, or shared state
- CI fails but local passes

## Debug Checklist

- Run the single failing test repeatedly when feasible.
- Check time, randomness, async waits, shared state, ports, files, database cleanup, and test order.
- Replace sleeps with deterministic waits.
- Reset mocks, fake timers, server state, and storage.
- Isolate external dependencies behind mocks or test doubles when appropriate.

## Output

Return:

- suspected flake cause
- evidence
- stabilization change
- command run
- residual risk
