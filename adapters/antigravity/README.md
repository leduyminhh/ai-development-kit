# Antigravity Adapter

`adapters/antigravity/` projects canonical AI Engineering plugins into the
Antigravity target layout described by the multi-IDE plugin marketplace spec.

Project-scope output includes:

- `AGENTS.md` for managed baseline instructions.
- `antigravity-plugin.json` for provider projection metadata.
- `skills/<skill>/SKILL.md` copied from canonical plugin skills.
- `commands/<command>.md` rendered from canonical command contracts.
- `rules/provider.json` with deterministic provider metadata.
- `mcp/mcp.json` for JSON MCP registrations.

The Antigravity marketplace schema is version-sensitive. Treat
`antigravity-plugin.json` as local package metadata until an official schema is
validated.
