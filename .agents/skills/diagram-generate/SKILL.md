---
name: diagram-generate
description: Use when designing, generating, or reviewing PlantUML diagrams, especially when selecting the right diagram type, delegating to specialized diagram subagents, and returning renderable PlantUML source.
---

# Diagram Generate

## Overview

Use this skill to turn system descriptions, flows, architecture notes, data structures, plans, or requirements into PlantUML diagrams.

The parent agent chooses the diagram type first, then uses only the relevant subagent prompt. Do not run every diagram subagent by default.

## Operating Mode

1. Identify the diagram purpose: explanation, architecture review, workflow design, data modeling, planning, UI sketch, or troubleshooting.
2. Identify the audience: engineering, product, operations, leadership, or mixed.
3. Load `resources/plantuml-diagram-selection.md`.
4. Select the smallest useful PlantUML diagram type.
5. Load `resources/plantuml-output-rules.md`.
6. Use the relevant subagent prompt from `subagents/`.
7. Return one complete `plantuml` fenced code block per diagram.
8. If the user wants a persistent file, resolve the output path with `scripts/resolve-output-file.ps1` from `[diagram.writer]` plus `[output.file.extensionsBySubpath]`; default to `docs/diagram/subagent/filename_yyyyMMdd_HHmm.puml`.
9. Before writing under `docs/diagram`, request explicit protected-path confirmation with path, purpose, and summary.
10. Add assumptions and rendering notes only when they help the user act.

## Resource Map

- `resources/diagram-prompt-selector.md`: choose the smallest useful diagram type and matching subagent prompt.
- `resources/plantuml-diagram-selection.md`: diagram type selection rules and subagent mapping.
- `resources/plantuml-output-rules.md`: PlantUML output contract, naming, style, and rendering guidance.

## Output Format

```text
Diagram type:
Output file:
Assumptions:

```plantuml
@startuml
' diagram source
@enduml
```

Render:
Rui ro / ghi chu:
```

## Quality Gate

- The PlantUML block must be complete and renderable.
- Every participant, component, class, state, or entity name must come from provided context or a labeled assumption.
- Prefer readable layout over exhaustive detail.
- Avoid mixing unrelated diagram concerns in one diagram.
- Persistent diagram files must use `docs/diagram/subagent/filename_yyyyMMdd_HHmm.puml` unless the user explicitly asks for another path.
- Because `docs/` is protected, never create or update a diagram file without explicit confirmation.
- If the user asks for visual rendering, provide PlantUML server/local render instructions unless a render command was actually run.


