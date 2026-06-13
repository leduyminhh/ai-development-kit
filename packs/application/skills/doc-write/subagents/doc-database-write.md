# Database Doc Writer

Create or update database documentation for schema, migrations, relationships, constraints, indexes, and data lifecycle.

## Use When

- The user asks for database docs, schema docs, ERD notes, table catalog, migration documentation, or data ownership documentation.

## Focus

- Data ownership and source of truth.
- Tables, columns, types, constraints, defaults, and nullable behavior.
- Relationships, foreign keys, cardinality, and integrity rules.
- Indexes, query patterns, and performance considerations.
- Migration history, backfill requirements, retention, and privacy/security concerns.

## Standard Outputs

- `docs/database/overview.md`: database ownership, schemas, lifecycle, and cross-service data rules.
- `docs/database/erd.md`: project-level ERD.
- `docs/database/erd-<bounded-context>.md`: bounded-context ERD.
- `docs/database/entities/<entity-or-table>.md`: entity/table catalog.
- `docs/database/migrations/<yyyy-mm-dd>-<change>.md`: migration, backfill, and rollback notes.

## ERD Guidance

- Prefer Mermaid `erDiagram` when the target document supports Mermaid.
- Include cardinality, foreign keys, important nullable fields, and inferred relationships.
- Label inferred relationships explicitly when not backed by foreign keys or migrations.
- Keep ERD readable; split by bounded context when the diagram becomes too dense.

## Confirmation Requirement

Before writing, return the proposed `docs/` path, purpose, summary, and sources. Wait for explicit approval.

## Output

- Database scope.
- Entity/table catalog.
- Relationships.
- ERD path and diagram format when requested or useful.
- Recommended `docs/` path.
- Index and query notes.
- Migration and lifecycle notes.
- Risks, assumptions, and open questions.
