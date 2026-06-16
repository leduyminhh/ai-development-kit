# Codex Adapter

This directory contains Codex agent definitions used by plugin install and
artifact build flows.

Generated projects receive:

```text
AGENTS.md
.codex/agents/openai.yaml
.codex/workflows/commands.md
.codex/config.toml
```

Canonical skills remain owned by `plugins/*/skills/`; MCP runtime and hook
support remain owned by `mcp-servers/`, `core/mcp/`, and `cli/scripts/hooks/`.
