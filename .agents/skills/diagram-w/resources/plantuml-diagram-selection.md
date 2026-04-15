# PlantUML Diagram Selection

## Selection Rule

Choose the diagram that answers the user's question with the least notation.

Ask for missing scope only when a wrong diagram type would mislead the audience. Otherwise, make a labeled assumption and proceed.

## Primary Mapping

- Sequence: ordered messages between actors, services, APIs, queues, or jobs.
- Use Case: user goals, system actors, high-level functional scope.
- Class: domain model, object-oriented structure, interfaces, inheritance, dependencies.
- Object: concrete runtime instances and links for a specific example.
- Activity: business process, decision flow, pipeline, or algorithm.
- Component: service/module/package boundaries and dependencies.
- Deployment: nodes, containers, infrastructure placement, runtime topology.
- State: lifecycle, status transitions, finite-state behavior.
- Timing: signals, clocks, state changes over time.
- Gantt: project schedule, dependencies, milestones.
- MindMap: idea tree, concept exploration, taxonomy.
- WBS: work breakdown, delivery decomposition, planning hierarchy.
- JSON/YAML: structured data payload, config, manifest, or sample document.
- Network: network devices, groups, addresses, and connections.
- Wireframe/Salt: low-fidelity UI screen or form layout.
- Archimate: enterprise architecture capability, application, business, and technology layers.
- ER/IE: database entities, relationships, cardinality.
- Grammar: EBNF grammar, regex explanation, parser-oriented notation.

## Multi-Diagram Guidance

Use two diagrams only when the same answer needs two views:

- Sequence plus Component for service interaction and service ownership.
- Activity plus State for workflow steps and lifecycle rules.
- ER plus Class for persistence model and application model.
- Deployment plus Network for runtime placement and network detail.

Avoid more than two diagrams unless the user explicitly asks for a diagram pack.

## Subagent Priority

Pick the subagent whose trigger matches the user's main noun:

- "flow", "call", "API", "request", "event": sequence first.
- "process", "approval", "pipeline": activity first.
- "service", "module", "architecture": component first.
- "server", "cluster", "container": deployment first.
- "database", "entity", "table": ER/IE first.
- "state", "status", "lifecycle": state first.
- "timeline", "deadline", "roadmap": gantt first.
- "UI", "screen", "form": wireframe/Salt first.
