---
name: doc-write
description: Use when creating, updating, reviewing, or planning technical documentation for software systems, including architecture documentation, feature documentation, flow/process documentation, database/schema/ERD documentation, ADR-style decisions, README sections, implementation handoff notes, and documentation generated from code, tickets, APIs, or diagrams. Treat docs as tracked project documentation and report outputs as ignored local artifacts unless the user asks otherwise.
---

# Documentation Writer

## Overview

Use this skill to produce accurate, maintainable technical documentation from code, requirements, tickets, architecture notes, database schemas, API contracts, diagrams, or implementation diffs. The agent should document what is true, identify unknowns, and avoid inventing behavior.

## When to Use

Use this skill when creating, updating, reviewing, or planning README sections, architecture docs, feature docs, flow docs, database docs, ADR-style decisions, implementation handoff notes, or documentation derived from code, tickets, APIs, schemas, or diagrams.

## Core Process

1. Identify audience, purpose, sources, and target path.
2. Inspect source material before writing factual claims.
3. Choose the narrowest document type and load only the needed resource or subagent.
4. Treat `docs/` as tracked project documentation, and `report/`/`reports/` as ignored local-output paths.
5. Draft concise, source-backed content; label assumptions and open questions.
6. Verify links, commands, paths, terminology, and ignored-output compliance.

## Examples

- Use `doc-flow-write` for business process, sequence, state transition, or async job docs.
- Use `doc-database-write` for schema, relation, index, migration, and ownership docs.
- Update README inline when the target is the repository root.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "Documentation can infer missing behavior." | Unknowns must be labeled; invented behavior is worse than no documentation. |
| "It is just a docs file, so I can skip review." | `docs/` is tracked project documentation and should stay reviewable. |
| "Longer docs are more complete." | Maintainability comes from accurate scope, stable headings, and useful references. |

## Red Flags

- Claims are not traceable to code, config, tickets, APIs, or user-provided material.
- Persistent documentation files are written without clear user intent.
- The document duplicates large code blocks instead of summarizing and linking.
- Assumptions are presented as facts.

## Verification

- Sources inspected are listed.
- Documentation output rules were followed.
- Links, paths, commands, and names are checked where feasible.
- Assumptions, gaps, and residual risks are explicit.

## Resource Map

- [resources/document-quality-rules.md](resources/document-quality-rules.md): documentation quality bar, source-of-truth rules, structure, tone, and verification checklist.
- [resources/project-doc-output-catalog.md](resources/project-doc-output-catalog.md): standard project documentation outputs, path conventions, confirmation template, and file selection rules.
- [resources/output-template-vi.md](resources/output-template-vi.md): Vietnamese documentation handoff template.

## Subagent Prompts

- [subagents/doc-architecture-write.md](subagents/doc-architecture-write.md): create or update system, service, module, integration, and decision documentation.
- [subagents/doc-feature-write.md](subagents/doc-feature-write.md): document product features, user behavior, acceptance criteria, API/UI behavior, and release notes.
- [subagents/doc-flow-write.md](subagents/doc-flow-write.md): document business flows, sequence flows, state transitions, async jobs, error paths, and operational runbooks.
- [subagents/doc-database-write.md](subagents/doc-database-write.md): document database schema, tables, relations, indexes, migrations, retention, and data ownership.

## Scripts

- None; this skill does not require dedicated scripts.

## Output Format

Use [resources/output-template-vi.md](resources/output-template-vi.md) for the user-facing Vietnamese documentation handoff template.

## Notes

### Operating Mode

1. Identify the document purpose, audience, source material, expected format, and target path.
2. Inspect the relevant code, config, migrations, tests, tickets, or diagrams before writing factual content.
3. Choose the narrowest document type:
   - architecture document
   - feature document
   - flow document
   - database document
   - combined documentation when the user explicitly requests a broader artifact
4. Load only the relevant resource or subagent prompt.
5. Load [resources/project-doc-output-catalog.md](resources/project-doc-output-catalog.md) when proposing project documentation outputs, multi-file documentation, ERD, ADR, runbook, API docs, or docs folder structure.
6. Resolve the documentation root from config `[documentation.writer].rootPath`; default to `docs`.
7. Every persistent documentation output must propose a `docs/`-prefixed target path before writing.
8. Treat `docs/` as repository-root relative, meaning `<repo-root>/docs`, never current-shell relative from another folder.
9. `docs/`, `report/`, and `reports/` are not protected paths in this repository; `docs/` is tracked documentation while `report/` and `reports/` are ignored local-output paths.
10. After explicit approval, create missing parent directories under `<repo-root>/docs` before writing the document.
11. Prefer diagrams or structured sections only when they improve comprehension.
12. Mark assumptions, open questions, and source gaps clearly.
13. Verify links, file references, commands, schema names, API names, and terminology where feasible.
14. Use [resources/output-template-vi.md](resources/output-template-vi.md) for the user-facing Vietnamese documentation handoff response.

### Documentation Rules

- Use source-backed statements. If a fact is inferred, label it as an inference.
- Do not duplicate large code blocks unless the user asks; summarize behavior and reference files instead.
- Keep documents maintainable: stable headings, short sections, explicit ownership, and clear update triggers.
- Prefer current repo vocabulary over generic architecture language.
- Include diagrams in Mermaid only when the target surface supports it or the user asks.
- Keep user-facing prose professional, precise, and free of promotional language.
- Use `docs/` as the required prefix for proposed persistent project documentation paths.
- Resolve `docs/` from repository root as `<repo-root>/docs`.
- Before writing to `docs/`, confirm that the user wants a persistent local artifact rather than an inline draft.
- Create missing folders under `<repo-root>/docs` as part of the write operation when a persistent artifact is requested.
- If a persistent artifact is not requested, provide the draft inline instead of writing the file.

### Required Confirmation Flow

Before creating or updating any `docs/` file, ensure the user asked for persistent output. A concise confirmation is enough when intent is ambiguous:

```text
Proposed documentation change:
- Path: docs/<category>/<name>.md
- Purpose: <why this document is needed>
- Summary: <short content summary>
- Sources: <code/ticket/schema inputs inspected>

Create this local documentation artifact? (yes/no)
```

Proceed only after explicit intent for a persistent artifact.
