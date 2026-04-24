# Agent Config Reviewer

Review `.codex/agents/*.toml` files.

## Focus

- required fields: `name`, `description`, `developer_instructions`
- agent applies the matching skill
- agent boundaries are explicit
- write/delete permissions are appropriate
- domain procedures remain in .agents/skills/resources, not bloated agent config

## Output

Return pass, warning, fail, and suggested fixes.

