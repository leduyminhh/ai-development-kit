---
name: architecture-onion-design
description: Use when a user explicitly requests Onion Architecture, Palermo-style inward dependencies, domain-centered Java/Spring module design, tenant-admin-service style package structure, or architecture review for framework/infrastructure leakage.
---

# Onion Architecture

## Overview

Use this skill to design or review Java/Spring Boot services with Onion Architecture: domain stays at the center, dependencies point inward, and runtime/framework details stay at the edge. The Palermo rules are the baseline; the reusable Java package structure is extracted from `tenant-admin-service`.

## Source Baseline

Preserve these Jeffrey Palermo rules:

- The application is built around an independent object model.
- Inner layers define interfaces. Outer layers implement interfaces.
- Direction of coupling is toward the center.
- All application core code can be compiled and run separate from infrastructure.

Use `resources/java-package-template.md` when the target is a Java/Spring Boot service or when the user asks for the `tenant-admin-service` structure.

## Rings

| Ring | Owns | Must Not Depend On |
|---|---|---|
| Domain | business state, invariants, value objects, domain exceptions, framework-free domain services | application, infrastructure, bootstrap, Spring, JPA, messaging, HTTP clients |
| Application | service interfaces, service implementations, result/view objects, outbound ports, repository contracts, events, flow coordination | bootstrap, infrastructure, Spring Web, Spring Data, JPA, Feign, Redis, Kafka, database classes |
| Infrastructure | outbound port implementations, JPA entities, Spring Data repositories, persistence/client/messaging/cache adapters, technical mappers | bootstrap |
| Bootstrap | controllers, request/response DTOs, API mappers, advice, filters, runtime configuration, bean wiring, OpenAPI annotations | repositories, JPA entities, infrastructure adapters, business rules |

## Dependency Rule

Allowed:

```text
bootstrap --> application --> domain
infrastructure --> application --> domain
domain --> domain only
```

Forbidden:

```text
domain -X-> application
domain -X-> infrastructure
domain -X-> bootstrap
application -X-> infrastructure
application -X-> bootstrap
infrastructure -X-> bootstrap
```

Interfaces/contracts needed by application belong inward. Implementations belong outward.

## Operating Mode

1. Confirm the user wants Onion Architecture or the service already follows it.
2. Identify the service module, Java base package, API audience, and capability.
3. Read `resources/java-package-template.md` before proposing Java package trees.
4. Apply `code-shared-design` if the design exposes internal API, contracts, or shared logic.
5. Choose only the relevant subagent prompt:
   - `subagents/onion-domain-design.md`
   - `subagents/onion-application-design.md`
   - `subagents/onion-infrastructure-design.md`
   - `subagents/onion-boundary-review.md`
   - `subagents/java-onion-design.md`
6. Produce package/module boundaries before implementation details.
7. Call out infrastructure leakage, misplaced interfaces, or controller-to-implementation wiring immediately.

## Java/Spring Rules

- Use four top-level rings under the Java base package: `bootstrap`, `application`, `domain`, `infrastructure`.
- Use `publicapi` as the Java package for public APIs because `public` is a Java keyword; HTTP routes may still expose `/api/public/...`.
- Controllers call application service interfaces from `application.service.inf`, never `ServiceImpl`.
- Service implementations live in `application.service.<capability>` and end with `ServiceImpl`.
- Application returns result/view objects, not bootstrap response DTOs.
- Repository contracts and outbound ports live in `application.port.out`.
- JPA entities, Spring Data repositories, clients, messaging, and cache adapters stay in `infrastructure`.
- Only create files that the capability actually needs. Do not create empty placeholders.

## Review Checklist

1. Verify package rings: `bootstrap`, `application`, `domain`, `infrastructure`.
2. Verify controller -> service interface -> service implementation flow.
3. Verify application outbound ports and repository contracts live inward.
4. Verify infrastructure adapters implement those ports outward.
5. Verify request, response, and API mappers stay in bootstrap.
6. Verify application returns result/view objects, not HTTP DTOs.
7. Verify domain has no outer ring or framework dependency leakage.
8. Verify architecture tests cover dependency direction and package placement.

## Output Format

Return:

- Onion rings chosen.
- Package/module layout.
- Capability slice shape.
- Dependency direction decisions.
- API audience and `publicapi` package decision.
- Internal API/contract/shared logic impact.
- Infrastructure adapter plan.
- Boundary risks.
- Architecture test strategy.
