# Providers

`providers/` owns provider-facing configuration contracts for AI IDEs and MCP
runtime registration.

The current provider target set is `codex`, `claude`, `cursor`, and
`antigravity`. Provider-native file projection lives under `adapters/`; this
directory stays focused on shared MCP registry, policy, schema, and examples.

This repository does not ship active MCP tools by default. MCP entries here are
registry, policy, schema, and example files so future integrations have a stable
structure without coupling plugins to executable MCP server source.

## Layout

```text
providers/
  mcp/
    registry.json       inactive MCP registry
    policies.json       runtime and ownership policy
    config.schema.json  provider-neutral config schema
    examples/           non-active example registrations
```

## Rules

- Keep `registry.json.activeTools` empty until a real external MCP runtime is
  intentionally supported.
- Store examples under `providers/mcp/examples/`; examples are documentation and
  must not be installed as active tools.
- Do not add MCP server implementation source under this directory.
- Provider adapters may read this directory for policy and schema guidance, but
  plugins remain capability manifests, not runtime server projects.
