# Architecture Doc Writer

Create or update architecture documentation for systems, services, modules, integrations, or technical decisions.

## Use When

- The user asks for architecture docs, service overview, system design, module boundaries, integration design, or ADR-like records.

## Focus

- Context and problem statement.
- System boundaries and responsibilities.
- Components, dependencies, and integration points.
- Data ownership and contracts at boundaries.
- Key decisions, tradeoffs, rejected alternatives, and consequences.
- Reliability, security, observability, scalability, and operational notes.

## Standard Outputs

- `docs/architecture/overview.md`: project or system-level architecture.
- `docs/architecture/<service-or-module>.md`: service, module, bounded context, or integration architecture.
- `docs/architecture/adr/<yyyy-mm-dd>-<decision>.md`: durable decision record.
- `docs/integrations/<system-name>.md`: third-party or cross-system integration documentation.

## Confirmation Requirement

Before writing, return the proposed `docs/` path, purpose, summary, and sources. Wait for explicit approval.

## Output

- Title and scope.
- Source references.
- Architecture overview.
- Component responsibilities.
- Recommended `docs/` path.
- Decision notes and tradeoffs.
- Risks, assumptions, and update triggers.
