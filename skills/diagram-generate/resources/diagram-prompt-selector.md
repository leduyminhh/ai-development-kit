# Diagram Prompt Selector

Use this selector after identifying the diagram purpose and audience. Load only the matching subagent prompt.

| User Intent | Diagram Type | Subagent Prompt |
|---|---|---|
| Interaction, API call order, message flow | sequence | `subagents/diagram-sequence-generate.md` |
| User/system goals | usecase | `subagents/diagram-usecase-generate.md` |
| Type/model structure | class | `subagents/diagram-class-generate.md` |
| Runtime object example | object | `subagents/diagram-object-generate.md` |
| Workflow or business process | activity | `subagents/diagram-activity-generate.md` |
| Service or module boundaries | component | `subagents/diagram-component-generate.md` |
| Infrastructure topology | deployment | `subagents/diagram-deployment-generate.md` |
| Lifecycle or state change | state | `subagents/diagram-state-generate.md` |
| Time-based signal behavior | timing | `subagents/diagram-timing-generate.md` |
| Project schedule | gantt | `subagents/diagram-gantt-generate.md` |
| Idea hierarchy | mindmap | `subagents/diagram-mindmap-generate.md` |
| Work breakdown | wbs | `subagents/diagram-wbs-generate.md` |
| Structured data shape | json-yaml | `subagents/diagram-json-yaml-generate.md` |
| Network topology | network | `subagents/diagram-network-generate.md` |
| UI information architecture | wireframe | `subagents/diagram-wireframe-generate.md` |
| Enterprise architecture | archimate | `subagents/diagram-archimate-generate.md` |
| Entity relationship or IE notation | er-ie | `subagents/diagram-er-ie-generate.md` |
| Grammar or regular expressions | grammar | `subagents/diagram-grammar-generate.md` |

When several types might fit, choose the smallest one that explains the user's main noun. Avoid generating multiple diagrams unless the user asks or one diagram would mix unrelated concerns.
