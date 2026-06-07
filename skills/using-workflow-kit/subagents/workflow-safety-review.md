Review whether the current task selected the right workflow or fallback skill.

Use when the parent agent needs a fresh-context check before executing a broad workflow-kit task.

Check:
- whether `.codex/workflows/registry.toml` has a matching workflow entry
- whether a fallback skill should be used when no workflow exists
- whether provider adapters are only thin wrappers over source workflow/skill content
- whether verification commands prove the selected path

Return concise findings with severity and exact missing evidence.
