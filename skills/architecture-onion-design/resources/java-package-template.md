# Java Onion Package Template

Use this reference when the target module is Java or Spring Boot and the user wants Onion Architecture.

## Default Shape

```text
com.example.customer
|-- domain
|   |-- model
|   |   |-- Customer.java
|   |   |-- CustomerId.java
|   |   `-- LoyaltyTier.java
|   |-- repository
|   |   `-- CustomerRepository.java
|   `-- exception
|
|-- application
|   |-- service
|   |   |-- CustomerRegistrationService.java
|   |   |-- CustomerQueryService.java
|   |   `-- CustomerProfileService.java
|   |-- dto
|   `-- assembler
|
|-- infrastructure
|   |-- persistence
|   |   |-- entity
|   |   |-- springdata
|   |   `-- CustomerRepositoryAdapter.java
|   |-- external
|   `-- config
|
`-- bootstrap
    |-- controller
    |-- request
    |-- response
    `-- config
```

## Package Rules

- `domain.model`: entities, value objects, enums, domain behavior.
- `domain.repository`: contracts needed by domain/application; no Spring Data, JPA entity, SQL, or HTTP client types.
- `domain.exception`: domain-specific exceptions that do not depend on web status codes.
- `application.service`: use case orchestration, transaction intent, policy coordination.
- `application.dto`: use case DTOs that are stable inside the module boundary.
- `application.assembler`: conversion between domain and application DTOs; no persistence entity mapping.
- `infrastructure.persistence.entity`: JPA or database-specific persistence shapes.
- `infrastructure.persistence.springdata`: framework repositories.
- `infrastructure.persistence.*Adapter`: implements domain/application repository contracts.
- `infrastructure.external`: clients for other services, queues, storage, or gateways.
- `bootstrap.controller`: REST/RPC entry points; no business logic.
- `bootstrap.request` and `bootstrap.response`: transport models only.
- `bootstrap.config`: wiring, beans, route/security/bootstrap config.

## Dependency Direction

```text
bootstrap -> application -> domain
infrastructure -> application/domain contracts
domain -> domain only
```

Do not allow `domain` or `application` to import `bootstrap` or concrete `infrastructure` packages.
