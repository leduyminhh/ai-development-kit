---
name: lowercase-hyphen-name
description: Third-person trigger description that says what the skill does and when to use it.
---

# Skill Name

## Overview

State what the skill does, the outcome it helps produce, and the boundary of responsibility.

## When to Use

List the user requests, project states, or signals that should trigger this skill.

## Core Process

1. Read the minimum relevant context.
2. Apply the skill-specific workflow.
3. Run the relevant deterministic checks.
4. Report the result, evidence, and remaining risk.

## Examples

- Example request or situation where the skill should be used.
- Example output, decision, or artifact the skill should produce.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "This skill can skip the standard structure." | All runtime skills must follow this template so agents can consume them consistently. |
| "A new skill only needs frontmatter." | Frontmatter triggers the skill, but the body defines the workflow contract. |

## Red Flags

- The skill omits required template headings.
- The skill mixes unrelated domain workflows into one entry point.
- The skill requires loading large references before the user request needs them.

## Verification

- YAML frontmatter includes `name` and `description`.
- The first Markdown H1 is the skill name.
- H2 headings match this template in order.
- Skill-owned resources, scripts, and subagents are referenced only when needed.

## Resource Map

- `resources/<file>.md`: when to load this reference.

## Subagent Prompts

- `subagents/<file>.md`: focused prompt and when to use it.

## Scripts

- `scripts/<file>`: deterministic helper and when to run it.

## Output Format

```text
Recommended response or artifact shape.
```

## Notes

- Keep `SKILL.md` concise and move detailed variants into `resources/`.
- Avoid duplicate headings and auxiliary README-style files inside a skill folder.
