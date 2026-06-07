# MCP Servers

`mcp-servers/` contains one namespaced MCP server skeleton per capability pack.
The CLI install flow copies selected server skeletons into the target project
under `.ai-engineering/mcp-servers/` and writes `.mcp.json` entries that point to
those target-local entrypoints.

These servers are the runtime-facing side of pack commands. Pack metadata says
which MCP tool a command expects; the matching server contract declares that tool.

## Server Anatomy

Each `<pack>-mcp/` directory follows this shape:

- `mcp.json`: stable server contract; includes server name, version, and tool ids.
- `package.json`: package metadata and `start` script.
- `src/index.js`: executable entrypoint used by `.mcp.json`.
- `src/server.js`: server factory and currently declared tool list.
- `src/tools/`: tool handler location or placeholder.
- `src/resources/`: MCP resource handler location or placeholder.
- `src/prompts/`: MCP prompt handler location or placeholder.

## Server Map

| Server | Owning Pack | Declared Tools |
| --- | --- | --- |
| `architecture-mcp` | `architecture` | `architecture.generate_system_design`, `architecture.review_architecture`, `architecture.generate_adr` |
| `application-mcp` | `application` | `application.review_source_code`, `application.generate_service`, `application.review_api` |
| `data-mcp` | `data` | `data.analyze_schema`, `data.review_index`, `data.migration_plan` |
| `knowledge-mcp` | `knowledge` | `knowledge.generate_readme`, `knowledge.generate_runbook`, `knowledge.review_docs` |
| `platform-mcp` | `platform` | `platform.review_docker`, `platform.review_kubernetes`, `platform.deployment_plan` |
| `quality-mcp` | `quality` | `quality.generate_test_plan`, `quality.review_coverage`, `quality.performance_review` |
| `security-mcp` | `security` | `security.scan_source`, `security.scan_dependencies`, `security.generate_threat_model` |

## Install Flow Relationship

When a user runs `ai-engineering install <pack...> --target <provider>`:

1. The dependency graph resolves requested packs.
2. The lifecycle builder collects pack commands, skills, adapters, and MCP server
   skeletons.
3. Server files are copied into the target project under
   `.ai-engineering/mcp-servers/<pack>-mcp/`.
4. The target `.mcp.json` points to
   `.ai-engineering/mcp-servers/<pack>-mcp/src/index.js`.
5. Ownership metadata records the copied server files so uninstall/update can
   remove or replace managed files safely.

## Change Checklist

- Add or rename MCP tools in `mcp.json`, `src/server.js`, pack command metadata,
  and routing registries together.
- Keep server directory names scoped as `<pack>-mcp`.
- Do not reintroduce legacy provider plugin folders as active runtime paths.
- Update English `README.md` first, then synchronize `README_VI.md`.
- Run `npm run validate` and a target-project smoke test after MCP contract
  changes.
