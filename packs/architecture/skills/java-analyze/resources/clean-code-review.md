# Clean Code Review

Use this resource when reviewing Java code for readability, maintainability, and change safety. It is inspired by the Clean Code principles referenced by the `clean-code-book` repository, but it is intentionally paraphrased as a compact review checklist rather than copied from the book.

Source reference: https://github.com/Gatjuat-Wicteat-Riek/clean-code-book

## Naming

- Prefer names that reveal purpose, domain role, and unit of work.
- Rename vague terms such as `data`, `info`, `manager`, `processor`, `helper`, and `util` when they hide responsibility.
- Avoid abbreviations unless they are standard in the codebase and domain.
- Keep one concept under one name; avoid synonyms for the same domain idea.
- Name booleans as predicates such as `isActive`, `hasPermission`, or `canRetry`.

## Functions

- Each method should do one thing at one level of abstraction.
- Split methods that mix validation, orchestration, persistence, mapping, and formatting.
- Avoid boolean flag parameters that switch behavior; use separate methods or strategy objects.
- Keep argument lists short. Group related values into request objects or value objects when rules attach to them.
- Prefer command-query separation: methods that return data should not also create surprising side effects.

## Classes And Modules

- Give each class one clear reason to change.
- Keep controllers thin and application services focused on use-case orchestration.
- Keep domain rules in named domain methods, policies, or value objects.
- Avoid broad god classes, anemic service bags, and catch-all packages.
- Keep dependency direction explicit: inner policy should not depend on web, persistence, messaging, or framework details.

## Comments

- Prefer expressive code over explanatory comments.
- Keep comments only when they explain intent, trade-off, warning, or external constraint.
- Remove stale comments, commented-out code, and comments that restate the implementation.
- Use comments to mark non-obvious business rules only when naming or extraction cannot make the rule clear enough.

## Error Handling

- Prefer exceptions or result types that preserve context and domain meaning.
- Do not swallow exceptions or convert all failures into generic messages.
- Keep validation errors predictable for callers and UI clients.
- Keep cleanup and rollback behavior explicit when partial failure is possible.
- Avoid returning `null` for exceptional or ambiguous states when an explicit type can communicate intent.

## Tests

- Test observable behavior and business rules, not private implementation order.
- Add negative, boundary, permission, retry, and conflict cases when the code supports critical workflows.
- Keep unit tests focused on domain and application logic; avoid full framework startup for simple rules.
- Use integration tests for transaction, persistence, serialization, and concurrency behavior.
- Treat hard-to-test code as a design smell: hidden dependencies, static state, time, randomness, or external I/O may need seams.

## Review Output

When reporting issues:

- Lead with behavior, maintainability, or change-safety impact.
- Reference the smallest file and line range possible.
- Suggest a concrete refactor, rename, extraction, or test.
- Avoid style-only findings unless they block comprehension or future change.
