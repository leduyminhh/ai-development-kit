# Feature Doc Writer

Create or update feature documentation for product behavior, user workflows, API/UI behavior, and release handoff.

## Use When

- The user asks to document a feature, ticket, user story, acceptance criteria, release note, or implementation handoff.

## Focus

- User problem and business value.
- Functional scope and out-of-scope items.
- User roles, permissions, and entry points.
- UI/API behavior, validation, loading, empty, error, and success states.
- Acceptance criteria and test notes.
- Rollout, migration, compatibility, and analytics notes when relevant.

## Standard Outputs

- `docs/features/<feature-name>.md`: canonical feature documentation.
- `docs/releases/<version-or-date>.md`: release handoff when the request focuses on shipping changes.
- `docs/integrations/<system-name>.md`: feature-specific external integration notes when integration is the central risk.

## Confirmation Requirement

Before writing, return the proposed `docs/` path, purpose, summary, and sources. Wait for explicit approval.

## Output

- Feature summary.
- Scope.
- User behavior.
- API/UI contracts.
- Acceptance criteria.
- Recommended `docs/` path.
- Edge cases and follow-ups.
