# Migration Specification: Existing Source -> AI IDE Plugins Platform

Version: 2.0.0
Target platform: `ai-engineering`
Goal: migrate the repository to a plugin-first platform where multiple
independent plugins can be installed into AI IDEs such as Codex, Claude, and
Cursor.

This migration intentionally makes AI IDE plugins the primary product surface.
MCP servers are optional runtime integrations, not the core architecture.

---

## 1. Target Architecture

```text
ai-engineering/
|-- core/                         # shared contracts, installer, resolver, validation
|-- plugins/                      # canonical installable AI IDE plugins
|-- adapters/                     # target-specific artifact generators
|   |-- codex/
|   |-- claude/
|   `-- cursor/
|-- mcp-servers/                  # optional runtime tool layer
|-- cli/                          # available, installed, install, update, remove
|-- docs/
|-- tests/
|-- package.json
`-- README.md
```

Canonical plugin source lives only under `plugins/<plugin-id>/`.
Generated IDE-specific files must be produced by `adapters/<target>/` logic.

---

## 2. Architecture Principles

```text
core        = shared contracts, installer, resolver, validation, AGENTS merge
plugins     = canonical plugin logic, commands, skills, agents, rules, templates
adapters    = Codex, Claude, Cursor artifact generation
mcp-servers = optional runtime tools when a plugin needs executable tool calls
cli         = available, installed, install, update, remove, validation, diagnostics
```

Rules:

- Do not make MCP servers mandatory for every plugin.
- Do not commit generated Codex, Claude, or Cursor artifacts inside canonical
  plugin folders.
- Do not duplicate plugin logic inside adapters.
- Do not keep `packs/` and `plugins/` active at the same time.
- Do not create placeholder README files only to keep folders alive.
- Empty plugin subfolders are allowed when they define an extension boundary.
- If an asset group is unused, declare it as `none` in `plugin.yaml`.

---

## 3. Canonical Plugin Structure

Each plugin must follow this structure:

```text
plugins/<plugin-id>/
|-- plugin.yaml
|-- commands/
|-- skills/
|-- agents/
|-- rules/
|-- templates/
|-- workflows/
`-- schemas/
```

Only create a `README.md` when it contains real maintained documentation.
Do not create README placeholder files under `commands/`, `skills/`,
`templates/`, `workflows/`, or `schemas/`.

Example:

```text
plugins/security/
|-- plugin.yaml
|-- commands/
|   `-- review-security.md
|-- skills/
|   `-- security-code-review/
|      `-- SKILL.md
|-- agents/
|-- rules/
|-- templates/
|-- workflows/
`-- schemas/
```

---

## 4. Plugin Manifest Standard

File:

```text
plugins/<plugin-id>/plugin.yaml
```

Template:

```yaml
apiVersion: ai-engineering.dev/v1alpha1
kind: AiIdePlugin

metadata:
  id: security
  name: Security Engineering
  version: 1.0.0
  description: Security review, scanning, and remediation workflows.

compatibility:
  platform: ">=1.0.0 <2.0.0"
  providers:
    codex: supported
    claude: supported
    cursor: supported

dependencies:
  required: none
  optional:
    - application
    - quality

assets:
  commands:
    - commands/review-security.md
  skills:
    - skills/security-code-review/SKILL.md
  agents: none
  rules: none
  templates: none
  workflows: none
  schemas: none

runtime:
  mcp:
    required: false
    server: security-mcp
```

Manifest rules:

- `metadata.id` must match the plugin directory name.
- `compatibility.providers` declares which AI IDE targets can be generated.
- `assets.*` must be either a list of relative files or `none`.
- `runtime.mcp.required: false` means the plugin can install without MCP.
- `runtime.mcp.required: true` is allowed only when the plugin cannot function
  without runtime tool calls.

---

## 5. Adapter Responsibilities

Adapters are the only layer that knows provider-specific file formats.

```text
adapters/codex/   -> generates Codex plugin/project artifacts
adapters/claude/  -> generates Claude artifacts
adapters/cursor/  -> generates Cursor artifacts
```

Adapter rules:

- Read canonical data from `plugins/<plugin-id>/plugin.yaml`.
- Read canonical commands, skills, agents, rules, templates, workflows, and
  schemas from the same plugin folder.
- Generate target-specific output during install or explicit generation.
- Do not require canonical plugin folders to contain `.codex-plugin`,
  `.claude-plugin`, or `.cursor-plugin` folders.
- Skip asset groups declared as `none`.

Expected target projections:

```text
Codex:
  AGENTS.md
  .agents/skills/
  .codex/agents/
  .codex/workflows/commands.md
  .codex/config.toml

Claude:
  CLAUDE.md
  .claude/commands/
  .claude/skills/
  .claude-plugin/plugin.json
  .mcp.json

Cursor:
  AGENTS.md
  .cursor/rules/
  .cursor/mcp.json
```

Global projections use `~/.codex/AGENTS.md`, `~/.agents/skills/`,
`~/.codex/agents/`, and `~/.codex/config.toml` for Codex;
`~/.claude/CLAUDE.md`, `~/.claude/skills/`, `~/.claude/commands/`, and
`~/.claude.json` for Claude; and `~/.cursor/mcp.json` for Cursor.

---

## 6. MCP Role

MCP is optional.

Use `mcp-servers/` only when a plugin needs external runtime behavior such as
database inspection, repository automation, local process execution, or
structured tool calls.

Plugin examples:

```yaml
runtime:
  mcp:
    required: false
    server: none
```

```yaml
runtime:
  mcp:
    required: true
    server: security-mcp
```

Validation must not fail just because a plugin has no MCP server.
Validation must fail when `required: true` references a missing server.

---

## 7. Source Migration Mapping

| Current source | New source | Decision |
|---|---|---|
| `packs/<id>/pack.yaml` | `plugins/<id>/plugin.yaml` | rename contract |
| `packs/<id>/commands/` | `plugins/<id>/commands/` | move |
| `packs/<id>/skills/` | `plugins/<id>/skills/` | move |
| `packs/<id>/templates/` | `plugins/<id>/templates/` | move |
| `packs/<id>/workflows/` | `plugins/<id>/workflows/` | move |
| `packs/<id>/schemas/` | `plugins/<id>/schemas/` | move |
| `adapters/codex/` | `adapters/codex/` | keep as generator source |
| `adapters/claude/` | `adapters/claude/` | keep as generator source |
| `adapters/cursor/` | `adapters/cursor/` | keep as generator source |
| `mcp-servers/<id>-mcp/` | `mcp-servers/<id>-mcp/` | keep only as optional runtime |
| `core/` | `core/` | keep shared contracts |
| root `agents/` | remove if empty | deprecated active root |
| root `commands/` | remove if empty | deprecated active root |

After migration, `packs/` must not remain an active source root.

---

## 8. Recommended Plugin List

```text
plugins/
|-- architecture
|-- application
|-- data
|-- security
|-- quality
|-- platform
`-- knowledge
```

This keeps the current domain model while changing the installable unit from
`pack` to `plugin`.

---

## 9. CLI Requirements

Required commands:

```bash
ai-engineering available
ai-engineering installed
ai-engineering install <plugin...> --target <codex|claude|cursor>
ai-engineering install --all --target codex,claude,cursor
ai-engineering update <plugin...>
ai-engineering update --all
ai-engineering remove <plugin...>
ai-engineering remove --all
```

Project scope is the default. Use `-g` or `--global` to install, update,
list, or remove plugins from global AI IDE settings.

Maintainer commands such as `init`, `doctor`, `check`, `validate`, `migrate`,
`build --all`, `artifact verify --all`, and `registry generate` remain
available but are not the primary user-facing surface.

Terminology rules:

- User-facing CLI output should say `plugin`, not `pack`.
- State files should use `installed-plugins.yaml`, not
  `installed-packs.yaml`.
- Backward-compatible reading of old `installed-packs.yaml` is allowed during
  migration, but new writes must use plugin terminology.

---

## 10. Validation Rules

`ai-engineering validate` must check:

```text
[ ] plugins/ exists
[ ] every plugin has plugin.yaml
[ ] metadata.id matches folder name
[ ] provider compatibility includes only supported targets
[ ] assets groups are either list values or none
[ ] listed asset files exist
[ ] adapter generators exist for codex, claude, cursor
[ ] required MCP servers exist only when runtime.mcp.required is true
[ ] core AGENTS template and baseline exist
[ ] deprecated active roots are absent: packs, skills, registry, schemas, scripts
[ ] no generated IDE artifact is committed inside canonical plugin source
```

---

## 11. Doctor Rules

`ai-engineering doctor` must check a target project:

```text
[ ] AGENTS.md exists or can be created
[ ] AI Engineering managed block is valid
[ ] .ai-engineering/ state exists after install
[ ] installed-plugins.yaml exists after install
[ ] lockfile.yaml records plugins and providers
[ ] selected provider artifacts exist
[ ] optional MCP config exists only when needed
[ ] user-owned files are preserved
```

---

## 12. Migration Execution Checklist

### Preparation

```text
[ ] create migration branch
[ ] run npm run validate
[ ] list current packs
[ ] classify current pack assets
[ ] identify generated README placeholder files
[ ] identify empty root agents/ and commands/
```

### Plugin root migration

```text
[ ] create plugins/
[ ] move packs/<id>/ to plugins/<id>/
[ ] rename pack.yaml to plugin.yaml
[ ] update manifests to kind: AiIdePlugin
[ ] convert missing asset groups to none
[ ] remove unused README placeholder files
[ ] remove packs/ after validation passes
```

### Core and CLI migration

```text
[ ] update loader to read plugins/
[ ] update resolver terminology from pack to plugin
[ ] update lifecycle state to installed-plugins.yaml
[ ] keep backward-compatible reads for installed-packs.yaml during migration
[ ] update validate command
[ ] update doctor command
[ ] update available/installed/check output labels
```

### Adapter migration

```text
[ ] update adapters to read plugin.yaml
[ ] generate Codex artifacts from adapters/codex
[ ] generate Claude artifacts from adapters/claude
[ ] generate Cursor artifacts from adapters/cursor
[ ] skip assets declared as none
[ ] keep generated provider artifacts out of plugins/
```

### Optional MCP migration

```text
[ ] map runtime.mcp.required for each plugin
[ ] keep existing mcp-servers only when referenced
[ ] do not fail plugins that declare server: none
[ ] validate required MCP references
```

### Documentation cleanup

```text
[ ] update README.md
[ ] update README_VI.md
[ ] update migration docs
[ ] update legacy review matrix
[ ] remove obsolete pack terminology from user-facing docs
```

### Verification

```powershell
npm test
npm run validate
npm run build:cli
```

Target-project smoke test:

```powershell
ai-engineering init
ai-engineering install platform security --target codex,claude,cursor
ai-engineering doctor
```

---

## 13. Rollback Plan

Before migration:

```bash
git checkout -b migrate/plugins-platform-v2
git tag before-ai-ide-plugin-migration
```

Rollback:

```bash
git reset --hard before-ai-ide-plugin-migration
```

Use rollback only with explicit approval because it discards local changes.

---

## 14. Definition of Done

Migration is complete only when:

```text
[ ] plugins/ is the canonical installable source root
[ ] packs/ is removed or archived as non-active legacy content
[ ] every plugin has plugin.yaml
[ ] every plugin can target Codex, Claude, and/or Cursor through adapters
[ ] no provider-specific generated artifact is required in plugin source
[ ] asset groups support none
[ ] MCP servers are optional
[ ] CLI and docs use plugin terminology
[ ] AGENTS.md install/merge flow still works
[ ] validate passes
[ ] doctor passes
[ ] install smoke test passes for codex, claude, cursor
[ ] README.md and README_VI.md are synchronized
```

Final architecture:

```text
Plugin  = canonical installable AI IDE capability
Adapter = target-specific artifact generator
Core    = shared installer, resolver, policy, validation
MCP     = optional runtime tool layer
CLI     = installation, validation, migration, and diagnostics
```
