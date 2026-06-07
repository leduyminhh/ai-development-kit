# AI Development Kit Migration Specification v1.0

## Migrate Source Code to Plugin-Based AI Engineering Kit

Version: `1.0.0`
Target repository: `ai-development-kit`
Migration style: `Core + Plugins + IDE Adapters`
Primary goal: support **install full kit** or **install single plugin** across Claude Code, Codex, Cursor, Antigravity, GitHub Copilot, and generic AI IDEs.

---

# 1. Executive Summary

AI Development Kit should not directly copy Claude plugin format as the only standard.

Claude Code currently supports plugin marketplace installation natively, for example:

```bash
claude plugin marketplace add anthropics/knowledge-work-plugins
claude plugin install sales@knowledge-work-plugins
```

However, Codex, Cursor, Antigravity, GitHub Copilot, and other AI IDEs do not share the same plugin marketplace format.

Therefore, the correct migration architecture is:

```text
AIDK Standard Format
        ↓
Plugin Registry
        ↓
Adapter Generator
        ↓
Claude / Codex / Cursor / Antigravity / Copilot / Generic IDE
```

AIDK should become the **source of truth**, then generate native configuration for each AI IDE.

---

# 2. Migration Goals

## 2.1 Main Goals

- Support plugin-based architecture.
- Support installing the full kit.
- Support installing only one plugin, such as `backend`.
- Support multiple AI IDEs.
- Support MCP integration.
- Support command-based workflows.
- Support enterprise software engineering governance.
- Preserve existing Architecture, Backend, Frontend, Security, DevOps, and Documentation skills.
- Avoid loading unnecessary context into AI IDEs.

## 2.2 Non-Goals

- Do not make Claude plugin format the only standard.
- Do not force every project to install all plugins.
- Do not require MCP for basic local usage.
- Do not require users to use only one IDE.
- Do not make business plugins like Sales, HR, Marketing the default focus.

---

# 3. Target Architecture

```text
ai-development-kit/
│
├── README.md
├── AGENTS.md
├── package.json
├── aidk.config.yaml
│
├── core/
│   ├── standards/
│   ├── loaders/
│   ├── schemas/
│   └── templates/
│
├── plugins/
│   ├── architecture/
│   ├── backend/
│   ├── frontend/
│   ├── security/
│   ├── devops/
│   ├── documentation/
│   ├── data/
│   └── observability/
│
├── adapters/
│   ├── claude/
│   ├── codex/
│   ├── cursor/
│   ├── antigravity/
│   ├── copilot/
│   └── generic/
│
├── marketplace/
│   ├── registry.yaml
│   └── plugins/
│
├── mcp/
│   ├── registry.yaml
│   └── servers/
│
├── cli/
│   ├── commands/
│   ├── generators/
│   ├── installers/
│   └── validators/
│
├── docs/
│   ├── migration/
│   ├── plugin-authoring/
│   ├── adapter-authoring/
│   └── examples/
│
└── examples/
    ├── spring-boot-service/
    ├── react-app/
    ├── microservices/
    └── platform-project/
```

---

# 4. Core Design

## 4.1 AIDK Standard Format

AIDK should use its own standard format:

```text
.aidk-plugin/
├── plugin.yaml
├── README.md
├── skills/
├── commands/
├── agents/
├── rules/
├── checklists/
├── templates/
├── workflows/
└── mcp/
```

This format is the canonical source.

Each adapter converts this format into IDE-specific files.

---

# 5. Plugin Structure

Example: `plugins/backend`

```text
plugins/backend/
│
├── .aidk-plugin/
│   └── plugin.yaml
│
├── README.md
│
├── skills/
│   ├── spring-boot.md
│   ├── clean-architecture.md
│   ├── rest-api.md
│   ├── database.md
│   ├── kafka.md
│   ├── redis.md
│   └── testing.md
│
├── commands/
│   ├── review-backend.md
│   ├── generate-api.md
│   ├── generate-service.md
│   ├── generate-repository.md
│   ├── generate-test.md
│   └── fix-backend.md
│
├── agents/
│   ├── backend-architect.md
│   ├── backend-reviewer.md
│   └── backend-implementer.md
│
├── rules/
│   ├── naming.md
│   ├── error-handling.md
│   ├── transaction.md
│   ├── validation.md
│   └── logging.md
│
├── checklists/
│   ├── production-ready.md
│   ├── code-review.md
│   ├── api-review.md
│   └── database-review.md
│
├── templates/
│   ├── spring-controller.java.hbs
│   ├── spring-service.java.hbs
│   ├── spring-repository.java.hbs
│   └── postman-collection.json.hbs
│
├── workflows/
│   ├── create-crud-api.md
│   ├── review-existing-service.md
│   └── refactor-legacy-service.md
│
└── mcp/
    └── backend-tools.yaml
```

---

# 6. Plugin Metadata

File:

```text
plugins/backend/.aidk-plugin/plugin.yaml
```

Example:

```yaml
id: backend
name: Backend Engineering
version: 1.0.0
type: engineering-plugin
description: Enterprise backend development plugin for Spring Boot, REST API, database, Kafka, Redis, testing, and production readiness.

author:
  name: AI Development Kit
  url: https://github.com/leduyminhh/ai-codex-development-kit

compatibility:
  aidk: ">=1.0.0"
  ide:
    claude: true
    codex: true
    cursor: true
    antigravity: true
    copilot: true
    generic: true

dependencies:
  required:
    - architecture
  optional:
    - security
    - devops
    - observability

entrypoints:
  default_agent: backend-architect
  default_skill: spring-boot
  default_command: review-backend

skills:
  - spring-boot
  - clean-architecture
  - rest-api
  - database
  - kafka
  - redis
  - testing

commands:
  - review-backend
  - generate-api
  - generate-service
  - generate-repository
  - generate-test
  - fix-backend

agents:
  - backend-architect
  - backend-reviewer
  - backend-implementer

mcp:
  enabled: false
  servers:
    - github
    - postgresql
    - sonarqube

install:
  default_scope: project
  supports_partial_install: true
  supports_full_kit_install: true
```

---

# 7. Install Modes

## 7.1 Install Full Kit

```bash
npx aidk init
```

or:

```bash
npx aidk install
```

Expected output:

```text
project/
├── AGENTS.md
├── aidk.config.yaml
├── .aidk/
│   ├── plugins/
│   ├── commands/
│   ├── skills/
│   ├── agents/
│   └── mcp/
```

## 7.2 Install Full Kit for Specific IDE

```bash
npx aidk init --ide claude
npx aidk init --ide cursor
npx aidk init --ide codex
npx aidk init --ide antigravity
npx aidk init --ide copilot
```

## 7.3 Install One Plugin

```bash
npx aidk plugin install backend
```

## 7.4 Install One Plugin for Specific IDE

```bash
npx aidk plugin install backend --ide claude
npx aidk plugin install backend --ide cursor
npx aidk plugin install backend --ide codex
npx aidk plugin install backend --ide antigravity
npx aidk plugin install backend --ide copilot
```

## 7.5 Install Multiple Plugins

```bash
npx aidk plugin install backend,security,architecture --ide cursor
```

## 7.6 Install With MCP

```bash
npx aidk plugin install backend --ide claude --with-mcp
```

---

# 8. Adapter Strategy

## 8.1 Why Adapter Is Required

Different AI IDEs have different formats.

```text
Claude       → native plugins, skills, agents, slash commands, MCP
Cursor       → .cursor/rules/*.mdc, MCP
Codex        → AGENTS.md, project context, scripts
Antigravity  → AGENTS.md, skills.md, workflows, MCP
Copilot      → .github/copilot-instructions.md, .github/instructions/*.instructions.md, MCP
Generic      → AGENTS.md, docs/ai, .aidk
```

AIDK should not depend on one vendor-specific structure.

---

# 9. Claude Adapter

## 9.1 Output

```text
.claude/
├── plugins/
│   └── backend/
│       ├── plugin.json
│       ├── skills/
│       ├── commands/
│       ├── agents/
│       └── mcp/
└── settings.json
```

## 9.2 Command

```bash
npx aidk plugin install backend --ide claude
```

## 9.3 Mapping

| AIDK | Claude |
|---|---|
| `plugin.yaml` | `plugin.json` |
| `skills/*.md` | `skills/` |
| `commands/*.md` | slash commands |
| `agents/*.md` | subagents |
| `mcp/*.yaml` | MCP config |
| `rules/*.md` | skill/rule content |

---

# 10. Codex Adapter

## 10.1 Output

```text
AGENTS.md
.aidk/
├── plugins/
│   └── backend/
├── skills/
├── commands/
└── workflows/
```

## 10.2 Command

```bash
npx aidk plugin install backend --ide codex
```

## 10.3 Mapping

| AIDK | Codex |
|---|---|
| `AGENTS.md` | root instruction |
| `skills/*.md` | `.aidk/skills/` |
| `commands/*.md` | `.aidk/commands/` |
| `agents/*.md` | sections in `AGENTS.md` |
| `workflows/*.md` | `.aidk/workflows/` |
| `mcp/*.yaml` | `.mcp.json` if supported |

## 10.4 Generated AGENTS.md Example

```md
# AGENTS.md

## AI Development Kit

This project uses AIDK plugins.

Installed plugins:

- backend
- architecture

## Skill Loading Policy

Before starting a task:

1. Inspect `.aidk/plugins`.
2. Load only relevant plugin.
3. Load only relevant skill.
4. Follow command workflow if user invokes a command.
5. Prioritize:
   - User instruction
   - AGENTS.md
   - Plugin rules
   - Skill instructions
   - General model knowledge

## Backend Plugin

Use backend plugin for:

- Spring Boot
- REST API
- Database
- Kafka
- Redis
- Testing
- Refactoring
```

---

# 11. Cursor Adapter

## 11.1 Output

```text
.cursor/
└── rules/
    ├── aidk-core.mdc
    ├── backend.mdc
    ├── backend-spring-boot.mdc
    ├── backend-testing.mdc
    └── security.mdc

.mcp.json
.aidk/
└── plugins/
```

## 11.2 Command

```bash
npx aidk plugin install backend --ide cursor
```

## 11.3 Mapping

| AIDK | Cursor |
|---|---|
| `skills/*.md` | `.cursor/rules/*.mdc` |
| `rules/*.md` | `.cursor/rules/*.mdc` |
| `commands/*.md` | command snippets or workflow docs |
| `agents/*.md` | role rules |
| `mcp/*.yaml` | `.mcp.json` |

## 11.4 Example Cursor Rule

```md
---
description: Backend Engineering Rules
globs:
  - "**/*.java"
  - "**/*.kt"
  - "**/pom.xml"
  - "**/build.gradle"
alwaysApply: false
---

# Backend Engineering

Use this rule when working with backend source code.

## Priorities

1. Maintain clean architecture.
2. Keep controller thin.
3. Keep service transactional.
4. Validate input.
5. Use DTO boundaries.
6. Avoid leaking entity directly to API response.
```

---

# 12. Antigravity Adapter

## 12.1 Output

```text
AGENTS.md
skills.md
workflows/
├── backend-review.md
├── generate-api.md
└── fix-backend.md

.aidk/
└── plugins/

.mcp.json
```

## 12.2 Command

```bash
npx aidk plugin install backend --ide antigravity
```

## 12.3 Mapping

| AIDK | Antigravity |
|---|---|
| `AGENTS.md` | root agent file |
| `skills/*.md` | `skills.md` or `skills/` |
| `commands/*.md` | `workflows/*.md` |
| `agents/*.md` | agent sections |
| `mcp/*.yaml` | `.mcp.json` |

---

# 13. GitHub Copilot Adapter

## 13.1 Output

```text
.github/
├── copilot-instructions.md
└── instructions/
    ├── backend.instructions.md
    ├── security.instructions.md
    └── architecture.instructions.md

.mcp.json
.aidk/
└── plugins/
```

## 13.2 Command

```bash
npx aidk plugin install backend --ide copilot
```

## 13.3 Mapping

| AIDK | Copilot |
|---|---|
| `AGENTS.md` | optional root convention |
| `skills/*.md` | `.github/instructions/*.instructions.md` |
| `rules/*.md` | `.github/instructions/*.instructions.md` |
| `commands/*.md` | documented workflows |
| `mcp/*.yaml` | `.mcp.json` |

---

# 14. Generic Adapter

## 14.1 Output

```text
AGENTS.md
docs/
└── ai/
    ├── plugins/
    ├── skills/
    ├── commands/
    └── workflows/

.aidk/
└── plugins/
```

## 14.2 Command

```bash
npx aidk plugin install backend --ide generic
```

Use this for IDEs that do not support native rules or plugins.

---

# 15. Marketplace Design

## 15.1 Registry

```text
marketplace/
├── registry.yaml
└── plugins/
    ├── backend.yaml
    ├── security.yaml
    ├── architecture.yaml
    └── devops.yaml
```

Example:

```yaml
plugins:
  - id: backend
    name: Backend Engineering
    version: 1.0.0
    source: plugins/backend
    tags:
      - backend
      - spring-boot
      - api
      - database
    dependencies:
      - architecture

  - id: security
    name: Security Engineering
    version: 1.0.0
    source: plugins/security
    tags:
      - security
      - owasp
      - cwe
      - trivy
      - sonarqube
```

## 15.2 Marketplace Commands

```bash
npx aidk marketplace list
npx aidk marketplace add leduyminhh/ai-development-kit
npx aidk marketplace update
npx aidk marketplace remove leduyminhh/ai-development-kit
```

---

# 16. CLI Commands

## 16.1 Init

```bash
npx aidk init
npx aidk init --ide cursor
npx aidk init --ide claude
npx aidk init --ide codex
```

## 16.2 Plugin

```bash
npx aidk plugin list
npx aidk plugin search backend
npx aidk plugin install backend
npx aidk plugin install backend --ide cursor
npx aidk plugin install backend --ide claude
npx aidk plugin remove backend
npx aidk plugin update backend
```

## 16.3 Adapter

```bash
npx aidk adapter list
npx aidk adapter generate --ide cursor
npx aidk adapter generate --ide claude
npx aidk adapter validate --ide cursor
```

## 16.4 Validate

```bash
npx aidk validate
npx aidk validate plugin backend
npx aidk validate adapters
```

## 16.5 Export

```bash
npx aidk export --ide cursor
npx aidk export --ide claude
npx aidk export --ide codex
```

---

# 17. Source Code Migration Plan

## Phase 1: Create Core Standard

Tasks:

- Add `aidk.config.yaml`.
- Add `core/schemas/plugin.schema.json`.
- Add `core/templates/AGENTS.md.hbs`.
- Add plugin validation logic.
- Add adapter interface.

Deliverables:

```text
core/
├── schemas/
│   └── plugin.schema.json
├── templates/
│   └── AGENTS.md.hbs
└── loaders/
    ├── plugin-loader.ts
    └── config-loader.ts
```

---

## Phase 2: Convert Existing Skills to Plugins

Current:

```text
.agents/skills/
├── backend/
├── frontend/
├── architecture/
├── security/
└── devops/
```

Target:

```text
plugins/
├── backend/
├── frontend/
├── architecture/
├── security/
└── devops/
```

Migration mapping:

| Current | Target |
|---|---|
| `.agents/skills/backend` | `plugins/backend/skills` |
| `.agents/skills/security` | `plugins/security/skills` |
| `.agents/skills/architecture` | `plugins/architecture/skills` |
| `.agents/skills/devops` | `plugins/devops/skills` |
| `.agents/skills/frontend` | `plugins/frontend/skills` |

---

## Phase 3: Add Plugin Metadata

For every plugin, add:

```text
.aidk-plugin/plugin.yaml
```

Required fields:

```yaml
id:
name:
version:
description:
compatibility:
dependencies:
skills:
commands:
agents:
install:
```

---

## Phase 4: Add Commands

Create commands for repeatable workflows.

Example backend commands:

```text
plugins/backend/commands/
├── review-backend.md
├── generate-api.md
├── generate-service.md
├── generate-test.md
└── fix-backend.md
```

Example security commands:

```text
plugins/security/commands/
├── security-scan.md
├── security-fix.md
├── dependency-review.md
├── secrets-scan.md
└── docker-security-review.md
```

Example architecture commands:

```text
plugins/architecture/commands/
├── review-architecture.md
├── generate-ddd.md
├── generate-cqrs.md
├── generate-saga.md
└── generate-adr.md
```

---

## Phase 5: Add Agents

Create agent role files.

```text
plugins/backend/agents/
├── backend-architect.md
├── backend-reviewer.md
└── backend-implementer.md
```

Agent file format:

```md
# Backend Architect Agent

## Role

You are a Senior Backend Architect.

## Responsibilities

- Review service boundaries.
- Review API design.
- Review database design.
- Review transaction boundaries.
- Review scalability and maintainability.

## Must Follow

- User instruction
- AGENTS.md
- Plugin rules
- Skill workflow
```

---

## Phase 6: Add Adapter Generators

Create:

```text
adapters/
├── claude/
│   └── generate.ts
├── codex/
│   └── generate.ts
├── cursor/
│   └── generate.ts
├── antigravity/
│   └── generate.ts
├── copilot/
│   └── generate.ts
└── generic/
    └── generate.ts
```

Common interface:

```ts
export interface AdapterGenerator {
  id: string;
  name: string;
  generate(input: AdapterInput): Promise<AdapterOutput>;
  validate(outputPath: string): Promise<ValidationResult>;
}
```

---

## Phase 7: Add CLI

Recommended stack:

```text
Node.js + TypeScript
Commander.js
Zod
YAML parser
Handlebars
```

CLI structure:

```text
cli/
├── index.ts
├── commands/
│   ├── init.ts
│   ├── plugin.ts
│   ├── marketplace.ts
│   ├── adapter.ts
│   └── validate.ts
├── generators/
├── installers/
└── validators/
```

---

# 18. Plugin Dependency Strategy

## 18.1 Required Dependencies

Example:

```yaml
dependencies:
  required:
    - architecture
  optional:
    - security
    - devops
```

When user installs backend:

```bash
npx aidk plugin install backend
```

AIDK should ask or auto-install required dependencies:

```text
backend requires architecture.
Installing architecture...
Installing backend...
```

## 18.2 Optional Dependencies

Optional dependencies should not auto-install by default.

Example:

```bash
npx aidk plugin install backend --include-optional
```

---

# 19. Configuration File

File:

```text
aidk.config.yaml
```

Example:

```yaml
version: 1.0.0

project:
  name: my-project
  type: backend-service
  language:
    - java
    - typescript

ide:
  primary: cursor
  secondary:
    - claude
    - codex

plugins:
  installed:
    - architecture
    - backend
    - security

mcp:
  enabled: false
  servers: []

rules:
  load_mode: selective
  strict_priority: true

output:
  generated_files_comment: true
  overwrite_policy: ask
```

---

# 20. Generated File Policy

AIDK must mark generated files.

Example:

```md
<!-- Generated by AI Development Kit. Do not edit manually unless necessary. -->
<!-- Source plugin: backend@1.0.0 -->
```

Overwrite policy:

```yaml
overwrite_policy:
  options:
    - ask
    - overwrite
    - merge
    - skip
```

Default:

```yaml
overwrite_policy: ask
```

---

# 21. Recommended First Plugins

## 21.1 Architecture Plugin

```text
plugins/architecture/
├── skills/
│   ├── ddd.md
│   ├── cqrs.md
│   ├── clean-architecture.md
│   ├── event-driven.md
│   ├── saga.md
│   └── cdc.md
├── commands/
│   ├── review-architecture.md
│   ├── generate-ddd.md
│   ├── generate-cqrs.md
│   ├── generate-saga.md
│   └── generate-adr.md
└── agents/
    ├── solution-architect.md
    └── architecture-reviewer.md
```

## 21.2 Backend Plugin

```text
plugins/backend/
├── skills/
│   ├── spring-boot.md
│   ├── rest-api.md
│   ├── database.md
│   ├── kafka.md
│   ├── redis.md
│   └── testing.md
├── commands/
│   ├── review-backend.md
│   ├── generate-api.md
│   └── fix-backend.md
└── agents/
    ├── backend-architect.md
    └── backend-reviewer.md
```

## 21.3 Security Plugin

```text
plugins/security/
├── skills/
│   ├── owasp-top-10.md
│   ├── cwe-top-25.md
│   ├── secrets-detection.md
│   ├── spring-security.md
│   ├── react-security.md
│   └── docker-security.md
├── commands/
│   ├── security-scan.md
│   ├── security-fix.md
│   └── dependency-review.md
└── agents/
    ├── security-reviewer.md
    └── security-fixer.md
```

## 21.4 DevOps Plugin

```text
plugins/devops/
├── skills/
│   ├── docker.md
│   ├── docker-compose.md
│   ├── kubernetes.md
│   ├── jenkins.md
│   ├── nginx.md
│   ├── haproxy.md
│   └── postgres-runtime.md
├── commands/
│   ├── review-deployment.md
│   ├── generate-docker-compose.md
│   ├── generate-jenkinsfile.md
│   └── production-check.md
└── agents/
    ├── devops-engineer.md
    └── sre-reviewer.md
```

---

# 22. Command Format

Command files should be Markdown.

Example:

```text
plugins/backend/commands/review-backend.md
```

```md
# Command: review-backend

## Usage

/review-backend <scope>

## Intent

Review backend source code for production readiness.

## Load

Required:

- backend skills
- architecture rules

Optional:

- security rules
- devops rules

## Steps

1. Inspect project structure.
2. Detect framework and language.
3. Review architecture boundaries.
4. Review API design.
5. Review validation.
6. Review transaction handling.
7. Review logging and error handling.
8. Review tests.
9. Generate report.

## Output

- Summary
- Critical issues
- Recommended fixes
- Files affected
- Risk level
```

---

# 23. Skill Format

Example:

```text
plugins/backend/skills/spring-boot.md
```

```md
# Skill: Spring Boot Backend

## When To Use

Use this skill when working with Java Spring Boot services.

## Rules

- Keep controllers thin.
- Keep business logic in service layer.
- Use DTOs for API boundaries.
- Use validation annotations for request models.
- Use transactional boundary at service layer.
- Avoid exposing JPA entities directly.
- Add structured logging.
- Add tests for service and controller layers.

## Checklist

- Controller has validation.
- Service handles business rules.
- Repository contains persistence only.
- Exceptions are mapped to API responses.
- Transactions are explicit.
- Tests cover success and failure cases.
```

---

# 24. Agent Format

Example:

```text
plugins/backend/agents/backend-reviewer.md
```

```md
# Agent: Backend Reviewer

## Role

You are a Senior Backend Reviewer.

## Mission

Review backend code for correctness, maintainability, scalability, security, and production readiness.

## Review Scope

- API contracts
- DTOs
- Validation
- Service layer
- Transaction boundaries
- Database access
- Error handling
- Logging
- Tests
- Observability

## Output Format

1. Summary
2. Critical issues
3. Major issues
4. Minor issues
5. Recommended patches
6. Production readiness score
```

---

# 25. MCP Strategy

MCP should be optional.

Default:

```yaml
mcp:
  enabled: false
```

Enable only when user requests tool integration:

```bash
npx aidk init --with-mcp
npx aidk plugin install backend --with-mcp
```

Recommended MCP categories:

```text
mcp/
├── github/
├── gitlab/
├── jira/
├── sonarqube/
├── trivy/
├── nexus/
├── postgresql/
├── mongodb/
├── redis/
├── kubernetes/
└── observability/
```

---

# 26. Security Governance Must Stay Strong

AIDK should be stronger than generic plugin repositories.

Security plugin must include:

- OWASP Top 10
- CWE Top 25
- Spring Security
- React Security
- Docker Security
- Secrets Detection
- Dependency Review
- Infrastructure Review
- Optional SonarQube
- Optional Trivy

Commands:

```bash
npx aidk command run security-scan
npx aidk command run security-fix
```

or inside AI IDE:

```text
/security-scan src/
/security-fix reports/security/
```

---

# 27. Architecture Governance Must Stay Strong

Architecture plugin must include:

- DDD
- CQRS
- Clean Architecture
- Event-Driven Architecture
- Saga
- Outbox / Inbox
- CDC
- Microservice Governance
- API Governance
- ADR generation

Commands:

```text
/review-architecture
/generate-ddd
/generate-cqrs
/generate-saga
/generate-adr
```

---

# 28. Migration Checklist

## Repository

- [ ] Add `aidk.config.yaml`
- [ ] Add `core/`
- [ ] Add `plugins/`
- [ ] Add `adapters/`
- [ ] Add `marketplace/`
- [ ] Add `mcp/`
- [ ] Add `cli/`
- [ ] Add `docs/`
- [ ] Add `examples/`

## Plugin

- [ ] Add `.aidk-plugin/plugin.yaml`
- [ ] Add `skills/`
- [ ] Add `commands/`
- [ ] Add `agents/`
- [ ] Add `rules/`
- [ ] Add `checklists/`
- [ ] Add `templates/`
- [ ] Add `workflows/`
- [ ] Add optional `mcp/`

## Adapter

- [ ] Claude adapter
- [ ] Codex adapter
- [ ] Cursor adapter
- [ ] Antigravity adapter
- [ ] Copilot adapter
- [ ] Generic adapter

## CLI

- [ ] `aidk init`
- [ ] `aidk plugin list`
- [ ] `aidk plugin install`
- [ ] `aidk plugin remove`
- [ ] `aidk marketplace list`
- [ ] `aidk adapter generate`
- [ ] `aidk validate`

---

# 29. Final Recommended Structure After Migration

```text
ai-development-kit/
│
├── AGENTS.md
├── README.md
├── package.json
├── aidk.config.yaml
│
├── core/
│   ├── schemas/
│   ├── templates/
│   ├── loaders/
│   └── utils/
│
├── cli/
│   ├── index.ts
│   ├── commands/
│   ├── installers/
│   ├── generators/
│   └── validators/
│
├── plugins/
│   ├── architecture/
│   ├── backend/
│   ├── frontend/
│   ├── security/
│   ├── devops/
│   ├── documentation/
│   ├── data/
│   └── observability/
│
├── adapters/
│   ├── claude/
│   ├── codex/
│   ├── cursor/
│   ├── antigravity/
│   ├── copilot/
│   └── generic/
│
├── marketplace/
│   ├── registry.yaml
│   └── plugins/
│
├── mcp/
│   ├── registry.yaml
│   └── servers/
│
├── docs/
│   ├── getting-started.md
│   ├── plugin-authoring.md
│   ├── adapter-authoring.md
│   ├── migration-guide.md
│   └── examples.md
│
└── examples/
    ├── backend-service/
    ├── frontend-app/
    ├── fullstack-app/
    └── microservices-platform/
```

---

# 30. Final Recommendation

Build AIDK v1.0 as:

```text
Enterprise AI Engineering Kit
        =
Core Standard
        +
Plugin System
        +
IDE Adapters
        +
MCP Registry
        +
Governance Engine
```

Use this rule:

```text
AIDK is the canonical source.
Each AI IDE receives generated native files.
```

Recommended implementation order:

1. Build `plugin.yaml` schema.
2. Convert current skills into plugins.
3. Implement `AGENTS.md` generator.
4. Implement Cursor adapter.
5. Implement Codex adapter.
6. Implement Claude adapter.
7. Implement Copilot adapter.
8. Implement Antigravity adapter.
9. Add marketplace commands.
10. Add MCP registry.

This approach allows:

- Full kit installation.
- Single plugin installation.
- Multi-IDE compatibility.
- Future marketplace support.
- Strong enterprise governance.
