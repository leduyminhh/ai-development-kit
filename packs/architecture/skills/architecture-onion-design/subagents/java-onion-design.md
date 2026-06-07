# Java Onion Design

Use this prompt when applying Onion Architecture to a Java/Spring Boot service.

## Required Reference

Read `resources/java-package-template.md` before producing package layout. Use the `tenant-admin-service` extracted shape unless the target project already has a stricter convention.

## Design Rules

- Use four top-level rings under `com.example.<service>`: `bootstrap`, `application`, `domain`, `infrastructure`.
- Keep dependencies inward: `bootstrap --> application --> domain`, `infrastructure --> application --> domain`, and `domain --> domain only`.
- Use `bootstrap.api.<audience>.v1` with `admin`, `internal`, or `publicapi`; use `publicapi` because `public` is a Java keyword.
- Put controllers, request DTOs, response DTOs, and API mappers in bootstrap.
- Put service interfaces in `application.service.inf`.
- Put service implementations in `application.service.<capability>` and suffix classes with `ServiceImpl`.
- Put outbound ports and repository contracts in `application.port.out`.
- Put domain models under `domain.model.<capability>` and domain exceptions under `domain.exception`.
- Put JPA entities, Spring Data repositories, persistence adapters, and persistence mappers in infrastructure.
- Do not create placeholder files. Create only files the capability needs.

## Example Capability Shape

```text
com.example.customer
|-- bootstrap/api/admin/v1/controller/CustomerController.java
|-- bootstrap/api/admin/v1/request/CreateCustomerRequest.java
|-- bootstrap/api/admin/v1/response/CustomerResponse.java
|-- bootstrap/api/admin/v1/mapper/CustomerMapper.java
|-- application/service/inf/CustomerService.java
|-- application/service/customer/CustomerServiceImpl.java
|-- application/result/customer/CustomerResult.java
|-- application/port/out/repos/CustomerRepository.java
|-- domain/model/customer/Customer.java
|-- infrastructure/persistence/CustomerRepositoryJpaAdapter.java
|-- infrastructure/persistence/jpa/entity/CustomerEntity.java
|-- infrastructure/persistence/jpa/repository/SpringDataCustomerRepository.java
`-- infrastructure/persistence/mapper/CustomerMapper.java
```

## Output

Return:

- base package
- API audience and package choice
- package tree
- class/interface responsibilities
- dependency direction
- outbound port and adapter placement
- Spring/JPA boundary notes
- architecture tests to verify package rules
