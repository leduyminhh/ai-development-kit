# AI Engineering Platform

**Installable AI engineering plugins for Codex, Claude Code, Cursor, and other AI coding agents.**

Vietnamese version: [README_VI.md](README_VI.md)

AI Engineering Platform packages reusable skills, commands, validators, and provider adapters into project-local plugins. A project can install one capability area, such as backend or security, or install the full platform.

## What You Get

- **Plugins:** `architecture`, `backend`, `documentation`, `frontend`, `security`, `testing`.
- **Providers:** Codex, Claude Code, and Cursor projections from one canonical package contract.
- **Lifecycle:** install, list, outdated, update, remove, build, registry, and artifact verification through `ai-engineering`.
- **Compatibility:** the legacy AIDK PowerShell installer and `npx skills` flows remain available for direct skill installs.

## Requirements

- Node.js 20 or newer for the `ai-engineering` package.
- PowerShell for repository validators and legacy installer scripts on Windows.
- Git when installing from source or updating a linked checkout.

## Quick Start

Run the platform CLI:

```powershell
npx ai-engineering-platform --help
```

Install one plugin into the current project:

```powershell
ai-engineering plugin install backend
ai-engineering plugin install backend --provider codex,claude,cursor
```

Install the complete platform:

```powershell
ai-engineering install --all
```

Inspect installed plugins:

```powershell
ai-engineering plugin list
ai-engineering plugin outdated
```

Update installed plugins:

```powershell
ai-engineering plugin update backend
ai-engineering update --all --dry-run
```

Remove plugin-owned files:

```powershell
ai-engineering plugin remove backend
ai-engineering plugin remove backend --prune
ai-engineering remove --all
```

Managed-file drift stops install, update, and remove unless `--force` is explicit.

## Install From Source

Use this when developing the platform itself or testing local changes before publish:

```powershell
git clone https://github.com/leduyminhh/ai-engineering-platform
cd ai-engineering-platform
npm install
npm run build
npm link
```

After `npm link`, the `ai-engineering` command is available globally from the local checkout.

## Plugin Packages

| Plugin | Purpose |
|---|---|
| `architecture` | Architecture review, Onion Architecture guidance, shared contract design, and diagrams. |
| `backend` | Backend review and JVM/Spring-oriented engineering workflows. |
| `documentation` | Technical documentation, README sections, architecture notes, flow docs, and handoff notes. |
| `frontend` | React/frontend implementation workflows. |
| `security` | Source-first security review and security scan workflows. |
| `testing` | QA review, regression planning, and automated test validation. |

Each package lives under `packages/<plugin>/` and may include:

- `package.yaml` as the canonical package contract.
- `commands/*.md` as provider-neutral command definitions.
- referenced runtime skills from `skills/<name>/SKILL.md`.

## Distribution Model

`ai-engineering` builds immutable plugin artifacts under `dist/plugins/<plugin>/<version>/`.

```powershell
node platform/bin/ai-engineering.mjs validate --json
node platform/bin/ai-engineering.mjs build --all --json
node platform/bin/ai-engineering.mjs registry generate --json
node platform/bin/ai-engineering.mjs artifact verify --all --json
```

npm is the primary artifact source. GitHub Release archives mirror the same plugin contents and act as fallback.

## Compatibility: AIDK v1.1

The older AIDK installer still works for teams that want PowerShell-driven package projection instead of the `ai-engineering` lifecycle:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 -Action validate -Json

powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 `
  -Action install `
  -Package backend,security `
  -Provider codex,claude,cursor `
  -TargetRoot C:\path\to\project `
  -Json
```

Remove only state-owned generated artifacts:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/invoke-aidk.ps1 `
  -Action remove `
  -TargetRoot C:\path\to\project `
  -Json
```

This path writes `.aidk/install-state.json` after generated artifacts and shared audit hooks are installed successfully.

## Compatibility: Direct Skill Install

Use this when an agent only needs individual Markdown skills and does not need full plugin lifecycle management.

Set the repository slug:

```powershell
$repo = "leduyminhh/ai-development-kit"
```

Safe help commands:

```powershell
npx skills --help
npx skills -h
```

Do not append `--help` after `skills add <source>`; `skills add` treats `<source>` as the install target.

List available skills:

```powershell
npx skills add $repo --list
```

Install one skill:

```powershell
npx skills add $repo --skill security-code-review --agent codex -y
npx skills a $repo --skill security-code-review --agent codex -y
```

Install the default allowlist into Codex:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review using-workflow-kit --agent codex -y
```

Install one skill globally for Claude Code:

```powershell
npx skills add $repo --skill security-code-review --agent claude-code -g -y --copy
```

Expected Claude Code path:

```text
~\.claude\skills\security-code-review\SKILL.md
```

Install the default allowlist for Cursor:

```powershell
npx skills add $repo --skill agent-operating-rules diagram-generate doc-write git-workflow-design security-code-review using-workflow-kit --agent cursor -y --copy
```

Inspect target state:

```powershell
npx skills ls --agent codex
npx skills ls --agent claude-code
```

## Repository Layout

```text
ai-development-kit/
  packages/        # plugin package contracts and provider-neutral commands
  platform/        # ai-engineering CLI, lifecycle, artifact, registry, and tests
  registry/        # generated plugin registry metadata
  schemas/         # schema contracts
  skills/          # runtime Markdown skills
  scripts/         # validators, installers, and test runners
  .codex/          # local Codex agents, hooks, config, and test map
  .codex-plugin/   # Codex plugin adapter
  .claude-plugin/  # Claude Code plugin adapter
  .cursor-plugin/  # Cursor plugin adapter
```

## Validation

Run the main verification set:

```powershell
npm test
powershell -ExecutionPolicy Bypass -File scripts/test-selected.ps1 -FromGit
powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix
```

Run platform-specific checks:

```powershell
node platform/bin/ai-engineering.mjs validate --json
node platform/bin/ai-engineering.mjs build --all --json
node platform/bin/ai-engineering.mjs registry generate --json
node platform/bin/ai-engineering.mjs artifact verify --all --json
```

If `README.md` changes, update `README_VI.md` in the same change.

## Contributing

- Keep plugin package contracts under `packages/<plugin>/`.
- Keep runtime skill instructions under `skills/<name>/SKILL.md`.
- Register new PowerShell tests in `.codex/test-map.toml`.
- Run selected tests before committing.
- Do not commit generated `node_modules/`, `dist/`, `.ai-engineering/`, `*.tgz`, or temporary files.

## License

MIT.
