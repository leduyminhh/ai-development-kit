---
name: code-design-pattern
description: Use when acting as a design pattern advisor for Java or JVM code, especially when choosing whether to apply creational, structural, behavioral, or architectural patterns; must avoid pattern overuse, rank candidate pattern subagents, ask the user for approval before applying any pattern, and report which patterns were used, why, and what outcome was achieved.
---

# Design Pattern

## Overview

Use this skill to decide whether a design pattern is appropriate before changing code. The parent agent should select a pattern only when it solves a concrete design pressure such as object creation complexity, interface mismatch, behavior variation, workflow orchestration, or architectural boundary.

Source taxonomy: Baeldung Design Patterns Series, which organizes patterns into Creational, Structural, Behavioral, and Other Architectural Patterns.

## When to Use

Use this skill when the task requires choosing, reviewing, or applying a Java/JVM design pattern, especially when the user mentions creational, structural, behavioral, or architectural patterns.

## Core Process

1. Clarify the design problem before naming a pattern.
2. Load [resources/pattern-selector.md](resources/pattern-selector.md) to rank candidate patterns by problem fit.
3. Use the relevant pattern subagent for creation, structure, behavior, or architecture concerns.
4. Ask for user approval before applying any pattern to code.
5. Report the chosen pattern, rejected alternatives, trade-offs, and verification evidence.

## Examples

- Use Strategy when behavior varies independently and callers should not branch on implementation details.
- Use Adapter when integrating an incompatible external API without leaking that API inward.
- Reject Factory when a constructor or local function keeps the design simpler.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "A pattern will make this more professional." | Patterns are justified by a concrete force, not by aesthetics. |
| "We can apply it without approval because it is obvious." | This skill requires approval before applying patterns. |
| "More abstraction will make future work easier." | Abstraction is justified only when it removes current complexity or matches a proven extension point. |

## Red Flags

- Pattern names appear before the actual design force is stated.
- The proposed pattern adds classes without reducing branching, coupling, or duplication.
- The agent applies a pattern without user approval.
- Alternatives are not considered.

## Verification

- The design force is explicit.
- Candidate patterns were ranked or rejected.
- User approval was obtained before implementation.
- Tests or review evidence show behavior and boundaries still hold after applying the pattern.

## Resource Map

- [resources/pattern-selector.md](resources/pattern-selector.md): parent selection workflow, subagent priority rules, and anti-overuse gate.
- [resources/baeldung-pattern-catalog.md](resources/baeldung-pattern-catalog.md): compact taxonomy inspired by the Baeldung series.
- [resources/approval-and-report.md](resources/approval-and-report.md): required approval prompt and final response template.
- [resources/output-template-vi.md](resources/output-template-vi.md): Vietnamese approval, completion, and no-pattern response templates.

## Subagent Prompts

Use files in `subagents/` as role prompts when evaluating a pattern group:

- Priority 1 when object creation is the problem: [subagents/pattern-creation-design.md](subagents/pattern-creation-design.md)
- Priority 1 when object collaboration or interface shape is the problem: [subagents/pattern-structure-design.md](subagents/pattern-structure-design.md)
- Priority 1 when behavior variation or workflow decision is the problem: [subagents/pattern-behavior-design.md](subagents/pattern-behavior-design.md)
- Priority 1 when application boundary or distributed flow is the problem: [subagents/architecture-pattern-design.md](subagents/architecture-pattern-design.md)

The priority is contextual. Do not run every subagent by default. Select only the group whose trigger matches the problem.

## Scripts

- None; this skill does not require dedicated scripts.

## Output Format

Use [resources/output-template-vi.md](resources/output-template-vi.md) for user-facing Vietnamese approval, completion, and no-pattern response templates.

## Notes

### Operating Mode

1. Understand the code smell, feature requirement, existing conventions, and current coupling.
2. Load [resources/pattern-selector.md](resources/pattern-selector.md).
3. Rank the relevant subagent prompts by fit and risk.
4. If no pattern is clearly needed, recommend the simpler refactor and stop.
5. Before applying a pattern, present the Vietnamese approval template from [resources/output-template-vi.md](resources/output-template-vi.md).
6. Proceed only after explicit approval.
7. Apply the smallest pattern implementation that fits the codebase.
8. Verify behavior with targeted tests or existing project commands.
9. Return a final note listing patterns used and results achieved.

### Approval Rule

Never apply a pattern silently. The parent agent must propose the chosen pattern group and concrete pattern, explain why, and wait for explicit user approval before implementation.
