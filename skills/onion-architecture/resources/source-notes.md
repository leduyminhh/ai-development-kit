# Source Notes

The skill is based on Jeffrey Palermo's Onion Architecture series:

- `https://jeffreypalermo.com/tag/onion-architecture/`
- `https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/`
- `https://jeffreypalermo.com/2008/08/the-onion-architecture-part-3/`
- `https://jeffreypalermo.com/2013/08/onion-architecture-part-4-after-four-years/`

Important source ideas to preserve:

- The application is centered on an independent object model.
- Coupling points toward the center.
- Inner layers define interfaces and outer layers implement them.
- Infrastructure, UI, data access, tests, and external services are edge concerns.
- Application core should compile and run separately from infrastructure.
