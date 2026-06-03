# AGENTS.md Project Start Template

Use this template when starting work in a new project or applying agent operating rules to another repository.

## Project Start Procedure

1. Check the project root for `AGENTS.md` and `CLAUDE.md`.
2. If either file exists, read the existing file before writing.
3. If an instruction file exists, merge only the missing template sections and preserve project-specific rules.
4. If no instruction file exists, create `AGENTS.md` from the template below.
5. Do not overwrite existing instructions silently.
6. If the target project protects instruction files, request confirmation before writing.

## Merge Rules

- Preserve existing project purpose, commands, language rules, safety rules, and workflow conventions.
- Add only sections that are missing or clearly weaker than the template.
- Do not duplicate equivalent sections under different names.
- If both `AGENTS.md` and `CLAUDE.md` exist, update only the file requested by the user or explain the precedence before editing.
- Keep the final instruction file concise enough for agents to read before work.

## Template

~~~~md
# AGENTS.md

## Purpose

Describe the repository purpose, primary stack, and the kind of work agents are expected to perform here.

---

## Skill Discovery

Before starting any task:

1. Inspect available skills.
2. Identify relevant skills.
3. Load only the required skills.
4. Follow selected skills before using general knowledge.

Do not load all skills by default.

Default skill locations:

```text
.agents/skills/
.claude/skills/
```

---

## Instruction Priority

Apply project-local instructions in the following order:

1. User instruction
2. AGENTS.md
3. Matching skill(s)
4. Project conventions
5. General knowledge

Higher priority overrides lower priority.

---

## Multi-Skill Order

If multiple skills are required:

1. Architecture
2. Implementation
3. Security
4. Testing
5. Deployment
6. Documentation

---

## General Rules

Apply the `agent-operating-rules` skill for all agent work in this repository:

- `agent-operating-rules`

---

## Completion Criteria

A task is complete when:

- Requirements are satisfied.
- Relevant skills were applied.
- Risks and assumptions are identified.
- Recommended next actions are provided.
~~~~
