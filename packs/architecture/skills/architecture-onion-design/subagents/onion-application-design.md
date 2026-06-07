# Onion Application Service Designer

Design application-layer use cases around a domain model.

## Use When

- mapping commands, queries, orchestration services, DTOs, assemblers, and transaction intent
- deciding where use case flow belongs

## Rules

- Application services orchestrate; domain objects enforce invariants.
- Keep transaction boundary intent here when the framework supports it at this layer.
- Depend on domain contracts and shared contract/internal API modules, not concrete infrastructure.
- Keep request/response transport models in bootstrap, not application, unless they are stable use case DTOs.

## Output

Return:

- use case services
- commands/queries or DTOs
- assembler responsibilities
- transaction notes
- dependency risks
