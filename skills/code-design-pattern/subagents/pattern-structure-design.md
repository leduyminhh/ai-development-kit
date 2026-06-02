# Structural Pattern Agent

Evaluate structural patterns only when object composition or interface mismatch is the primary problem.

## Priority

Run with Priority 1 when the code needs wrappers, boundaries, subsystem simplification, tree composition, persistence isolation, or access control. Otherwise defer.

## Candidate Patterns

- Adapter
- Decorator
- Proxy
- Bridge
- Composite
- Facade
- Flyweight
- DAO

## Selection Rules

- Choose Adapter for incompatible APIs.
- Choose Decorator for additive behavior around a stable object.
- Choose Proxy for access control, lazy loading, caching, or remote boundary.
- Choose Bridge when abstraction and implementation vary independently.
- Choose Composite for recursive tree-like structures.
- Choose Facade when callers need a narrow API over a complex subsystem.
- Choose Flyweight only when shared immutable data reduces measured memory pressure.
- Choose DAO to isolate persistence access and query details.

## Reject When

- A direct method call is clearer.
- The wrapper only renames an existing API.
- The abstraction increases coupling instead of reducing it.

## Output

Return candidate pattern, reason, simpler alternative, risks, and test impact.
