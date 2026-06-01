---
name: code-design-pattern
description: Use when acting as a design pattern advisor for Java or JVM code, especially when choosing whether to apply creational, structural, behavioral, or architectural patterns; must avoid pattern overuse, rank candidate pattern subagents, ask the user for approval before applying any pattern, and report which patterns were used, why, and what outcome was achieved.
---

# Design Pattern

## Overview

Use this skill to decide whether a design pattern is appropriate before changing code. The parent agent should select a pattern only when it solves a concrete design pressure such as object creation complexity, interface mismatch, behavior variation, workflow orchestration, or architectural boundary.

Source taxonomy: Baeldung Design Patterns Series, which organizes patterns into Creational, Structural, Behavioral, and Other Architectural Patterns.

## Operating Mode

1. Understand the code smell, feature requirement, existing conventions, and current coupling.
2. Load [resources/pattern-selector.md](resources/pattern-selector.md).
3. Rank the relevant subagent prompts by fit and risk.
4. If no pattern is clearly needed, recommend the simpler refactor and stop.
5. Before applying a pattern, present a concise decision note:
   - `Pattern được đề xuất:`
   - `Cơ sở lựa chọn:`
   - `Rủi ro nếu áp dụng không phù hợp:`
   - `Yêu cầu phê duyệt: vui lòng xác nhận trước khi triển khai.`
6. Proceed only after explicit approval.
7. Apply the smallest pattern implementation that fits the codebase.
8. Verify behavior with targeted tests or existing project commands.
9. Return a final note listing patterns used and results achieved.

## Resource Map

- [resources/pattern-selector.md](resources/pattern-selector.md): parent selection workflow, subagent priority rules, and anti-overuse gate.
- [resources/baeldung-pattern-catalog.md](resources/baeldung-pattern-catalog.md): compact taxonomy inspired by the Baeldung series.
- [resources/approval-and-report.md](resources/approval-and-report.md): required approval prompt and final response template.

## Subagent Prompts

Use files in `subagents/` as role prompts when evaluating a pattern group:

- Priority 1 when object creation is the problem: [subagents/pattern-creation-design.md](subagents/pattern-creation-design.md)
- Priority 1 when object collaboration or interface shape is the problem: [subagents/pattern-structure-design.md](subagents/pattern-structure-design.md)
- Priority 1 when behavior variation or workflow decision is the problem: [subagents/pattern-behavior-design.md](subagents/pattern-behavior-design.md)
- Priority 1 when application boundary or distributed flow is the problem: [subagents/architecture-pattern-design.md](subagents/architecture-pattern-design.md)

The priority is contextual. Do not run every subagent by default. Select only the group whose trigger matches the problem.

## Approval Rule

Never apply a pattern silently. The parent agent must propose the chosen pattern group and concrete pattern, explain why, and wait for explicit user approval before implementation.

## Output Format

Before applying:

```text
Pattern được đề xuất:
Cơ sở lựa chọn:
Rủi ro nếu áp dụng không phù hợp:
Yêu cầu phê duyệt: vui lòng xác nhận trước khi triển khai.
```

After applying:

```text
Pattern đã áp dụng:
Kết quả đạt được:
Files changed:
Verification:
Rủi ro / khuyến nghị tiếp theo:
```
