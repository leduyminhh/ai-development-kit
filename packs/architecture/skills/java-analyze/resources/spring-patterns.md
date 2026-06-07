# Spring Patterns

## Layering

- Controller: HTTP mapping, auth context extraction, request/response translation.
- Application service: use-case orchestration, transaction boundary, port calls.
- Domain model/service: invariants, state transitions, calculations.
- Infrastructure adapter: database, external API, messaging, framework integration.

## Controller Rules

- Do not call repositories directly.
- Do not contain business branching.
- Convert request objects into application commands.
- Return response models, not JPA entities.

## Service Rules

- Put `@Transactional` on application services for write use cases.
- Split command services and query services when read/write logic diverges.
- Keep external calls outside database transactions unless coordinated explicitly.
- Make idempotency explicit for create, payment, notification, and message flows.

## Configuration

- Keep framework configuration in infrastructure or bootstrap config packages.
- Avoid component scanning that accidentally wires test or adapter-only classes.
- Prefer constructor injection.

## Common Smells

- `@Transactional` on controller.
- Entity returned directly from API.
- Mapper querying repositories.
- Service method that mixes validation, persistence, integration, and response formatting.
- Catch-all `Exception` handling that hides domain failure types.
