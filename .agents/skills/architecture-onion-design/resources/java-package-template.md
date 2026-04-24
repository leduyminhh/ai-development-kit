# Java Spring Boot Onion Package Template

Use this reference when applying Onion Architecture to a Java/Spring Boot service. The structure is extracted from `tenant-admin-service` and generalized for `com.example.<service>`.

## Base Service Shape

Every service has four top-level rings under its Java base package:

```text
com.example.<service>
|-- bootstrap
|-- application
|-- domain
`-- infrastructure
```

Allowed dependency direction:

```text
bootstrap --> application --> domain
infrastructure --> application --> domain
domain --> domain only
```

Forbidden dependency direction:

```text
domain -X-> application
domain -X-> infrastructure
domain -X-> bootstrap
application -X-> infrastructure
application -X-> bootstrap
infrastructure -X-> bootstrap
```

## Reference Tree

```text
src/main/java/com/example/<service>
|-- <Service>Application.java
|-- bootstrap
|   |-- advice
|   |-- api
|   |   |-- admin
|   |   |   `-- v1
|   |   |       |-- controller
|   |   |       |-- mapper
|   |   |       |-- request
|   |   |       `-- response
|   |   |-- internal
|   |   |   `-- v1
|   |   |       |-- controller
|   |   |       |-- mapper
|   |   |       |-- request
|   |   |       `-- response
|   |   `-- publicapi
|   |       `-- v1
|   |           |-- controller
|   |           |-- mapper
|   |           |-- request
|   |           `-- response
|   `-- config
|-- application
|   |-- event
|   |-- port
|   |   `-- out
|   |       |-- cache
|   |       |-- client
|   |       |-- event
|   |       `-- repos
|   |-- result
|   |   |-- common
|   |   `-- <capability>
|   |-- service
|   |   |-- inf
|   |   `-- <capability>
|   `-- view
|-- domain
|   |-- exception
|   |-- model
|   |   `-- <capability>
|   `-- service
`-- infrastructure
    |-- client
    |-- messaging
    |   `-- <provider>
    `-- persistence
        |-- <Capability>RepositoryJpaAdapter.java
        |-- jpa
        |   |-- entity
        |   `-- repository
        `-- mapper
```

`publicapi` is the Java package name for public APIs because `public` is a Java keyword. The HTTP route can still expose `/api/public/...`.

## Ring Responsibilities

| Ring | Allowed Responsibilities | Hard Rules |
|---|---|---|
| Bootstrap | controllers, request DTOs, response DTOs, API mappers, exception advice, runtime config, filters, OpenAPI annotations | Controllers call application service interfaces only. Bootstrap must not inject service implementations, repositories, JPA entities, or infrastructure adapters. |
| Application | service interfaces, service implementations, results, views, outbound ports, repository contracts, events, transaction intent, flow coordination | Application must not import bootstrap, infrastructure, Spring Web, Spring Data, JPA, Feign, Redis, Kafka, or database classes. |
| Domain | domain models, value objects, domain exceptions, factory methods, invariant methods, framework-free domain services | Domain must not import Spring, JPA, Hibernate, Feign, Redis, Kafka, bootstrap, application service, or infrastructure types. |
| Infrastructure | JPA entities, Spring Data repositories, persistence adapters, entity/domain mappers, HTTP/Feign clients, messaging adapters, cache adapters | Infrastructure implements application outbound ports and must not depend on bootstrap. JPA/client DTOs must not leak inward. |

## Application Ring Rules

- Do not use `UseCase` naming when the project chooses service interface and implementation style.
- Service interfaces live in `application.service.inf`.
- Service implementations live in `application.service.<capability>`.
- Service implementation classes end with `ServiceImpl`.
- Controllers call the service interface, never the implementation.
- Application methods return application result objects or application views, not bootstrap response DTOs.
- Application services may call outbound ports and repository contracts.
- Application services may build domain models and enforce flow-level decisions.
- Put interface contracts needed by the application inward; put implementations outward.

## Capability Slice Template

For a new capability named `<capability>`, create only the files that capability actually needs:

```text
domain/model/<capability>/<DomainModel>.java
application/service/inf/<Capability>Service.java
application/service/<capability>/<Capability>ServiceImpl.java
application/result/<capability>/<Capability>Result.java
application/port/out/repos/<Capability>Repository.java
bootstrap/api/<audience>/v1/controller/<Capability>Controller.java
bootstrap/api/<audience>/v1/request/<Capability>Request.java
bootstrap/api/<audience>/v1/response/<Capability>Response.java
bootstrap/api/<audience>/v1/mapper/<Capability>Mapper.java
infrastructure/persistence/<Capability>RepositoryJpaAdapter.java
infrastructure/persistence/jpa/entity/<Capability>Entity.java
infrastructure/persistence/jpa/repository/SpringData<Capability>Repository.java
infrastructure/persistence/mapper/<Capability>Mapper.java
```

Only create files that the capability actually needs. Do not create empty placeholders.

## Standard Request Flow

```text
API Controller
-> bootstrap request DTO
-> application service interface
-> application service implementation
-> application outbound port or repository interface
-> domain model
-> application result
-> bootstrap mapper
-> bootstrap response DTO
```

Mapping rules:

- Bootstrap maps HTTP request DTOs into service method parameters or application commands when commands are explicitly introduced.
- Application services return application result objects or views.
- Bootstrap mappers convert application results into HTTP response DTOs.
- Domain models should not be returned directly from controllers.
- HTTP response DTOs should not be returned from application services.
- Infrastructure mappers convert persistence/client objects to domain models or application-safe values.

## Apply Checklist

1. Identify the service module and base package.
2. Verify package rings: `bootstrap`, `application`, `domain`, `infrastructure`.
3. Verify controller -> service interface -> service implementation flow.
4. Verify application outbound ports and repository contracts live inward.
5. Verify infrastructure adapters implement those ports outward.
6. Verify request/response/mapper stay in bootstrap.
7. Verify application returns result/view objects, not HTTP DTOs.
8. Verify domain has no outer ring or framework dependency leakage.
9. Verify architecture tests cover dependency direction and package placement.
