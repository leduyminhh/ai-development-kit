# Codex Adapter

This directory contains Codex agent definitions used by plugin install and
artifact build flows.

Generated projects receive:

```text
AGENTS.md
.agents/skills/
.codex/agents/*.toml
.codex/agents/openai.yaml
.codex/workflows/commands.md
.codex/workflows/commands/*.md
.codex/config.toml
```

Global installs use the corresponding user paths, including
`~/.codex/AGENTS.md`, `~/.agents/skills/`, and `~/.codex/`.

Canonical skills remain owned by `plugins/*/skills/`; MCP provider policy and
hook support remain owned by `providers/` and `cli/scripts/hooks/`.

`commands.md` is the Codex command catalog. Each generated
`.codex/workflows/commands/<slug>.md` file contains the full orchestration
contract for one installed command, including intent, inputs, required skills,
steps, and output contract.
