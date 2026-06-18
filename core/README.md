# Core

`core/` is the shared contract layer for the AI Engineering Platform. Files here
define the platform-wide rules, registries, schemas, and templates that
plugins, adapters, MCP servers, and the CLI rely on.

Use this directory when a rule or contract is provider-neutral and reusable by
more than one AI IDE plugin. Keep plugin-specific behavior in
`plugins/<plugin>/`.

## Folder Map

| Folder | What It Owns | Edit When |
| --- | --- | --- |
| `agents/` | The managed AGENTS baseline, target-project AGENTS template, and merge policy used by `ai-engineering init`. | The generated project instructions or merge boundaries change. Preserve user-owned AGENTS content outside the managed block. |
| `checklists/` | Shared checklists that can be referenced by commands, skills, or migration work. | A checklist is genuinely reusable across plugins. Plugin-local checklists belong in the owning plugin. |
| `mcp/` | Shared local MCP stdio runtime used by optional MCP integrations. | MCP protocol handling, contract loading, or shared transport behavior changes. |
| `prompts/` | Provider-neutral prompt fragments and reusable prompt building blocks. | Prompt wording applies across providers or plugins. Provider-specific prompt output belongs under `adapters/`. |
| `routing/` | Intent, command, and skill registries that connect user intent to plugin commands and optional MCP tool contracts. | Adding, renaming, or removing command ids, skill ids, or intent routes. Keep routes aligned with `plugin.yaml` and `mcp-servers/*/mcp.json`. |
| `schemas/` | JSON schemas for platform contracts such as plugin metadata and install state. | A serialized contract changes. Update validators and fixtures in the same change. |
| `standards/` | Authoring standards for agents, skills, and output formats. | Repository-wide writing or behavior standards change. Do not put plugin-specific process notes here. |
| `templates/` | Reusable templates for generated or scaffolded assets. | Multiple plugins or generators need the same starting structure. |
| `workflows/` | Shared workflow definitions and cross-plugin orchestration notes. | A workflow spans more than one plugin or is part of the platform baseline. |

## Important Contracts

- `core/agents/AGENTS.template.md` is the first file copied for new target
  projects.
- `core/agents/AGENTS.baseline.md` is the managed block that can be refreshed
  inside an existing target `AGENTS.md`.
- `core/routing/command-registry.yaml` must reference command files that exist
  under `plugins/<plugin>/commands/`.
- MCP tool names referenced by routing and plugin metadata must exist in
  `mcp-servers/<plugin>/mcp.json` when MCP is used.

## Change Checklist

- Read the owning plugin, runtime code, and relevant tests before changing
  shared contracts.
- Keep dependency direction inward: plugins, adapters, and CLI may depend on
  `core/`; `core/` should not depend on plugin implementation details.
- Update English `README.md` first, then synchronize `README_VI.md`.
- Run `npm run validate` after routing, schema, standard, template, or AGENTS
  baseline changes.
