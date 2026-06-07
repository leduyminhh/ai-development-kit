# Skills Runtime Assets

The `skills/` directory contains runtime skill assets for this repository. Each skill is a discoverable unit that Codex, Claude Code, Cursor, or another agent can load when the user request matches the skill trigger.

## Structure

```text
skills/
    manifest.toml
    README.md
    SKILL_TEMPLATE.md
    <skill-name>/
        SKILL.md
        agents/
            openai.yaml
        resources/
        scripts/
        subagents/
```

## Components

| Component | Required | Purpose |
|---|---:|---|
| `SKILL.md` | Yes | Frontmatter `name`, `description`, and the core workflow contract. |
| `agents/openai.yaml` | Recommended | UI metadata when the skill has quick prompts or integration metadata. |
| `resources/` | Skill-dependent | Detailed references loaded only when the task needs them. |
| `scripts/` | Skill-dependent | Deterministic helpers owned by one skill. |
| `subagents/` | Required for new runtime skills | Focused prompts that the skill may select when useful. |

## Manifest Contract

`skills/manifest.toml` is the contract between:

- repository structure: `skills/<name>/...`
- runtime registration: `.codex/agents/<name>.toml`
- runtime governance metadata: `.codex/agent-metadata/<name>.toml`
- external discovery: linking or copying `skills/` into an agent skill loading path

The manifest does not replace `.codex/config.toml`. It documents which skills have agent entry points, which skills are companion skills, and where UI metadata lives.

## Workflow Bootstrap

`using-workflow-kit` is the bootstrap skill for workflow-aware sessions. It checks whether `.codex/workflows/registry.toml` has a matching workflow entry and falls back to normal skill routing when the registry is empty.

This repository intentionally ships the registry before concrete workflows. Future workflow entries should point to `workflows/<name>/WORKFLOW.md` and reference existing skills by name.

## Current Skill Catalog

| Skill | Purpose |
|---|---|
| `agent-operating-rules` | Applies repository-wide execution discipline: read first, keep changes surgical, test intent, and fail loud. |
| `architecture-onion-design` | Designs and reviews Onion Architecture, package layout, and boundary risk. |
| `code-design-pattern` | Selects suitable design patterns, avoids overuse, and requires approval before applying a pattern. |
| `code-shared-design` | Designs shared internal APIs, contracts, SDKs, and shared logic modules. |
| `codex-structure-validate` | Validates Codex repository structure, skills, agents, config, hooks, and test mapping. |
| `diagram-generate` | Generates PlantUML diagrams through the appropriate selector or focused subagent. |
| `doc-write` | Writes technical documentation, README sections, architecture notes, feature docs, flow docs, and database docs. |
| `git-workflow-design` | Handles branch, commit, merge, revert, release, hotfix, staging, push, and PR workflows. |
| `java-analyze` | Reviews Java/Spring architecture, persistence, async behavior, API contracts, and test strategy. |
| `naming-rule-validate` | Validates naming conventions for agents, skills, subagents, workflows, hooks, scripts, and validators. |
| `using-workflow-kit` | Bootstraps workflow registry checks and fallback skill selection before task execution. |
| `react-code-generate` | Creates or updates React UI, API integration, accessibility checks, performance review, and handoff notes. |
| `security-code-review` | Reviews security risks across OWASP/ASVS/CWE, auth, secrets, dependencies, logging, and verification. |
| `test-automation-validate` | Plans, creates, runs, and stabilizes automated tests across stacks. |
| `test-qa-review` | Performs QA review, regression analysis, verification planning, and automation handoff. |
| `youtube-transcript` | Downloads, fetches, transcribes, or cleans YouTube transcripts, captions, and subtitles. |

## Progressive Disclosure

Use these context rules:

- `SKILL.md` keeps only triggers, operating mode, and a short resource map.
- Long procedures and variant-specific details belong in `resources/`.
- Load only the selected subagent prompt, not the entire `subagents/` directory.
- Skills with many variants should provide a selector resource.

Examples:

- `react-code-generate/resources/frontend-composition-guidelines.md`
- `diagram-generate/resources/plantuml-diagram-selection.md`
- `test-automation-validate/resources/framework-detection.md`

## Skill Catalog Update Event

When a new skill appears under `skills/`, update the catalog and runtime metadata:

1. Add the skill to the `Current Skill Catalog` table in this file.
2. Update the `Skill Catalog` section in `README.md`.
3. Update `README_VI.md` when `README.md` changes.
4. Update `skills/manifest.toml`.
5. Create at least one `subagents/*.md` prompt for runtime workflow skills.
6. Create `.codex/agents/<skill-name>.toml` and `.codex/agent-metadata/<skill-name>.toml` when the skill needs an agent entry point.
7. Run the validator with `-Fix` to sync `.codex/config.toml` agent registry entries.
8. Map new PowerShell test files in `.codex/test-map.toml`.
9. Report which skill and catalog files changed in the final response.

## New Skill Rules

When creating a new skill under `skills/<skill-name>/`:

1. Create `SKILL.md` with YAML frontmatter containing `name` and `description`.
2. Follow `skills/SKILL_TEMPLATE.md` exactly for top-level H2 order.
3. Create `subagents/` and at least one prompt `.md` when the skill has runtime workflow behavior.
4. Create or update `.codex/agents/<skill-name>.toml` when the skill needs an agent entry point.
5. Create or update `.codex/agent-metadata/<skill-name>.toml` for governance metadata.
6. Update `skills/manifest.toml` with `skill_path`, `ui_metadata`, and `agent_entry`.
7. Run the structure validator with `-Fix`.
8. Map any new `*test*.ps1` script in `.codex/test-map.toml`.
9. Run the validator and selected tests.

## Validation

Run the structure validator:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

Run naming validation:

```powershell
powershell -ExecutionPolicy Bypass -File skills/naming-rule-validate/scripts/validate-naming-rule.ps1 -Root .
```

The structure validator also checks:

- `skills/README.md` catalog consistency against `skills/*/SKILL.md`
- `README.md` install command contract for `npx skills`
- `README.md` and `README_VI.md` same-diff sync when root README changes
- project-level markdown quality outside skill `resources/` or `subagents/`
