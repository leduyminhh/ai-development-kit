# Codex Workflow Kit

This workspace stores reusable Codex workflow building blocks: validators, agents, skills, and domain-specific agent capabilities.

## Quick Install

Clone this repository, then link its skills into Codex native skill discovery:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-skill-link.ps1 -Force
```

The installer creates a Windows junction or symlink:

```text
~\.agents\skills\codex-workflow-kit -> <repo>\.agents\skills
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
powershell -ExecutionPolicy Bypass -File .agents/skills/codex-best-practice-validator/scripts/validate-codex-structure.ps1 -Root . -Fix
```

The scaffold is organized in six layers:

- Step 1 `codex-agents-md`: `AGENTS.md` keeps repository-level guidance concise.
- Step 2 `codex.config`: `.codex/config.toml` stores deterministic behavior, validation, audit, guards, and agent registration.
- Step 3 `codex-hook`: `.codex/hooks/` stores hook contracts such as agent execution audit logging.
- Step 4 `codex-mcp`: `.codex/mcp/` stores MCP configuration snippets or templates.
- Step 5 `codex-skill`: `.agents/skills/<name>/SKILL.md` stores reusable runtime procedures.
- Step 6 `codex-subagent`: `.agents/skills/<name>/subagents/` stores focused subagent prompts owned by each skill.

When `-Fix` is used, `.codex/config.toml` is synchronized from `.codex/agents/*.toml`, and missing scaffold directories are created with `.gitkeep` markers when needed.

## Audited Agent Runner

Codex does not automatically execute custom keys such as `[audit.agent].hook` from `.codex/config.toml`. Use the audited wrapper when a workflow needs deterministic audit rows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/invoke-agent-audited.ps1 `
  -AgentName react-js `
  -Model gpt-5.4 `
  -Reasoning medium `
  -SummaryJob "Build checkout UI" `
  -Command "npm test"
```

The wrapper writes one compact text row per execution through `.codex/hooks/agent-execution-audit.ps1`, preserving the wrapped command exit code. The default audit file name is `yyMMdd_action.log`.

Log format follows a Logback-like shape with logfmt fields after `|`:

```text
2026-04-15T07:00:00+07:00 [INFO] [codex-agent] [react-js] [session-id] [-] [-] codex.agent.audit - Build checkout UI | timestamp=2026-04-15T00:05:00Z level=info service=codex-agent eventName=agent.execution eventVersion=1.0 sessionId=session-id agentName=react-js model=gpt-5.4 reasoning=medium summaryJob="Build checkout UI" startTime=2026-04-15T07:00:00+07:00 endTime=2026-04-15T07:05:00+07:00 startAt=2026-04-15T00:00:00Z endAt=2026-04-15T00:05:00Z durationMs=300000 status=completed cost=0 traceId=- spanId=- timezone=Asia/Ho_Chi_Minh schema=codex.agent.audit.v1
```

This keeps each row as a string while preserving the earlier audit fields for future Grafana Loki parsing.

## Core Validator

The first core workflow is `codex-structure-validator`, an Agent -> Skill validator for Codex best-practice repository structure.

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

- `java-architect`: Java backend architecture review and design for flow, clean code, Spring patterns, persistence, async/concurrency, and test strategy.
- `react-js`: React UI implementation from Figma, requirements, tickets, and API contracts.
- `qa-reviewer`: QA reviewer review across stacks.
- `automation-testing`: automated unit, integration/API, E2E, fixture/data, coverage, and flaky test workflows.
- `design-pattern`: design pattern advisor with approval gates before applying patterns.
- `documentation-writer`: technical documentation for architecture, features, flows, and database/schema knowledge.

Every domain skill or agent must pass `codex-best-practice-validator` before it is considered complete.

## Selected Test Routing

Tests are mapped in `.codex/test-map.toml` so agents run only the checks related to changed files, activated skills, or selected agents.

Run the selected plan for current git changes:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
```

Run tests for one activated skill:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -ActivatedSkill onion-architecture
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


