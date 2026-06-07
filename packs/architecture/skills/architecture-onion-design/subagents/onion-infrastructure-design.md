# Onion Infrastructure Adapter Designer

Design outer-ring adapters for persistence, external systems, messaging, and framework integration.

## Use When

- implementing repository contracts
- integrating databases, HTTP clients, message brokers, storage, caches, or external services
- wiring application contracts to concrete technology

## Rules

- Implement inward contracts; do not make the core depend on adapter classes.
- Translate persistence entities and external payloads at the adapter boundary.
- Keep retry, timeout, serialization, SQL, and framework annotations outside domain.
- Expose only domain/application concepts inward.

## Output

Return:

- adapter classes
- contracts implemented
- mapping strategy
- configuration/wiring notes
- infrastructure leakage risks
