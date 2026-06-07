---
name: naming-rule-validate
description: Use when creating or renaming Codex project artifacts such as agents, skills, subagents, workflows, hooks, scripts, or validators in this repository.
---

# Project Naming Rules

## Overview

This skill keeps Codex project artifact names predictable so agents, skills, subagents, tests, scripts, and metadata can be discovered and validated consistently.

## When to Use

Use this skill before creating or renaming skills, agents, subagents, workflows, hooks, scripts, validators, test files, or metadata entries in this repository.

## Core Process

1. Identify the artifact type and expected owner.
2. Apply the dictionary, naming pattern, and prohibitions before creating files.
3. Ensure metadata `name` fields match directory or file identity where required.
4. Run `validate-naming-rule.ps1` for deterministic checks.
5. Report exact rename or metadata fixes when validation fails.

## Examples

- A runtime skill folder uses lowercase hyphen names such as `security-code-review`.
- A skill-owned script lives under `skills/<skill>/scripts/`.
- A shared project script lives under root `scripts/` and is named for its action.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "The name is understandable enough." | Discoverability requires predictable naming, not just human intuition. |
| "Metadata can differ from folder name." | Name drift breaks validation and skill discovery. |
| "This helper can live anywhere." | Ownership determines whether the file belongs under a skill or root scripts. |

## Red Flags

- Names contain underscores, spaces, mixed case, or ambiguous prefixes.
- Metadata `name` does not match the folder or agent identity.
- A skill-owned artifact is placed in root scripts without shared ownership.
- A new test file is not mapped.

## Verification

- Names match the allowed pattern for the artifact type.
- Metadata and folder/file identity agree.
- Ownership is classified as `skill-owned` or `shared-project`.
- Naming validator exits successfully.

## Resource Map

- None; this skill does not require additional resource files.

## Subagent Prompts

- None; this skill does not require dedicated subagent prompts.

## Scripts

- None; this skill does not require dedicated scripts.

## Output Format

Report concise findings, actions, verification, and remaining risk.

## Notes

### Core Rule

Name new capabilities so a reader can infer scope and action from the filename alone. Prefer deterministic names that are easy to validate with regex and whitelist dictionaries.

Use this skill before creating or renaming:

- [.codex/agents/*.toml](../../../.codex/agents/*.toml)
- `skills/<name>/SKILL.md`
- `skills/<skill>/subagents/*.md`
- `skills/<skill>/scripts/*.(ps1|py)`
- [.codex/hooks/*.ps1](../../../.codex/hooks/*.ps1)
- `scripts/*.(ps1|py)`

Placement rule:

- Root `scripts/` is only for shared project-wide scripts.
- Skill-specific `scripts/tests/resources` belong under `skills/<skill>/`.

The validator checks both filename/folder naming and declared metadata consistency:

- agent `name = "..."` in `.toml` must match the filename
- skill `name: ...` in `SKILL.md` frontmatter must match the skill folder name

### Dictionary

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
`drift`, `e2e`, `edge`, `er`, `evolution`, `feature`, `figma`, `fixture`, `flaky`, `flow`, `form`, `gantt`,
`grammar`, `handoff`, `ie`, `infrastructure`, `json`, `maintenance`, `merge`, `mindmap`, `module`,
`network`, `object`, `output`, `path`, `performance`, `qa`, `regression`, `release`, `risk`, `rule`, `safety`, `salt`, `shared`,
`sequence`, `spring`, `state`, `strategy`, `structure`, `timing`, `transaction`, `unit`,
`usecase`, `verification`, `wbs`, `wireframe`, `yaml`

### Naming Pattern

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

- `agent-operating-rules`
- `code-design-pattern`
- `using-workflow-kit`
- `youtube-transcript`

Current approved agents:

- `code-design-pattern`
- `codex-structure-validate`
- `diagram-generate`
- `doc-write`
- `git-workflow-design`
- `java-analyze`
- `react-code-generate`
- `security-code-review`
- `test-qa-review`
- `test-automation-validate`
- `test-qa-review`

Current skill-only capabilities:

- `agent-operating-rules`
- `architecture-onion-design`
- `code-shared-design`
- `naming-rule-validate`
- `using-workflow-kit`
- `youtube-transcript`

Scripts and hooks may use command-style verbs when they are operational wrappers, for example:

- `skills/diagram-generate/scripts/validate-diagram-layout.ps1`
- `skills/diagram-generate/scripts/run-diagram-export.py`
- [skills/test-automation-validate/scripts/test-automation-validate-strategy.ps1](../../../skills/test-automation-validate/scripts/test-automation-validate-strategy.ps1)
- [.codex/hooks/log-agent-event.ps1](../../../.codex/hooks/log-agent-event.ps1)
- [scripts/hook-service.ps1](../../../scripts/hook-service.ps1)
- [scripts/query-hook-audit.ps1](../../../scripts/query-hook-audit.ps1)
- [scripts/view-hook-trace.ps1](../../../scripts/view-hook-trace.ps1)
- `run-coverage-report.ps1`
- `validate-workflow.ps1`
- `test-naming-rule-validate.ps1`

### Prohibitions

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

### Validation

Run targeted naming validation for changed artifacts:

```powershell
powershell -ExecutionPolicy Bypass -File skills/naming-rule-validate/scripts/validate-naming-rule.ps1 -Root . -Paths @('.codex/agents/java-review.toml')
```

When running through `powershell -File` from selected-test commands, pass multiple paths with `-PathList`:

```powershell
powershell -ExecutionPolicy Bypass -File skills/naming-rule-validate/scripts/validate-naming-rule.ps1 -Root . -PathList ".codex/agents/java-review.toml|scripts/run-workflow-validate.ps1"
```

Run the naming test suite when changing the validator or selected-test routing:

```powershell
powershell -ExecutionPolicy Bypass -File skills/naming-rule-validate/scripts/test-naming-rule-validate.ps1
```

Selected tests automatically run naming validation for changes under `.codex/agents`, `skills`, `.codex/hooks`, and `scripts`.

Current validator behavior:

- validates kebab-case and approved domain/action/qualifier ordering
- rejects forbidden role suffixes and combined actions
- rejects deprecated capability names kept only for regression tests
- checks declared agent/skill name metadata matches the file or folder name
