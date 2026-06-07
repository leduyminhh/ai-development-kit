---
name: diagram-generate
description: Use when designing, generating, or reviewing PlantUML diagrams, especially when selecting the right diagram type, delegating to specialized diagram subagents, and returning renderable PlantUML source.
---

# Diagram-W

## Overview

Use this skill to turn system descriptions, flows, architecture notes, data structures, plans, or requirements into PlantUML diagrams.

The parent agent chooses the diagram type first, then uses only the relevant subagent prompt. Do not run every diagram subagent by default.

## When to Use

Use this skill when the user asks to design, generate, review, or select a PlantUML diagram type for architecture, sequence, activity, state, ERD, deployment, network, wireframe, mind map, or related diagrams.

## Core Process

1. Identify diagram intent, audience, and required notation.
2. Load [resources/plantuml-diagram-selection.md](resources/plantuml-diagram-selection.md) when the diagram type is ambiguous.
3. Delegate to the matching diagram subagent for the selected notation.
4. Apply [resources/plantuml-output-rules.md](resources/plantuml-output-rules.md) before returning source.
5. Return renderable PlantUML and note any assumptions.

## Examples

- Use a sequence diagram for API call order and failure paths.
- Use a component diagram for service dependencies and ownership.
- Use an ER diagram for entities, relationships, and cardinality.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "Any diagram type is fine." | Wrong notation hides the relationship the user needs to inspect. |
| "A sketch is enough." | The output must be renderable PlantUML unless the user asks otherwise. |
| "Generic labels are acceptable." | Domain-specific labels make the diagram reviewable and useful. |

## Red Flags

- Diagram type is chosen before understanding the question.
- PlantUML source depends on missing external files.
- Actors, systems, or boundaries are named generically.
- The diagram omits failure or alternate flows requested by the user.

## Verification

- PlantUML syntax is complete and renderable.
- The selected diagram type matches the stated intent.
- Labels use the user's domain vocabulary.
- Assumptions and omitted details are called out.

## Resource Map

- [resources/plantuml-diagram-selection.md](resources/plantuml-diagram-selection.md): diagram type selection rules and subagent mapping.
- [resources/plantuml-output-rules.md](resources/plantuml-output-rules.md): PlantUML output contract, naming, style, and rendering guidance.
- [resources/output-template-vi.md](resources/output-template-vi.md): Vietnamese diagram response template.

## Subagent Prompts

Use the most relevant prompt only:

- Interaction flow: [subagents/diagram-sequence-generate.md](subagents/diagram-sequence-generate.md)
- User/system goals: [subagents/diagram-usecase-generate.md](subagents/diagram-usecase-generate.md)
- Type/model structure: [subagents/diagram-class-generate.md](subagents/diagram-class-generate.md)
- Runtime examples: [subagents/diagram-object-generate.md](subagents/diagram-object-generate.md)
- Workflow/process: [subagents/diagram-activity-generate.md](subagents/diagram-activity-generate.md)
- Service/module boundaries: [subagents/diagram-component-generate.md](subagents/diagram-component-generate.md)
- Infrastructure topology: [subagents/diagram-deployment-generate.md](subagents/diagram-deployment-generate.md)
- Lifecycle/state changes: [subagents/diagram-state-generate.md](subagents/diagram-state-generate.md)
- Time-based signal behavior: [subagents/diagram-timing-generate.md](subagents/diagram-timing-generate.md)
- Project schedule: [subagents/diagram-gantt-generate.md](subagents/diagram-gantt-generate.md)
- Idea hierarchy: [subagents/diagram-mindmap-generate.md](subagents/diagram-mindmap-generate.md)
- Work breakdown: [subagents/diagram-wbs-generate.md](subagents/diagram-wbs-generate.md)
- Structured data view: [subagents/diagram-json-yaml-generate.md](subagents/diagram-json-yaml-generate.md)
- Network topology: [subagents/diagram-network-generate.md](subagents/diagram-network-generate.md)
- UI wireframe: [subagents/diagram-wireframe-salt-generate.md](subagents/diagram-wireframe-salt-generate.md)
- Enterprise architecture: [subagents/diagram-archimate-generate.md](subagents/diagram-archimate-generate.md)
- Entity relationship or IE notation: [subagents/diagram-er-ie-generate.md](subagents/diagram-er-ie-generate.md)
- Grammar or regular expressions: [subagents/diagram-grammar-generate.md](subagents/diagram-grammar-generate.md)

## Scripts

- None; this skill does not require dedicated scripts.

## Output Format

Use [resources/output-template-vi.md](resources/output-template-vi.md) for the user-facing Vietnamese diagram response template.

## Notes

### Operating Mode

1. Identify the diagram purpose: explanation, architecture review, workflow design, data modeling, planning, UI sketch, or troubleshooting.
2. Identify the audience: engineering, product, operations, leadership, or mixed.
3. Load [resources/plantuml-diagram-selection.md](resources/plantuml-diagram-selection.md).
4. Select the smallest useful PlantUML diagram type.
5. Load [resources/plantuml-output-rules.md](resources/plantuml-output-rules.md).
6. Use the relevant subagent prompt from `subagents/`.
7. Return one complete `plantuml` fenced code block per diagram.
8. If the user wants a persistent file, resolve the output path with repo-root [scripts/resolve-output-file.ps1](../../../scripts/resolve-output-file.ps1) using `[diagram.writer]` plus `[output.file.extensionsBySubpath]`; default to `docs/diagram/subagent/filename_yyyyMMdd_HHmm.puml`.
9. Treat `docs/diagram` as tracked project documentation; write there only when the task calls for a persistent diagram artifact, then report path, purpose, and summary.
10. Add assumptions and rendering notes only when they help the user act.

### Quality Gate

- The PlantUML block must be complete and renderable.
- Every participant, component, class, state, or entity name must come from provided context or a labeled assumption.
- Prefer readable layout over exhaustive detail.
- Avoid mixing unrelated diagram concerns in one diagram.
- Persistent diagram files must use `docs/diagram/subagent/filename_yyyyMMdd_HHmm.puml` unless the user explicitly asks for another path.
- Because `docs/` is tracked, keep generated diagram files reviewable and commit them only when they belong in project documentation.
- If the user asks for visual rendering, provide PlantUML server/local render instructions unless a render command was actually run.
