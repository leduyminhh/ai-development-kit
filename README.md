# Codex Workflow Kit

This workspace stores reusable Codex workflow building blocks: validators, agents, skills, and domain-specific agent capabilities.

## Quick Install

Clone this repository, then link its skills into Codex native skill discovery:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-skill-link.ps1 -Force
```

The installer creates a Windows junction or symlink:

```text
~\.codex\skills\codex-workflow-kit -> <repo>\.agents\skills
```

After that, update this repository with:

```powershell
git pull
```

Skills update immediately through the link. No per-project copy step is required.

Agents, hooks, and workflow config remain in this repository as project-local templates. Import them intentionally into a project when that project needs named agents or audit hooks.

## Standard Codex Structure

Run the validator with `-Fix` to create or synchronize the standard scaffold:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

The scaffold is organized in six layers:

- Step 1 `codex-agents-md`: `AGENTS.md` keeps repository-level guidance concise.
- Step 2 `codex.config`: `.codex/config.toml` stores deterministic behavior, validation, audit, guards, and agent registry entries.
- Step 3 `codex-hook`: `.codex/hooks/` stores project hook wrappers and shared hook logic in `lib/`.
- Step 4 `codex-mcp`: `.codex/mcp/` stores MCP configuration snippets or templates.
- Step 5 `codex-skill`: `.agents/skills/<name>/SKILL.md` stores reusable runtime procedures.
- Step 6 `codex-subagent`: `.agents/skills/<name>/subagents/` stores focused subagent prompts owned by each skill.

When `-Fix` is used, `.codex/config.toml` is synchronized from `.codex/agents/*.toml` plus `.codex/agent-metadata/*.toml`, and missing scaffold directories are created with `.gitkeep` markers when needed.

## Project Event Hook

Codex does not automatically execute custom keys from `.codex/config.toml`. Use the project hook wrappers when a workflow needs deterministic event rows:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/hooks/log-agent-event.ps1 `
  -AgentName react-code-generate `
  -Model gpt-5.4 `
  -Reasoning medium `
  -Message "Build checkout UI" `
  -Status completed
```

The wrapper writes one compact text row per execution through the shared library in `.codex/hooks/lib/`. The default event file name is `yyyyMMdd_filename.log` under `reports/audit/`, and the hook runs only when `[hooks.project].enabled = true` and `agent_registry.<name>.hooks_project_enabled = true`.

Log format follows a Log4j-like shape with logfmt fields after `|`:

```text
2026-04-15T07:00:00+07:00 [INFO] [codex-workflow-kit] [react-code-generate] [trace-111] codex.project.agent - Build checkout UI | timestamp=2026-04-15T00:05:00Z level=info service=codex-workflow-kit eventName=agent.execution eventVersion=1.0 sessionId=session-id sourceType=agent sourceName=react-code-generate agentName=react-code-generate model=gpt-5.4 reasoning=medium message="Build checkout UI" status=completed startTime=2026-04-15T07:00:00+07:00 endTime=2026-04-15T07:05:00+07:00 startAt=2026-04-15T00:00:00Z endAt=2026-04-15T00:05:00Z durationMs=300000 cost=0 traceId=trace-111 spanId=- timezone=Asia/Saigon schema=codex.project.event.v1
```

| Skill | Chuc nang |
|---|---|
| `codex-structure-validate` | Validator cau truc Codex repo. |
| `naming-rule-validate` | Kiem tra naming convention va do khop metadata name cho agent, skill, subagent, hook va script. |
| `java-analyze` | Phan tich Java/Spring backend, flow, persistence, async, clean code, test strategy. |
| `react-code-generate` | Tao/sua React UI tu Figma, ticket, yeu cau text va API contract. |
| `skill-evolution-review` | Engine trung tam quan sat drift cua skill/agent tu audit va feedback, phan loai va de xuat tien hoa co guardrail. |
| `test-qa-review` | Review QA doc lap, scenario, regression risk, verification plan. |
| `test-automation-validate` | Lap ke hoach va tao automated tests theo stack. |
| `diagram-generate` | Chon va tao PlantUML diagrams. |
| `doc-write` | Viet tai lieu ky thuat va README/doc artifacts. |
| `git-workflow-design` | Ho tro branch, commit, merge, revert, release, hotfix. |
| `code-design-pattern` | Tu van design pattern co approval gate. |
| `architecture-onion-design` | Huong dan Onion Architecture va boundary review. |
| `code-shared-design` | Thiet ke shared internal API, contract, shared logic module. |

This keeps each row as a string while preserving structured fields for future parsing and extension to validation or notification events.

## Core Validator

The first core workflow is `codex-structure-validate`, an Agent -> Skill validator for Codex best-practice repository structure.

It validates:

- `AGENTS.md` guidance boundaries.
- `.agents/skills/<name>/SKILL.md` skill structure.
- `.codex/agents/<name>.toml` agent structure.
- `.codex/config.toml` safety defaults and profiles.
- Optional hooks and reports.
- Separation between core validator rules and domain skills.

## Domain Skills And Agents

Domain-specific skills and agents live outside the validator core.

Current domain capabilities:

- `java-analyze`: Java backend architecture review and design for flow, clean code, Spring patterns, persistence, async/concurrency, and test strategy.
- `react-code-generate`: React UI implementation from Figma, requirements, tickets, and API contracts.
- `test-qa-review`: QA reviewer review across stacks.
- `test-automation-validate`: automated unit, integration/API, E2E, fixture/data, coverage, and flaky test workflows.
- `code-design-pattern`: design pattern advisor with approval gates before applying patterns.
- `doc-write`: technical documentation for architecture, features, flows, and database/schema knowledge.

Every domain skill or agent must pass `codex-structure-validate` before it is considered complete.

## Selected Test Routing

Tests are mapped in `.codex/test-map.toml` so agents run only the checks related to changed files, activated skills, or selected agents.

Run the selected plan for current git changes:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Run tests for one activated skill:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -ActivatedSkill architecture-onion-design
```

Rules:

- `test.always` is for final safety gates.
- `test.core` is for shared scripts, config, hooks, and validators.
- `test.skill` is for skill/agent-specific tests.
- Every new `*test*.ps1` file must be registered in `.codex/test-map.toml` when it is created.

## Reference Material

`references/external/codex-cli-best-practice/` is an optional local clone path for `shanraisshan/codex-cli-best-practice` analysis. Do not treat it as source code owned by this repo unless it is explicitly converted into a submodule or vendored reference later.

## Legacy Superpowers Aliases

The earlier `superpowers-workflow` aliases are still useful as process references. Keep them until the validator and domain skills replace the need for a dedicated alias list.

