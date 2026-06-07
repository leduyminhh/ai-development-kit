# Flow Doc Writer

Create or update flow documentation for business processes, sequence flows, state machines, async jobs, and operational procedures.

## Use When

- The user asks for flow docs, process docs, sequence diagrams, state transition docs, lifecycle docs, or runbooks.

## Focus

- Trigger and preconditions.
- Actors, systems, and responsibilities.
- Step-by-step happy path.
- Branches, retries, compensation, timeout, and failure paths.
- State transitions and terminal states.
- Observability points, logs, metrics, and alerts.

## Standard Outputs

- `docs/flows/<flow-name>.md`: business, user, or domain flow.
- `docs/flows/api/<api-or-use-case>.md`: API orchestration or endpoint sequence.
- `docs/runbooks/<operation-name>.md`: operational flow, incident response, rollback, or support procedure.

## Diagram Guidance

- Use Mermaid `sequenceDiagram` for actor/system interactions.
- Use Mermaid `stateDiagram-v2` for lifecycle or status transitions.
- Use Mermaid `flowchart LR` for branching business processes.

## Confirmation Requirement

Before writing, return the proposed `docs/` path, purpose, summary, and sources. Wait for explicit approval.

## Output

- Flow purpose.
- Actors and systems.
- Preconditions.
- Main flow.
- Alternative/error flows.
- Recommended `docs/` path.
- State or sequence diagram when useful.
- Monitoring and troubleshooting notes.
