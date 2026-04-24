# Project Documentation Output Catalog

Use this catalog when proposing documentation for a project. Every persistent path must start with `docs/` and resolve to `<repo-root>/docs`.

## Root Folder Rule

- Read `[documentation.writer].rootPath` from `.codex/config.toml` when available.
- Default root path is `docs`.
- Resolve the root path from the repository root, not from the current shell directory.
- Create missing folders under `<repo-root>/docs` only after explicit user confirmation.
- Do not write to `reports/`, `.codex/`, `.agents/skills/`, or arbitrary folders for project documentation unless the user explicitly overrides the target path.

## Standard Outputs

| Need | Default path | Typical content |
| --- | --- | --- |
| System architecture | `docs/architecture/overview.md` | context, components, boundaries, integrations, NFRs |
| Service/module architecture | `docs/architecture/<service-or-module>.md` | responsibilities, dependencies, contracts, risks |
| Architecture decision | `docs/architecture/adr/<yyyy-mm-dd>-<decision>.md` | context, decision, alternatives, consequences |
| Feature documentation | `docs/features/<feature-name>.md` | scope, behavior, roles, API/UI notes, acceptance criteria |
| Flow documentation | `docs/flows/<flow-name>.md` | trigger, actors, happy path, error path, state/sequence diagram |
| API flow | `docs/flows/api/<api-or-use-case>.md` | endpoint sequence, validation, auth, errors, retries |
| Operational runbook | `docs/runbooks/<operation-name>.md` | symptoms, checks, commands, rollback, escalation |
| Database overview | `docs/database/overview.md` | ownership, schemas, lifecycle, cross-service data rules |
| Entity/table catalog | `docs/database/entities/<entity-or-table>.md` | fields, constraints, relations, indexes, query usage |
| ERD | `docs/database/erd.md` | Mermaid ER diagram plus entity notes and assumptions |
| Migration note | `docs/database/migrations/<yyyy-mm-dd>-<change>.md` | migration purpose, compatibility, backfill, rollback |
| Integration documentation | `docs/integrations/<system-name>.md` | contract, auth, retries, limits, failure handling |
| Release handoff | `docs/releases/<version-or-date>.md` | changes, verification, risks, rollout, rollback |

## Selection Rules

- Use one focused document when the request has one clear target.
- Propose multiple documents only when the user asks for a documentation pack or when the domain naturally splits across architecture, feature, flow, and database.
- Prefer `docs/database/erd.md` for project-wide ERD and `docs/database/erd-<bounded-context>.md` for bounded contexts.
- Prefer `docs/flows/<name>.md` for user/business flow and `docs/flows/api/<name>.md` for endpoint orchestration.
- Prefer ADR only for durable technical decisions, not routine implementation notes.

## Confirmation Template

```text
Proposed documentation change:
- Path: docs/<category>/<name>.md
- Purpose: <why this document is needed>
- Summary: <short content summary>
- Sources: <code/ticket/schema inputs inspected>

Confirm? (yes/no)
```

For multiple files, list every `docs/` path and summary. Do not write until the user explicitly confirms.

