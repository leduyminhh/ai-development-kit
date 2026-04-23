# Java Spring Security Review

Load this file when the target stack is Java, Spring Boot, or Spring Security.

Review focus:

- Spring Security configuration:
  - request matcher order
  - default deny posture
  - CSRF policy for browser flows
  - stateless versus session assumptions
- Method security:
  - `@PreAuthorize`, `@PostAuthorize`, `@Secured`, service-layer enforcement
  - privileged methods reachable through alternate code paths
- Authentication:
  - `PasswordEncoder` choice and migration
  - JWT signature verification, expiry, issuer, audience
  - custom filters that bypass standard validation
- Controller and binding:
  - mass assignment via request DTO binding
  - file upload validation
  - path traversal and unsafe resource serving
- Persistence:
  - string-built JPQL or SQL
  - multi-tenant data scoping
  - unsafe native queries
- Platform exposure:
  - actuator endpoint exposure
  - management port and health detail leakage
  - debug or dev-only config accidentally enabled
- Java-specific red flags:
  - unsafe deserialization
  - expression language injection
  - permissive CORS or frame options for admin surfaces
