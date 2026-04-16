# React Context Loading Selector

Load this file before choosing React-specific resources or subagent prompts. Select only the rows that match the user's request and the discovered codebase.

## Resource Selection

| Trigger | Load |
|---|---|
| Figma URL, screenshot, visual reference, design node | `resources/figma-ui-implementation.md` |
| Visible UI, layout, app surface, page design, hierarchy, motion | `resources/frontend-composition-guidelines.md` |
| `curl`, OpenAPI, response sample, API contract, backend integration | `resources/api-integration-from-curl.md` |
| Ticket update, Notion/Slack handoff, completion payload | `resources/completion-handoff.md` |

## Subagent Selection

| Trigger | Subagent Prompt |
|---|---|
| Figma, screenshots, or visual requirements | `subagents/react-figma-generate.md` |
| Composition, hierarchy, copy, imagery, or motion | `subagents/react-composition-design.md` |
| API contracts, curl examples, request helpers | `subagents/react-api-generate.md` |
| Forms, validation, loading, empty, error, success states | `subagents/react-form-generate.md` |
| Keyboard, semantic markup, responsive behavior, text fit | `subagents/react-accessibility-review.md` |
| Rendering, bundle, dependency, build risk | `subagents/react-performance-review.md` |
| Notion, Slack, ticket, or automation handoff | `subagents/react-handoff-write.md` |

## Default

When no specific trigger matches, inspect only the target route/component and existing project conventions. Do not load visual, API, accessibility, performance, or handoff prompts until the task requires them.
