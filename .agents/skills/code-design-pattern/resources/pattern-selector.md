# Pattern Selector

Use this resource before any pattern implementation.

## Decision Gate

Do not apply a design pattern when:

- a rename, extraction, or small method/class split solves the problem
- the code has only one variation point and no near-term second case
- the pattern would introduce extra interfaces without reducing coupling
- the team/codebase does not already use similar abstractions
- the main benefit is "because this pattern exists"

Prefer a pattern when:

- behavior varies by type, state, command, or policy
- object creation has multiple families, mandatory setup, or hidden invariants
- clients need a stable interface over incompatible or complex collaborators
- a workflow needs explicit steps, undo, notification, or chain processing
- architectural boundaries need DTO, gateway, front controller, saga, or filter concepts

## Contextual Subagent Priority

Rank only matching subagents:

1. `pattern-behavior-design`: highest priority for changing business rules, workflow branching, state transitions, commands, notifications, validation chains, or algorithms.
2. `pattern-structure-design`: highest priority for incompatible APIs, wrapper/decorator needs, facades, persistence boundaries, or object tree composition.
3. `pattern-creation-design`: highest priority for constructor complexity, object families, optional fields, immutable setup, or controlled lifecycle.
4. `architecture-pattern-design`: highest priority for application-level boundaries, web entry flow, distributed transactions, DTO boundaries, gateway/filter/page-object concerns.

If two groups match, choose the one that removes the most coupling with the least new abstraction. If still tied, propose both and ask the user which direction to approve.

## Pattern Fit Checklist

For each candidate pattern, answer:

- What concrete pain does it remove?
- What code becomes simpler?
- What code becomes more abstract?
- What new names/classes/interfaces will exist?
- How will this be tested?
- What is the failure mode if the pattern is wrong?

## Approval Requirement

Before implementation, produce:

```text
Pattern được đề xuất:
Cơ sở lựa chọn:
Rủi ro nếu áp dụng không phù hợp:
Yêu cầu phê duyệt: vui lòng xác nhận trước khi triển khai.
```

Proceed only after explicit approval.
