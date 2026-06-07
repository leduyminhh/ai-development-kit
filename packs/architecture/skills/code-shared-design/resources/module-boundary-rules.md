# Shared Module Boundary Rules

Use this reference when deciding what can go into a shared internal API, contract, or shared logic module.

## Hard Rules

- Keep shared modules framework-free unless the artifact is explicitly transport-specific.
- Prefer no framework dependency, no infrastructure dependency, no database dependency, and no hidden IO.
- Do not put service implementation in shared internal API or contract artifacts.
- Do not put persistence entities in shared contract modules.
- Do not put HTTP clients, caches, message publishers, schedulers, or transactions in shared logic.
- Keep dependencies stable and minimal.
- Publish via Nexus with semantic versioning.

## Placement Rules

- Domain/application layers may import framework-free contracts and pure shared logic.
- Infrastructure layers may import transport clients, generated clients, or adapter-specific contract helpers.
- Bootstrap layers may import transport request/response contracts.
- Shared internal API may define interfaces, DTOs, and client contracts but not concrete business implementation.

## Testing Rules

- Contract modules need schema or serialization compatibility tests.
- Internal API modules need compile-time consumer examples or contract tests.
- Shared logic modules need unit tests for edge cases and deterministic behavior.
