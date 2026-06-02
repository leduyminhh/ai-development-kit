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

Use [resources/java-package-template.md](resources/java-package-template.md) when the target is a Java/Spring Boot service or when the user asks for the `tenant-admin-service` structure.

## Rings

| Ring | Owns | Must Not Depend On |
|---|---|---|
| Domain | business state, invariants, value objects, domain exceptions, framework-free domain services, domain policies and validators | application, infrastructure, bootstrap, Spring, JPA, messaging, HTTP clients |
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
3. Read [resources/java-package-template.md](resources/java-package-template.md) before proposing Java package trees.
4. Apply `code-shared-design` if the design exposes internal API, contracts, or shared logic.
5. Choose only the relevant subagent prompt:
   - [subagents/onion-domain-design.md](subagents/onion-domain-design.md)
   - [subagents/onion-application-design.md](subagents/onion-application-design.md)
   - [subagents/onion-infrastructure-design.md](subagents/onion-infrastructure-design.md)
   - [subagents/onion-boundary-review.md](subagents/onion-boundary-review.md)
   - [subagents/java-onion-design.md](subagents/java-onion-design.md)
6. Produce package/module boundaries before implementation details.
7. Call out infrastructure leakage, misplaced interfaces, or controller-to-implementation wiring immediately.

## Java/Spring Rules

- Use four top-level rings under the Java base package: `bootstrap`, `application`, `domain`, `infrastructure`.
- Use `publicapi` as the Java package for public APIs because `public` is a Java keyword; HTTP routes may still expose `/api/public/...`.
- Controllers call application service interfaces from `application.service.inf`, never `ServiceImpl`.
- Service implementations live in `application.service.<capability>` and end with `ServiceImpl`.
- Application returns result/view objects, not bootstrap response DTOs.
- Repository contracts and outbound ports live in `application.port.out`.
- Put framework-free domain business logic in `domain.service.<capability>`.
- Keep orchestration, transaction boundaries, and outbound coordination in `application.service.<capability>`.
- Domain service classes may represent policies, validators, evaluators, calculators, or other business-rule components without framework dependencies.
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

## When to Use

Use this skill when the user asks for Onion Architecture, Palermo-style inward dependencies, Java/Spring module boundaries, tenant-admin-service style package structure, or review for framework/infrastructure leakage.

## Core Process

1. Identify the capability, bounded context, and target Java package.
2. Load [resources/java-package-template.md](resources/java-package-template.md) when package placement or class naming is needed.
3. Place domain model and application ports toward the center; keep controllers, persistence, and framework adapters outside.
4. Delegate to the focused subagent when the task is specifically domain, application, infrastructure, or boundary review.
5. Return only files/classes the capability actually needs, then verify dependency direction.

## Examples

- A repository port belongs in `application/port/out/repos`; the Spring Data adapter belongs in infrastructure.
- A service interface belongs in application; its Spring implementation must not force domain classes to import Spring.
- A controller can call an application service but must not contain domain decisions.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "Spring annotations are convenient in domain objects." | Convenience creates inward framework coupling; keep domain independent. |
| "A repository implementation can live beside the port." | Ports are inner contracts; implementations are outer adapters. |
| "Generate the full template now." | Empty placeholders reduce clarity; create only files required by the capability. |

## Red Flags

- Domain or application imports Spring Web, Spring Data, JPA, or framework annotations.
- Infrastructure classes define business rules instead of adapting external systems.
- Package names describe layers but dependency direction still points outward from inner code.
- The design creates empty folders or placeholder classes without a concrete capability need.

## Verification

- Inner layers define interfaces used by outer layers.
- Domain code can compile without infrastructure dependencies.
- Infrastructure adapters implement application ports.
- The proposed package structure matches the selected capability and avoids unused scaffolding.
