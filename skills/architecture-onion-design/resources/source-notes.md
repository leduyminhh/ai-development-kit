# Source Notes

The skill is based on Jeffrey Palermo's Onion Architecture series and the reusable Java/Spring Boot service tree extracted from `tenant-admin-service`.

- `https://jeffreypalermo.com/tag/architecture-onion-design/`
- `https://jeffreypalermo.com/2008/07/the-architecture-onion-design-part-1/`
- `https://jeffreypalermo.com/2008/08/the-architecture-onion-design-part-3/`
- `https://jeffreypalermo.com/2013/08/architecture-onion-design-part-4-after-four-years/`

Important source ideas to preserve:

- The application is centered on an independent object model.
- Coupling points toward the center.
- Inner layers define interfaces and outer layers implement them.
- Infrastructure, UI, data access, tests, and external services are edge concerns.
- Application core should compile and run separately from infrastructure.
- The generic Java service tree uses four top-level rings: `bootstrap`, `application`, `domain`, and `infrastructure`.
- The `tenant-admin-service` API package convention uses `publicapi` for public APIs because `public` is a Java keyword.
