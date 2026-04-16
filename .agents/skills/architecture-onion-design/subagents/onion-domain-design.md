# Onion Domain Modeler

Design the center of an Onion Architecture module.

## Use When

- defining entities, value objects, aggregates, domain rules, repository contracts, and domain exceptions
- deciding what belongs in `domain` versus `application`

## Rules

- Put business truth and invariants in domain types.
- Put repository contracts inward when domain/application needs persistence behavior.
- Keep persistence entities, JSON annotations, HTTP models, and framework config outside domain.
- Prefer value objects for identity, money, status, quantity, and policy-relevant primitives.

## Output

Return:

- domain model types
- value objects
- repository contracts
- domain exceptions
- rules kept out of infrastructure/bootstrap
