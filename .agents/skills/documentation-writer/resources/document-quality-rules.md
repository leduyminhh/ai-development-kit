# Document Quality Rules

## Source Hierarchy

Prefer sources in this order:

1. Current code, migrations, tests, config, API contracts, and generated types.
2. Product tickets, PR descriptions, design docs, and user-provided requirements.
3. Runtime behavior from logs, command output, or verified examples.
4. Explicit inference, clearly labeled as inference.

## Required Qualities

- Accuracy: every concrete statement should be traceable to inspected source or clearly marked as assumption.
- Maintainability: include owner, update trigger, and source references when useful.
- Scanability: use headings, bullets, tables, and diagrams only where they reduce cognitive load.
- Completeness: cover happy path, failure paths, permissions, data, dependencies, and operational concerns when relevant.
- Professional tone: concise, direct, and neutral.

## Avoid

- Inventing undocumented behavior.
- Copying large source files into docs.
- Marketing copy in technical docs.
- Overly broad documents that mix architecture, feature, flow, and database concerns without a clear reason.
- Writing into protected paths without explicit confirmation.

## Verification Checklist

- Source files or tickets were inspected.
- Names match code: services, modules, endpoints, events, tables, columns, config keys.
- Assumptions and unknowns are visible.
- Diagrams, if any, match the written flow.
- Links and file references are valid when feasible.
