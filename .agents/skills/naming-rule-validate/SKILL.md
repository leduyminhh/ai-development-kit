---
name: naming-rule-validate
description: Use when creating or renaming Codex project artifacts such as agents, skills, subagents, workflows, hooks, scripts, or validators in this repository.
---

# Project Naming Rules

## Core Rule

Name new capabilities so a reader can infer scope and action from the filename alone. Prefer deterministic names that are easy to validate with regex and whitelist dictionaries.

Use this skill before creating or renaming:

- `.codex/agents/*.toml`
- `.agents/skills/<name>/SKILL.md`
- `.agents/skills/<skill>/subagents/*.md`
- `.agents/skills/<skill>/scripts/*.(ps1|py)`
- `.codex/hooks/*.ps1`
- `scripts/*.(ps1|py)`

Placement rule:

- Root `scripts/` is only for shared project-wide scripts.
- Skill-specific `scripts/tests/resources` belong under `.agents/skills/<skill>/`.

The validator checks both filename/folder naming and declared metadata consistency:

- agent `name = "..."` in `.toml` must match the filename
- skill `name: ...` in `SKILL.md` frontmatter must match the skill folder name

## Dictionary

Approved actions:

| Action | Meaning |
|---|---|
| `analyze` | read and analyze |
| `review` | evaluate |
| `generate` | create new output |
| `write` | write content |
| `validate` | check correctness |
| `fix` | repair defects |
| `optimize` | improve performance or quality |
| `design` | design structure or flow |

Approved domains:

| Domain | Meaning |
|---|---|
| `agent` | agent configuration or execution |
| `architecture` | architecture design |
| `auth` | authentication or authorization scope |
| `code` | generic code |
| `codex` | Codex repository structure |
| `config` | configuration |
| `contract` | contracts and interfaces |
| `dependency` | dependency graph or supply-chain scope |
| `diagram` | diagrams and PlantUML outputs |
| `doc` | documentation |
| `git` | git/version control |
| `hook` | hook execution |
| `java` | Java backend |
| `naming` | naming convention |
| `onion` | Onion Architecture |
| `pattern` | design pattern |
| `protected` | protected path policy |
| `react` | React frontend |
| `secrets` | secrets, credentials, or crypto material |
| `security` | Security review and secure coding |
| `service` | service runtime or service wrapper |
| `skill` | skill structure |
| `sql` | SQL or persistence query |
| `test` | testing |
| `workflow` | process or execution flow |

Optional qualifiers:

Any approved domain may also be used as a qualifier when it narrows another domain, for example `react-code-generate`.
Additional qualifier tokens:

`accessibility`, `activity`, `api`, `application`, `architecture`, `archimate`, `automation`, `audit`,
`behavior`, `boundary`, `branch`, `class`, `commit`, `component`, `composition`,
`concurrency`, `container`, `coverage`, `creation`, `database`, `deployment`, `domain`,
`drift`, `e2e`, `edge`, `er`, `feature`, `figma`, `fixture`, `flaky`, `flow`, `form`, `gantt`,
`grammar`, `handoff`, `ie`, `infrastructure`, `json`, `maintenance`, `merge`, `mindmap`, `module`,
`network`, `object`, `output`, `path`, `performance`, `qa`, `regression`, `release`, `risk`, `rule`, `safety`, `salt`, `shared`,
`sequence`, `spring`, `state`, `strategy`, `structure`, `timing`, `transaction`, `unit`,
`usecase`, `verification`, `wbs`, `wireframe`, `yaml`

## Naming Pattern

For agents, skills, and subagents, use:

```text
<domain>-<action>
<domain>-<qualifier>-<action>
```

When a scope needs more detail, use multiple qualifiers while keeping the same order:

```text
<domain>-<qualifier>-<qualifier>-<action>
```

Examples:

- `java-review`
- `doc-write`
- `java-api-contract-review`
- `java-spring-boundary-review`
- `diagram-wireframe-generate`
- `sql-optimize`
- `test-automation-validate`
- `test-qa-review`
- `architecture-onion-design`
- `code-shared-design`
- `java-analyze`
- `code-design-pattern`

Approved capability noun exceptions:

- `code-design-pattern`

Current approved agents:

- `code-design-pattern`
- `codex-structure-validate`
- `diagram-generate`
- `doc-write`
- `git-workflow-design`
- `java-analyze`
- `react-code-generate`
- `security-code-review`
- `skill-maintenance-review`
- `test-automation-validate`
- `test-qa-review`

Current skill-only capabilities:

- `architecture-onion-design`
- `code-shared-design`
- `naming-rule-validate`

Scripts and hooks may use command-style verbs when they are operational wrappers, for example:

- `.agents/skills/skill-maintenance-review/scripts/add-skill-feedback.ps1`
- `.agents/skills/skill-maintenance-review/scripts/add-skill-feedback.py`
- `.agents/skills/skill-maintenance-review/scripts/apply-skill-upgrade-proposal.py`
- `.codex/hooks/log-agent-event.ps1`
- `scripts/hook-service.ps1`
- `run-coverage-report.ps1`
- `validate-workflow.ps1`
- `test-naming-rule-validate.ps1`

## Prohibitions

Use only kebab-case:

```text
^[a-z0-9]+(-[a-z0-9]+)*$
```

Do not use ambiguous role suffixes:

- `-er`
- `-or`
- `-specialist`
- `-expert`
- `-assistant`

Do not combine multiple actions:

- Wrong: `java-review-and-fix`
- Right: `java-review`, `java-fix`

Do not use knowledge nouns as a capability name:

- Wrong: `code-design-pattern`, `clean-code`
- Right: `pattern-analyze`, `code-review`

Exception: `code-design-pattern` is approved as the parent capability for code-design-pattern advisory workflow.

## Validation

Run targeted naming validation for changed artifacts:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/naming-rule-validate/scripts/validate-naming-rule.ps1 -Root . -Paths @('.codex/agents/java-review.toml')
```

When running through `powershell -File` from selected-test commands, pass multiple paths with `-PathList`:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/naming-rule-validate/scripts/validate-naming-rule.ps1 -Root . -PathList ".codex/agents/java-review.toml|scripts/run-workflow-validate.ps1"
```

Run the naming test suite when changing the validator or selected-test routing:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/naming-rule-validate/scripts/test-naming-rule-validate.ps1
```

Selected tests automatically run naming validation for changes under `.codex/agents`, `skills`, `.codex/hooks`, and `scripts`.

Current validator behavior:

- validates kebab-case and approved domain/action/qualifier ordering
- rejects forbidden role suffixes and combined actions
- rejects deprecated capability names kept only for regression tests
- checks declared agent/skill name metadata matches the file or folder name

