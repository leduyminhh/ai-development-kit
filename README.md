# Codex Workflow Kit

**Production-grade workflow skills for Codex, Claude Code, Cursor, and other AI coding agents.**

Vietnamese version: [README_VI.md](README_VI.md)

This repository packages reusable agent skills, validators, test routing, and project-local agent templates. The goal is to make AI coding agents follow consistent engineering workflows: read before writing, make surgical changes, validate structure, run selected tests, review security, and ship through a predictable git workflow.

---

## Commands

Common commands map to the repository lifecycle.

| What you need | Command | Principle |
|---|---|---|
| List installable skills | `npx skills add . --list` | Inspect before install |
| Show CLI help | `npx skills --help` | Help at top-level command |
| Show short help | `npx skills -h` | Alias-friendly usage |
| Install allowed defaults | `npx skills add . --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent codex -y` | Explicit allowlist |
| Install one skill | `npx skills add . --skill security-code-review --agent codex -y` | Narrow by default |
| Alias add | `npx skills a . --skill security-code-review --agent codex -y` | Short command support |
| Alias list | `npx skills ls --agent codex` | Verify target state |
| Update installed skill | `npx skills update security-code-review` | Refresh intentionally |
| Validate repository | `powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix` | Fail loud |
| Run selected tests | `powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit` | Test only relevant scope |

Do not append `--help` after a `skills add <source>` command; the CLI treats `<source>` as an install target.

---

## Quick Start

<details open>
<summary><b>Codex local link</b></summary>

Clone this repository, then link its skills into Codex native skill discovery:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-skill-link.ps1 -Force
```

The installer creates a Windows junction or symlink:

```text
~\.codex\skills\codex-workflow-kit -> <repo>\skills
```

After that, update this repository with:

```powershell
git pull
```

Skills update immediately through the link. Agents, hooks, and workflow config remain project-local templates; import them intentionally into another project only when needed.

</details>

<details>
<summary><b>Install from GitHub URL</b></summary>

Use this flow on another machine when you only have the GitHub repository link.

Step 1. Install Node.js LTS.

`npx` is bundled with `npm`, so installing Node.js LTS is enough for the `npx skills` flow. Verify the tools:

```powershell
node --version
npm --version
npx --version
```

Step 2. Set the repository URL:

```powershell
$repo = "leduyminhh/ai-development-kit"
```

Step 3. Confirm the `skills` CLI is available through `npx`:

```powershell
npx skills --help
npx skills -h
```

Step 4. List available skills without installing:

```powershell
npx skills add $repo --list
```

Step 5. Install one allowed skill into Claude Code global skills:

```powershell
npx skills add $repo --skill security-code-review --agent claude-code -g -y --copy
```

This command must create:

```text
~\.claude\skills\security-code-review\SKILL.md
```

Step 6. Install the default allowed skills into Codex:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent codex -y
```

Step 7. Install the same allowed skills into Claude Code:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent claude-code -g -y --copy
```

Step 8. Verify from the target machine:

```powershell
npx skills list --agent codex
npx skills list --agent claude-code
Test-Path "$HOME\.claude\skills\security-code-review\SKILL.md"
```

</details>

<details>
<summary><b>Claude Code</b></summary>

Install a single skill globally:

```powershell
npx skills add $repo --skill security-code-review --agent claude-code -g -y --copy
```

Use `-g` so the skill lands under the Claude Code global skills directory, and use `--copy` when Claude Code should receive physical files instead of links.

</details>

<details>
<summary><b>Cursor</b></summary>

The `skills` CLI targets Cursor through the shared agent skills path:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent cursor -y --copy
```

Cursor can also consume copied skill text through project rules when a project does not use the CLI.

</details>

<details>
<summary><b>Other agents</b></summary>

Skills are plain Markdown files under `skills/<name>/SKILL.md`. Agents that support instruction files can consume the relevant `SKILL.md` directly, or you can copy the skill body into that agent's rule system.

</details>

---

## Cross-IDE Hooks

The hook core provides one canonical event model for Codex, Claude Code, and other AI IDE adapters. It normalizes lifecycle hooks such as `PreToolUse`, `PostToolUse`, `PermissionRequest`, `UserPromptSubmit`, `SubagentStart`, `SubagentStop`, and `Stop` into audit events like `agent.started`, `skill.selected`, `skill.loaded`, `subagent.started`, `subagent.completed`, and `agent.completed`.

Install the hook runtime into a target project:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-hooks.ps1 -TargetRoot <project> -Provider all -Transport cli
```

The installer is non-invasive by default. If `.codex/hooks` or `.claude/hooks` already contains custom hook files, provider shims are skipped unless `-Force` is passed. Core runtime files are copied under `.ai-hooks`, and missing `[hooks.core]` / `[hooks.http]` config sections are appended without replacing existing sections.

Run the local hook doctor:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/hook-doctor.ps1 -Root .
```

For team HTTP transport, run one shared hook service and point each member at the same endpoint:

```toml
[hooks.core]
enabled = true
mode = "observe"
transport = "http"
timeoutMs = 1500
failureMode = "abstain"

[hooks.http]
url = "http://127.0.0.1:42890/v1/events"
sharedTokenEnv = ""
teamId = ""
projectId = ""
clientName = ""
maxRequestBytes = 262144

[hooks.policy]
enabled = false
path = ".codex/hooks/policy.json"
```

The HTTP endpoint accepts `POST /v1/events`, writes canonical JSONL audit, keeps `/events` for legacy compatibility, rejects malformed JSON with `400`, oversized requests with `413`, and checks a shared token only when `sharedTokenEnv` is configured.

Inspect runtime evidence:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/query-hook-audit.ps1 -TraceId <trace-id> -Json
powershell -ExecutionPolicy Bypass -File scripts/view-hook-trace.ps1 -TraceId <trace-id> -Json
```

---

## Skill Catalog

The repository currently contains 15 skills. The default install allowlist is intentionally smaller:

```text
agent-operating-rules
diagram-generate
doc-write
git-workflow-design
security-code-review
```

### Operating And Validation

| Skill | What it does | Use when |
|---|---|---|
| [agent-operating-rules](skills/agent-operating-rules/SKILL.md) | Applies repository-wide execution discipline: read first, keep changes surgical, test intent, fail loud. | Planning, editing, validating, or resolving conflicting instructions. |
| [codex-structure-validate](skills/codex-structure-validate/SKILL.md) | Validates AGENTS.md, skills, agents, config, hooks, test mapping, and skill spec compliance. | After structure changes or before considering repository work complete. |
| [naming-rule-validate](skills/naming-rule-validate/SKILL.md) | Checks naming conventions for agents, skills, subagents, workflows, hooks, scripts, and validators. | Creating or renaming Codex project artifacts. |

### Build And Architecture

| Skill | What it does | Use when |
|---|---|---|
| [java-analyze](skills/java-analyze/SKILL.md) | Reviews Java/Spring architecture, flow, persistence, async risks, clean code boundaries, and test strategy. | Designing or reviewing JVM backend services. |
| [architecture-onion-design](skills/architecture-onion-design/SKILL.md) | Applies Onion Architecture and Palermo-style inward dependency rules. | Designing domain-centered Java/Spring modules or reviewing framework leakage. |
| [code-shared-design](skills/code-shared-design/SKILL.md) | Designs shared internal APIs, contracts, SDKs, and shared logic modules. | Building reusable modules published or reused across services. |
| [code-design-pattern](skills/code-design-pattern/SKILL.md) | Advises on design patterns with approval gates and overuse checks. | Choosing creational, structural, behavioral, or architectural patterns. |
| [react-code-generate](skills/react-code-generate/SKILL.md) | Builds or modifies React UI from Figma, tickets, text requirements, or API examples. | Implementing frontend application flows. |

### Verify, Document, And Ship

| Skill | What it does | Use when |
|---|---|---|
| [security-code-review](skills/security-code-review/SKILL.md) | Performs source-first security review, scoped scans, optional SonarQube/Trivy enrichment, report contracts, and `/fix` from prior reports. | Reviewing source, diffs, configs, dependencies, or project scan scope. |
| [test-qa-review](skills/test-qa-review/SKILL.md) | Derives QA scenarios, regression risks, verification commands, and concise findings in Vietnamese. | After architecture or implementation work. |
| [test-automation-validate](skills/test-automation-validate/SKILL.md) | Plans, creates, runs, and stabilizes automated tests across stacks. | Moving from QA review to executable verification. |
| [diagram-generate](skills/diagram-generate/SKILL.md) | Selects and generates PlantUML diagrams through focused diagram subagents. | Designing or reviewing architecture, sequence, ERD, state, deployment, and related diagrams. |
| [doc-write](skills/doc-write/SKILL.md) | Creates and updates technical documentation, README sections, ADR-style notes, and handoff material. | Documenting architecture, features, flows, schemas, or implementation context. |
| [git-workflow-design](skills/git-workflow-design/SKILL.md) | Handles branch, commit, merge, revert, release, hotfix, staging, push, and PR workflows. | Publishing or organizing git changes. |
| [youtube-transcript](skills/youtube-transcript/SKILL.md) | Downloads, fetches, transcribes, or cleans YouTube transcripts, captions, and subtitles. | Working with YouTube URLs or transcript artifacts. |

---

## How Skills Work

Every runtime skill follows the same shape:

```text
skills/<name>/
  SKILL.md              # frontmatter + workflow entry point
  agents/openai.yaml    # optional UI metadata
  resources/            # optional supporting references
  scripts/              # optional skill-owned tools and tests
  subagents/            # optional focused prompts owned by the skill
```

Required `SKILL.md` frontmatter:

```yaml
---
name: lowercase-hyphen-name
description: Third-person trigger description that says what the skill does and when to use it.
---
```

Required top-level `SKILL.md` template:

```text
YAML frontmatter
# Skill Name

## Overview
## When to Use
## Core Process
## Examples
## Common Rationalizations
## Red Flags
## Verification
## Resource Map
## Subagent Prompts
## Scripts
## Output Format
## Notes
```

Use [skills/SKILL_TEMPLATE.md](skills/SKILL_TEMPLATE.md) when creating or updating a skill. The validator fails any runtime skill whose H2 headings do not match this template order.

Design rules:

- **Progressive disclosure.** `SKILL.md` is the entry point; supporting references load only when needed.
- **Flat runtime layout.** Runtime skills live directly under `skills/<name>/`.
- **Source-backed docs.** Skills should tell agents what to inspect and what evidence is required.
- **Validation before completion.** Structural changes must pass the validator and selected tests.
- **No protected writes by default.** Files under `docs/` and `reports/` require explicit confirmation before writing.

---

## Project Structure

```text
ai-development-kit/
  AGENTS.md                         # repository-level agent instructions
  skills/                           # runtime skills
    agent-operating-rules/
    codex-structure-validate/
    security-code-review/
    ...
  .codex/
    agents/                         # project-local agent entry points
    agent-metadata/                 # read-only/hooks metadata for agent registry sync
    config.toml                     # deterministic behavior, guards, hooks, validation
    hooks/                          # project hook wrappers and hook libraries
    mcp/                            # MCP templates or snippets
    test-map.toml                   # selected test routing
  scripts/                          # shared project helpers and test runners
  references/                       # standards and external reference notes
  docs/                             # protected documentation outputs
  reports/                          # protected generated reports and audit logs
```

---

## Validation

Run the structure validator:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root .
```

Run with `-Fix` to create or synchronize scaffold directories and agent registry entries:

```powershell
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

The validator checks:

- `AGENTS.md` guidance boundaries.
- `skills/<name>/SKILL.md` skill structure and agentskills-style metadata rules.
- `.codex/agents/<name>.toml` agent structure and skill references.
- `.codex/config.toml` safety defaults and agent registry.
- `.codex/test-map.toml` selected test mapping.
- Optional hooks, reports, and protected path policy.

Run selected tests for current git changes:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Run tests for one activated skill:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -ActivatedSkill architecture-onion-design
```

Every new `*test*.ps1` file must be registered in `.codex/test-map.toml`.

---

## Why This Kit Exists

AI coding agents can move quickly, but without repository-level rules they often skip validation, over-read context, write broad changes, or miss target-specific install details. This kit makes those workflows explicit and reusable:

- Skills encode task-specific workflows.
- Agents provide project-local entry points.
- Validators enforce structure and skill-spec compliance.
- Selected tests keep verification scoped to the actual change.
- Install manifests keep Codex, Claude Code, Cursor, and `npx skills` behavior aligned.

---

## Contributing

When adding or changing a skill:

1. Keep `SKILL.md` under 500 lines when possible.
2. Use lowercase hyphenated skill names and match the directory name.
3. Follow [skills/SKILL_TEMPLATE.md](skills/SKILL_TEMPLATE.md) exactly for top-level H2 order.
4. Put skill-owned scripts, tests, resources, and subagents under that skill folder.
5. Register new PowerShell test files in `.codex/test-map.toml`.
6. Run the validator and selected tests before publishing.

---

## License

MIT - use these skills in your projects, teams, and tools.
