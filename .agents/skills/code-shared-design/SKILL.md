---
name: code-shared-design
description: Use when designing shared internal API, contract, SDK, or shared logic modules published through Nexus or reused across services regardless of Clean, Onion, Hexagonal, or layered architecture.
---

# Shared Module Architecture

## Overview

Use this skill to design reusable modules that any architecture can consume without breaking its boundaries. The goal is to let services import stable internal API and contract artifacts from Nexus, while keeping shared logic small, versioned, and infrastructure-free.

## Module Types

| Module | Purpose | Allowed Content | Forbidden Content |
|---|---|---|---|
| Shared internal API | typed client-facing or service-facing API surface for internal modules | interfaces, request/response DTOs, commands, query models, client contracts | service implementation, persistence, web controllers, framework boot config |
| Shared contract | compatibility contract between modules/services | OpenAPI schemas, event schemas, enum contracts, validation annotations when portable, examples | database entities, business workflows, adapters |
| Shared logic | reusable pure behavior | value objects, deterministic utilities, policy helpers, mappers with no infrastructure | HTTP clients, repositories, transactions, caches, hidden IO |

## Nexus Rule

- Publish shared artifacts with semantic versions and changelog discipline.
- Consumers import the artifact as a library from Nexus.
- Backward compatibility matters because multiple services may upgrade at different times.
- Breaking changes require a new major version or explicit migration plan.
- Do not use shared modules as a dumping ground for convenience code.

## Architecture Compatibility

- Onion/Clean/Hexagonal cores may depend on shared contracts only if the artifact is framework-free and stable.
- Infrastructure adapters may depend on generated clients or transport-specific contract helpers.
- Bootstrap/web layers may depend on request/response contract artifacts when those artifacts are intentionally transport-facing.
- Shared logic must not depend on a consuming service's infrastructure.

## Operating Mode

1. Identify whether the shared need is internal API, contract, shared logic, or generated client.
2. Define artifact name, package namespace, owner, versioning rule, and compatibility expectation.
3. Keep dependencies minimal and portable.
4. Decide which architecture ring/layer may import the artifact.
5. Add tests for serialization, compatibility, and pure behavior as appropriate.

## Output Format

Return:

- shared module type
- artifact/package name
- allowed consumers
- allowed dependencies
- Nexus/versioning plan
- compatibility tests
- boundary risks
