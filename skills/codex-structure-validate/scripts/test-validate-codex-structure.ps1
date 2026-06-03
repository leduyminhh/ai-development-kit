param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../../../')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$validator = Join-Path $Root 'skills/codex-structure-validate/scripts/validate-codex-structure.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-validator-test-" + [guid]::NewGuid().ToString())
$emptyRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-validator-empty-test-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/new-agent') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/read-only-agent') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'workflows/workflow-java-architecture-review') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex/agents') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex/agent-metadata') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'docs/ignored-skill') -Force | Out-Null

    Set-Content -LiteralPath (Join-Path $tempRoot 'AGENTS.md') -Encoding utf8 -Value '# Test Agents'
    Set-Content -LiteralPath (Join-Path $tempRoot 'docs/ignored-skill/SKILL.md') -Encoding utf8 -Value 'not valid skill frontmatter'
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[environment]
network_access = true

[scan.policy]
skipProtectedPathsByDefault = true
protectedScanPaths = ["docs/", "reports/"]
requireExplicitAllow = true

[agent_registry.existing-agent]
path = ".codex/agents/existing-agent.toml"
read_only = false
enabled = true
hooks_project_enabled = false
'@

    [System.IO.File]::WriteAllText(
        (Join-Path $tempRoot 'skills/new-agent/SKILL.md'),
@'
---
name: new-agent
description: New agent test skill.
---

# New Agent

## Overview

Fixture skill used to validate a generated repository.

## When to Use

Use when the validator test needs a valid writable skill.

## Core Process

1. Read the fixture input.
2. Validate expected scaffold behavior.
3. Report deterministic test evidence.

## Examples

- Validate a skill folder with matching metadata.
- Validate generated subagent scaffolding.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "A fixture can be incomplete." | Valid fixtures must represent production rules. |
| "Only frontmatter matters." | Flow sections are part of the skill contract. |

## Red Flags

- The fixture omits required headings.
- The fixture name drifts from its folder.
- The fixture creates unrelated files.

## Verification

- Frontmatter is valid.
- Required sections are present.
- Validator exits successfully.

## Resource Map

- None; this fixture has no owned resources.

## Subagent Prompts

- None; this fixture has no subagent prompts.

## Scripts

- None; this fixture has no owned scripts.

## Output Format

```text
validator fixture result
```

## Notes

- Keep this fixture aligned with skills/SKILL_TEMPLATE.md.
'@,
        [System.Text.UTF8Encoding]::new($false)
    )

    [System.IO.File]::WriteAllText(
        (Join-Path $tempRoot 'skills/read-only-agent/SKILL.md'),
@'
---
name: read-only-agent
description: Read-only agent test skill.
---

# Read Only Agent

## Overview

Fixture skill used to validate read-only agent registration.

## When to Use

Use when the validator test needs a valid read-only skill.

## Core Process

1. Read the read-only fixture input.
2. Validate metadata generation.
3. Confirm registry synchronization.

## Examples

- Validate read-only metadata.
- Validate generated `.codex/agent-metadata` entries.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "Read-only fixtures need fewer rules." | Read-only skills still need the full skill contract. |
| "Metadata sync is enough." | Skill structure must also pass. |

## Red Flags

- Read-only state is not reflected in metadata.
- Required headings are missing.
- Registry sync changes unrelated config.

## Verification

- Read-only metadata is generated.
- Required sections are present.
- Validator exits successfully.

## Resource Map

- None; this fixture has no owned resources.

## Subagent Prompts

- None; this fixture has no subagent prompts.

## Scripts

- None; this fixture has no owned scripts.

## Output Format

```text
read-only validator fixture result
```

## Notes

- Keep this fixture aligned with skills/SKILL_TEMPLATE.md.
'@,
        [System.Text.UTF8Encoding]::new($false)
    )

    Set-Content -LiteralPath (Join-Path $tempRoot 'workflows/workflow-java-architecture-review/WORKFLOW.md') -Encoding utf8 -Value @'
---
name: workflow-java-architecture-review
description: Test workflow wrapper for java architecture review.
---

# Workflow Java Architecture Review
'@

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/agents/new-agent.toml') -Encoding utf8 -Value @'
name = "new-agent"
description = "New test agent"

developer_instructions = """
Use the new-agent skill.
"""
'@

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/agents/read-only-agent.toml') -Encoding utf8 -Value @'
name = "read-only-agent"
description = "Read-only test agent"
model = "gpt-5.4"
sandbox_mode = "read-only"

developer_instructions = """
Use the read-only-agent skill.
"""
'@
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/agent-metadata/new-agent.toml') -Encoding utf8 -Value @'
name = "new-agent"
summary = "New agent metadata"
read_only = false
hooks_project_enabled = true
'@

    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Fix | Out-Null
    Assert-True ($LASTEXITCODE -eq 0) 'Validator with -Fix should exit 0 for valid generated repo.'

    $scanOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot
    Assert-True ($LASTEXITCODE -eq 0) 'Validator should skip protected docs by default and exit 0.'
    Assert-True (-not (($scanOutput -join "`n").Contains('docs/ignored-skill/SKILL.md'))) 'Validator should not scan protected docs by default.'

    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -IncludeProtectedPaths | Out-Null
    Assert-True ($LASTEXITCODE -eq 1) 'Validator should scan protected docs only when explicitly allowed.'

    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/agents')) 'Validator -Fix should ensure Step 1 .codex/agents exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/agent-metadata')) 'Validator -Fix should ensure agent metadata root exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/config.toml')) 'Validator -Fix should ensure Step 2 .codex/config.toml exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/hooks')) 'Validator -Fix should ensure Step 3 .codex/hooks exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/hooks/.gitkeep')) 'Validator -Fix should make empty hooks scaffold trackable.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/mcp')) 'Validator -Fix should ensure Step 4 .codex/mcp exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/mcp/.gitkeep')) 'Validator -Fix should make empty MCP scaffold trackable.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot 'skills')) 'Validator -Fix should ensure skills root exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot 'skills/SKILL_TEMPLATE.md')) 'Validator -Fix should create the canonical skill template.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot 'skills/new-agent/subagents')) 'Validator -Fix should ensure skill subagents exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot 'skills/read-only-agent/subagents')) 'Validator -Fix should ensure read-only skill subagents exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/agent-metadata/read-only-agent.toml')) 'Validator -Fix should create missing metadata from the read-only agent entry.'

    $config = Get-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Raw
    Assert-True ($config.Contains('[agent_registry.existing-agent]')) 'Existing agent registration should be preserved under agent_registry.'
    Assert-True ($config.Contains('[agent_registry.new-agent]')) 'New agent should be registered in config.'
    Assert-True ($config.Contains('path = ".codex/agents/new-agent.toml"')) 'New agent path should be synced.'
    Assert-True ($config.Contains('[agent_registry.read-only-agent]')) 'Read-only agent should be registered in config.'
    Assert-True ($config.Contains('path = ".codex/agents/read-only-agent.toml"')) 'Read-only agent path should be synced.'
    Assert-True ($config.Contains('hooks_project_enabled = true')) 'Validator should sync hooks_project_enabled from agent metadata.'
    Assert-True ($config.Contains('hooks_project_enabled = false')) 'Validator should sync hooks_project_enabled = false by default when metadata does not override it.'
    Assert-True ($config.Contains("read_only = true`r`nenabled = true") -or $config.Contains("read_only = true`nenabled = true")) 'Read-only agent should be synced as read_only true.'
    Assert-True ($config.Contains("read_only = false`r`nenabled = true") -or $config.Contains("read_only = false`nenabled = true")) 'Writable agent should be synced as read_only false.'

    $generatedMetadata = Get-Content -LiteralPath (Join-Path $tempRoot '.codex/agent-metadata/read-only-agent.toml') -Raw
    Assert-True ($generatedMetadata.Contains('name = "read-only-agent"')) 'Generated metadata should declare the agent name.'
    Assert-True ($generatedMetadata.Contains('read_only = true')) 'Generated metadata should persist read-only state.'

    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/legacy-metadata-agent/metadata') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/bom-agent') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/bad_skill') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/invalid-skill-name') -Force | Out-Null

    [System.IO.File]::WriteAllText(
        (Join-Path $tempRoot 'skills/legacy-metadata-agent/SKILL.md'),
@'
---
name: legacy-metadata-agent
description: Legacy metadata path test skill.
---

# Legacy Metadata Agent
'@,
        [System.Text.UTF8Encoding]::new($false)
    )

    [System.IO.File]::WriteAllText(
        (Join-Path $tempRoot 'skills/legacy-metadata-agent/metadata/openai.yaml'),
@'
interface:
  display_name: "Legacy Metadata Agent"
  short_description: "Legacy metadata path test"
  default_prompt: "Use $legacy-metadata-agent to verify metadata path validation."
'@,
        [System.Text.UTF8Encoding]::new($false)
    )

    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/bom-agent/SKILL.md') -Encoding utf8 -Value @'
---
name: bom-agent
description: BOM test skill.
---

# BOM Agent
'@

    [System.IO.File]::WriteAllText(
        (Join-Path $tempRoot 'skills/bad_skill/SKILL.md'),
@'
---
name: bad-skill
description: Skill directory mismatch test.
---

# Bad Skill
'@,
        [System.Text.UTF8Encoding]::new($false)
    )

    [System.IO.File]::WriteAllText(
        (Join-Path $tempRoot 'skills/invalid-skill-name/SKILL.md'),
@'
---
name: Bad_Skill
description: Bad skill name format test.
---

# Invalid Skill Name
'@,
        [System.Text.UTF8Encoding]::new($false)
    )

    $legacyMetadataOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot
    Assert-True ($LASTEXITCODE -eq 1) 'Validator should fail when a skill still uses metadata/openai.yaml or a BOM-prefixed SKILL.md.'
    $legacyMetadataText = $legacyMetadataOutput -join "`n"
    Assert-True ($legacyMetadataText.Contains('metadata/openai.yaml')) 'Validator should report legacy metadata/openai.yaml usage.'
    Assert-True ($legacyMetadataText.Contains('UTF-8 BOM')) 'Validator should report UTF-8 BOM-prefixed skill files.'
    Assert-True ($legacyMetadataText.Contains('Skill name must be 1-64 lowercase alphanumeric')) 'Validator should report invalid skill name format.'
    Assert-True ($legacyMetadataText.Contains('must match directory')) 'Validator should report skill name and directory mismatch.'

    New-Item -ItemType Directory -Path $emptyRoot -Force | Out-Null
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $emptyRoot -Fix | Out-Null
    Assert-True ($LASTEXITCODE -eq 0) 'Validator -Fix should exit 0 for an empty repo scaffold.'
    $emptyConfigPath = Join-Path $emptyRoot '.codex/config.toml'
    Assert-True (Test-Path -LiteralPath $emptyConfigPath) 'Validator -Fix should create missing .codex/config.toml.'
    $emptyConfig = Get-Content -LiteralPath $emptyConfigPath -Raw
    Assert-True ($emptyConfig.Contains('[environment]')) 'Generated config should include environment section.'
    Assert-True ($emptyConfig.Contains('[validation]')) 'Generated config should include validation section.'
    Assert-True ($emptyConfig.Contains('[hooks.project]')) 'Generated config should include project hooks section.'
    Assert-True ($emptyConfig.Contains('[output.file]')) 'Generated config should include output file section.'
    Assert-True ($emptyConfig.Contains('[output.file.extensionsBySubpath]')) 'Generated config should include output extension mapping.'
    Assert-True ($emptyConfig.Contains('"docs/diagram" = "puml"')) 'Generated config should map docs/diagram to puml.'
    Assert-True ($emptyConfig.Contains('"reports/audit" = "log"')) 'Generated config should map reports/audit to log.'
    Assert-True ($emptyConfig.Contains('host = "127.0.0.1"')) 'Generated config should include hook service host.'
    Assert-True ($emptyConfig.Contains('port = 42890')) 'Generated config should include hook service port.'
    Assert-True ($emptyConfig.Contains('path = "reports/audit"')) 'Generated config should write project hook logs into reports/audit.'
    Assert-True ($emptyConfig.Contains('runtimePath = "reports/audit/runtime"')) 'Generated config should write hook runtime files into reports/audit/runtime.'
    Assert-True ($emptyConfig.Contains('agentHook = ".codex/hooks/log-agent-event.ps1"')) 'Generated config should point to the agent hook wrapper.'
    Assert-True ($emptyConfig.Contains('reloadOnConfigChange = true')) 'Generated config should enable hook config auto reload.'
    Assert-True ($emptyConfig.Contains('[diagram.writer]')) 'Generated config should include diagram writer section.'
    Assert-True (Test-Path -LiteralPath (Join-Path $emptyRoot '.codex/agent-metadata')) 'Validator -Fix should scaffold the agent metadata root for empty repos.'
    Assert-True (Test-Path -LiteralPath (Join-Path $emptyRoot '.codex/agent-metadata/.gitkeep')) 'Validator -Fix should make empty agent metadata scaffold trackable.'
    Assert-True (Test-Path -LiteralPath (Join-Path $emptyRoot 'skills/SKILL_TEMPLATE.md')) 'Validator -Fix should create the skill template for empty repos.'

    Write-Output 'validate-codex-structure tests passed'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
    if (Test-Path -LiteralPath $emptyRoot) {
        Remove-Item -LiteralPath $emptyRoot -Recurse -Force
    }
}



