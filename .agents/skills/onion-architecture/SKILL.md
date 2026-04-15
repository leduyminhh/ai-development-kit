---
name: onion-architecture
description: Use when a user explicitly requests Onion Architecture, Palermo-style inward dependencies, domain-centered module design, Java/Spring onion package layout, or architecture review for infrastructure leakage.
---

# Onion Architecture

## Overview

Use this skill to force a design toward Onion Architecture: the domain model sits at the center, dependencies point inward, and infrastructure lives at the edge. This skill follows Jeffrey Palermo's Onion Architecture guidance and should be applied before language-specific architect skills choose packages, modules, or dependencies.

## Source Baseline

Jeffrey Palermo's Onion Architecture series defines these core rules:

- The application is built around an independent object model.
- Inner layers define interfaces. Outer layers implement interfaces.
- Direction of coupling is toward the center.
- All application core code can be compiled and run separate from infrastructure.

Use these as hard constraints, not optional style preferences.

## Rings

| Ring | Owns | Must Not Depend On |
|---|---|---|
| Domain | entities, value objects, domain rules, repository contracts, domain exceptions | application services, persistence, web, messaging, framework annotations when avoidable |
| Application | use cases, orchestration services, commands/queries, DTOs, assemblers, transaction boundary intent | concrete database, HTTP client, message broker, UI/controller implementation |
| Infrastructure | persistence adapters, external clients, messaging adapters, framework config | bootstrap/controller details |
| Bootstrap | controllers, request/response models, dependency wiring, app startup config | direct persistence implementation except through configured dependencies |

## Dependency Rule

- Code may depend on its own ring or an inner ring.
- Code must not depend on an outer ring.
- Interfaces/contracts needed by the core belong inward; implementations belong outward.
- Database, filesystem, message broker, HTTP client, UI, framework startup, and tests are edge concerns.
- Dependency injection wires outer implementations to inner contracts at runtime.

## Operating Mode

1. Confirm the user explicitly requested Onion Architecture or an existing project already follows it.
2. Identify module boundary and business capability before package names.
3. Apply shared module rules if the design exposes internal API, contract, or shared logic artifacts.
4. Choose the relevant subagent prompt:
   - `subagents/onion-domain-modeler.md`
   - `subagents/onion-application-service-designer.md`
   - `subagents/onion-infrastructure-adapter-designer.md`
   - `subagents/onion-boundary-reviewer.md`
   - `subagents/java-onion-architecture.md`
5. Produce package/module boundaries and dependency direction before implementation details.
6. Call out any infrastructure leakage or misplaced interface immediately.

## Java Package Default

For Java/Spring modules, prefer this shape unless the existing project has a stronger convention:

```text
com.example.<module>
├── domain
├── application
├── infrastructure
└── bootstrap
```

Read `resources/java-package-template.md` before producing Java package layouts.

## Shared Module Compatibility

If the architecture includes reusable internal APIs, contracts, or shared logic, apply `shared-module-architecture` as a companion skill. Onion modules may depend on published shared artifacts only when those artifacts remain framework-free, versioned, and do not pull infrastructure back into the domain/application core.

## Review Checklist

- Domain model compiles without infrastructure.
- Repository contracts live inward; repository implementations live outward.
- Application services orchestrate use cases and transaction intent.
- Bootstrap/controller code does not contain business rules.
- Infrastructure adapters do not leak entities, clients, or framework types inward.
- Shared modules expose contracts and internal API without depending on service implementation.
- Tests can target domain/application without starting web or persistence infrastructure.

## Output Format

Return:

- Onion rings chosen.
- Package/module layout.
- Dependency direction decisions.
- Internal API/contract/shared logic module impact.
- Infrastructure adapter plan.
- Boundary risks.
- Verification or test strategy.
