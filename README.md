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

## Install From GitHub URL

Use this path on another machine when you only have the GitHub repository link:

Step 1. Install Node.js LTS.

`npx` is bundled with `npm`, so installing Node.js LTS is enough for the `npx skills` flow. Verify the tools:

```powershell
node --version
npm --version
npx --version
```

If any command is missing, install Node.js LTS from the official installer or the target machine's package manager, then open a new terminal and run the checks again.

Step 2. Set the repository URL:

```powershell
$repo: "leduyminhh/ai-codex-development-kit"
```

Step 3. Confirm the `skills` CLI is available through `npx`:

```powershell
npx skills --help
npx skills -h
```

Do not append `--help` after a `skills add <source>` command; the CLI treats `<source>` as an install target.

Step 4. List available skills without installing:

```powershell
npx skills add $repo --list
```
Step 5. Install the skills into Codex:

```powershell
npx skills add $repo
```

Step 6. Verify from the target machine:

```powershell
npx skills list --agent codex
```

## Install With Local Skills CLI

The repository is compatible with the `skills` CLI. List available skills without installing:

```powershell
npx skills add . --list
```

Show CLI help:

```powershell
npx skills --help
npx skills -h
```

Install the default allowed skills into Codex:

```powershell
npx skills add . --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review --agent codex -y
```

Install one allowed skill into Codex:

```powershell
npx skills add . --skill security-code-review --agent codex -y
```

Add `--copy` when the target agent should receive physical files instead of links.

Local aliases:

```powershell
npx skills a . --skill security-code-review --agent codex -y
npx skills ls --agent codex
npx skills update security-code-review
```

Do not append `--help` after a local `skills add .` command; the CLI treats `.` as an install target.

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
| `agent-operating-rules` | Ap dung rule van hanh agent cap repo: think before coding, surgical changes, read before write, verify before claim, va 3 mode apply sang AGENTS.md/CLAUDE.md project khac. |
| `codex-structure-validate` | Validator cau truc Codex repo. |
| `naming-rule-validate` | Kiem tra naming convention va do khop metadata name cho agent, skill, subagent, hook va script. |
| `java-analyze` | Phan tich Java/Spring backend, flow, persistence, async, clean code, test strategy. |
| `react-code-generate` | Tao/sua React UI tu Figma, ticket, yeu cau text va API contract. |
| `security-code-review` | Review va scan security theo scope voi Rule Engine bat buoc, optional SonarQube/Trivy, report contract, cost log, va `/fix` workflow tu scan report. |
| `test-qa-review` | Review QA doc lap, scenario, regression risk, verification plan. |
| `test-automation-validate` | Lap ke hoach va tao automated tests theo stack. |
| `diagram-generate` | Chon va tao PlantUML diagrams. |
| `doc-write` | Viet tai lieu ky thuat va README/doc artifacts. |
| `git-workflow-design` | Ho tro branch, commit, merge, revert, release, hotfix. |
| `code-design-pattern` | Tu van design pattern co approval gate. |
| `architecture-onion-design` | Huong dan Onion Architecture va boundary review. |
| `code-shared-design` | Thiet ke shared internal API, contract, shared logic module. |
| `youtube-transcript` | Tai transcript, captions, subtitles, hoac transcript Whisper tu video YouTube. |

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

- `agent-operating-rules`: repository-wide execution discipline for planning, editing, validation, conflict handling, and applying the same operating rules to another project's `AGENTS.md` or `CLAUDE.md`.
- `java-analyze`: Java backend architecture review and design for flow, clean code, Spring patterns, persistence, async/concurrency, and test strategy.
- `react-code-generate`: React UI implementation from Figma, requirements, tickets, and API contracts.
- `security-code-review`: source-code security review plus scoped `/security-scan` guidance with required Rule Engine checks, optional SonarQube/Trivy enrichment, Markdown/JSON/SARIF report contracts, `cost-log.json`, rule freshness, and safe `/fix` workflow from previous scan reports.
- `test-qa-review`: QA reviewer review across stacks.
- `test-automation-validate`: automated unit, integration/API, E2E, fixture/data, coverage, and flaky test workflows.
- `code-design-pattern`: design pattern advisor with approval gates before applying patterns.
- `doc-write`: technical documentation for architecture, features, flows, and database/schema knowledge.
- `youtube-transcript`: YouTube transcript, subtitle, caption, and Whisper fallback workflow using `yt-dlp`.

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

