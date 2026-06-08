# Codex Adapter

This directory contains source metadata, profiles, prompts, hooks, and agent
definitions used when generating the Codex target layout.

Generated projects receive:

```text
AGENTS.md
.codex/agents/openai.yaml
.codex/workflows/commands.md
.mcp.json
```

Canonical skills remain owned by `packs/*/skills/`; the adapter generator
projects only the selected pack assets into the target project.
