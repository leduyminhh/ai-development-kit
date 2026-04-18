# Baeldung Pattern Catalog

Compact taxonomy inspired by Baeldung Design Patterns Series:

Source: https://www.baeldung.com/design-patterns-series

## Creational

Use when object creation is the design pressure.

- Builder: many optional fields, readable immutable setup, validation before build.
- Factory Method: choose concrete implementation behind a stable creation method.
- Abstract Factory: create families of related objects that must be compatible.
- Singleton: exactly one process-local instance is required; avoid for business state and tests unless lifecycle is truly global.

## Structural

Use when object composition, wrappers, or interface boundaries are the design pressure.

- Adapter: make incompatible APIs fit an expected interface.
- Decorator: add behavior around an object without changing the core type.
- Proxy: control access, lazy loading, caching, security, or remote boundary.
- Bridge: separate abstraction from implementation when both vary independently.
- Composite: treat individual and tree-like grouped objects uniformly.
- Facade: hide complex subsystem details behind a narrow use-case API.
- Flyweight: share immutable heavy objects at scale; use only with measured memory pressure.
- DAO: isolate persistence access behind a dedicated boundary.

## Behavioral

Use when behavior, workflow, state, or algorithm variation is the design pressure.

- Strategy: swap algorithms or policies behind a stable interface.
- State: behavior changes according to lifecycle state.
- Command: represent an action as an object for queueing, retry, undo, or audit.
- Observer: notify subscribers without direct coupling.
- Template Method: fixed algorithm skeleton with overridable steps.
- Chain of Responsibility: pass a request through ordered handlers until handled.
- Mediator: reduce direct coupling among many collaborators.
- Memento: capture and restore state without exposing internals.
- Visitor: add operations over stable object structures.
- Interpreter: parse/evaluate a small language or expression grammar.

## Other Architectural

Use when the pattern shapes application boundaries rather than one class.

- DTO: move data across boundaries without leaking domain or persistence internals.
- Service Locator: central lookup; avoid when dependency injection is available unless legacy constraints require it.
- Intercepting Filter: apply cross-cutting request/response processing.
- Front Controller: centralize web request handling before dispatch.
- Null Object: replace null checks with a harmless behavior object when absence has stable behavior.
- Gateway: hide remote/service boundary behind a local contract.
- Page Object: isolate UI test interactions from test intent.
- Saga: coordinate distributed transactions with compensating actions.
- Integration Patterns: route, transform, split, aggregate, or mediate messages between systems.
