# Packs

`packs/` contains the installable capability packs that make up the AI
Engineering Platform. A pack is the unit users install with commands such as
`ai-engineering install platform security --target cursor`.

Each pack owns its commands, skills, templates, workflows, schemas, and
`pack.yaml` metadata. Shared policy belongs in `core/`; target-local MCP
entrypoints are copied from `mcp-servers/`.

## Pack Anatomy

Most pack directories follow this shape:

- `pack.yaml`: canonical metadata, dependencies, assets, commands, skills, and
  provider compatibility.
- `commands/`: user-facing command contracts that map intent to required skills
  and MCP tools.
- `skills/`: executable agent instructions and supporting resources.
- `templates/`: pack-owned templates.
- `workflows/`: pack-owned workflow notes.
- `schemas/`: pack-owned schemas or schema placeholders.
- `test/` or `package.json`: only present when the pack owns runtime or tests.

## Pack Map

| Pack | Capability | Required Packs | Optional Packs | Installed Assets |
| --- | --- | --- | --- | --- |
| `architecture` | System design, architecture review, ADR, DDD, integration design, shared design, patterns, and diagrams. | None | None | Skills: `java-analyze`, `architecture-onion-design`, `code-shared-design`, `code-design-pattern`, `diagram-generate`; command: `review-architecture`; hook: `project-audit`. |
| `application` | Backend, frontend, API, Spring, React, Kafka, Redis, Java analysis, and implementation documentation workflows. | `architecture` | `quality`, `security` | Skills: `java-analyze`, `doc-write`, `code-shared-design`, `react-code-generate`, `test-automation-validate`; commands: `review-backend`, `implement-frontend`; hook: `project-audit`. |
| `data` | Schema review, indexing, migration, backup, restore, and CDC planning. | None | `application` | Skill: `data-migration`; command: `migration-plan`. |
| `knowledge` | Technical documentation, README work, runbooks, API docs, onboarding, changelogs, diagrams, and transcript workflows. | None | `architecture` | Skills: `doc-write`, `diagram-generate`, `youtube-transcript`; command: `write-technical-doc`. |
| `platform` | Delivery, deployment, observability, incident response, workflow operations, and git workflow. | None | `quality`, `security` | Skills: `git-workflow-design`, `using-workflow-kit`; command: `deployment-plan`; hook: `project-audit`. |
| `quality` | QA review, test automation, naming checks, coverage, performance, and quality verification. | None | None | Skills: `test-qa-review`, `test-automation-validate`, `naming-rule-validate`; command: `verify-quality`; hook: `project-audit`. |
| `security` | OWASP/CWE review, secrets, threat modeling, dependency review, and container security. | None | `quality` | Skill: `security-code-review`; command: `review-security`; hook: `project-audit`. |

## Skill Ownership Rules

- Each runtime skill has exactly one canonical owner: the pack containing
  `skills/<skill>/SKILL.md`.
- `core/routing/skill-registry.yaml` maps canonical skill owners and must match
  skill folders and `pack.yaml.skills`.
- `pack.yaml.assets.skills` may include shared skills from another pack when a
  pack command needs to install them, but it does not make that pack the
  canonical owner.
- Put implementation, stack, and source-code skills in `application`; put system
  boundary and design-method skills in `architecture`; put repository-wide
  policy and managed agent baselines in `core/agents`, not in a runtime pack
  skill.

## Dependency Rules

- Required dependencies are installed before the requested pack. For example,
  installing `application` also installs `architecture`.
- Optional dependencies are not installed automatically unless explicitly
  requested.
- Shared assets can be owned by multiple packs; ownership is tracked in the
  target project under `.ai-engineering/ownership.json`.

## Change Checklist

- Update `pack.yaml` whenever commands, skills, dependencies, adapters, hooks, or
  installable assets change.
- Keep command ids and MCP tool ids namespaced by capability.
- Keep pack command metadata aligned with `core/routing/command-registry.yaml`
  and `mcp-servers/<pack>-mcp/mcp.json`.
- Update English `README.md` first, then synchronize `README_VI.md`.
- Run `npm run validate` after pack metadata, command, skill, dependency, or MCP
  mapping changes.
