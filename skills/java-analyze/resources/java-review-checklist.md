# Java Review Checklist

## Flow And Boundaries

- Can the use case be described in 8-12 steps?
- Is there one clear trigger, input contract, outcome, and failure model?
- Are controllers thin and free of business branching?
- Does each public service method represent one use case?
- Are domain decisions named in methods or policies instead of buried in conditionals?

## Clean Code

- Prefer intention-revealing names over comments.
- Avoid boolean flags that change method behavior.
- Keep methods small enough to show one level of abstraction.
- Keep each method at one abstraction level; split mixed orchestration, calculation, mapping, and I/O.
- Replace primitive obsession with value objects when rules attach to a value.
- Avoid broad `util`, `helper`, or `common` packages for business behavior.
- Do not hide side effects in mappers, validators, getters, or logging helpers.
- Prefer explicit domain concepts over clever, compressed, or overloaded code.

## Dependency Direction

- Inner layers should not depend on HTTP, JPA, messaging, or external clients.
- Infrastructure implements ports; application/domain define the need.
- DTOs must not leak across unrelated boundaries.
- Avoid circular dependencies between modules.

## Review Questions

- What invariant can be broken by this change?
- What happens on retry?
- What happens under concurrent requests?
- What must be atomic?
- Which tests prove the business rule without booting the whole app?
- Would a maintainer understand the intent by reading names and structure before reading comments?
- Is any class or method changing for more than one reason?
