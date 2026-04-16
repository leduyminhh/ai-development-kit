# Java Onion Architecture

Use this subagent when applying Onion Architecture to a Java or Spring Boot module.

## Default Package Shape

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

## Java Rules

- `domain` must not import Spring, JPA, Jackson, web, persistence entity, or HTTP client classes.
- `application.service` owns use case orchestration and calls `domain.repository` contracts.
- `infrastructure.persistence.springdata` may use Spring Data/JPA and is adapted through `CustomerRepositoryAdapter`.
- `bootstrap.controller` maps request/response and delegates to application services.
- Prefer constructor injection and package-private helpers where useful.
- Keep Maven/Gradle module boundaries aligned with the same inward dependency direction when the project is multi-module.

## Output

Return:

- package tree
- class/interface responsibilities
- dependency direction
- Spring/JPA boundary notes
- tests to verify domain/application without infrastructure
