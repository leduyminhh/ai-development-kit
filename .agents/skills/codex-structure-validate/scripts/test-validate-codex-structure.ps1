param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../../../../')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$validator = Join-Path $Root '.agents/skills/codex-structure-validate/scripts/validate-codex-structure.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-validator-test-" + [guid]::NewGuid().ToString())
$emptyRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-validator-empty-test-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.agents/skills/new-agent') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.agents/skills/read-only-agent') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'workflows/workflow-skill-evolution-review') -Force | Out-Null
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

    Set-Content -LiteralPath (Join-Path $tempRoot '.agents/skills/new-agent/SKILL.md') -Encoding utf8 -Value @'
---
name: new-agent
description: New agent test skill.
---

# New Agent
'@

    Set-Content -LiteralPath (Join-Path $tempRoot '.agents/skills/read-only-agent/SKILL.md') -Encoding utf8 -Value @'
---
name: read-only-agent
description: Read-only agent test skill.
---

# Read Only Agent
'@

    Set-Content -LiteralPath (Join-Path $tempRoot 'workflows/workflow-skill-evolution-review/WORKFLOW.md') -Encoding utf8 -Value @'
---
name: workflow-skill-evolution-review
description: Test workflow wrapper for skill evolution review.
---

# Workflow Skill Evolution Review
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
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.agents/skills')) 'Validator -Fix should ensure skills root exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.agents/skills/new-agent/subagents')) 'Validator -Fix should ensure skill subagents exists.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.agents/skills/read-only-agent/subagents')) 'Validator -Fix should ensure read-only skill subagents exists.'
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

    Write-Output 'validate-codex-structure tests passed'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
    if (Test-Path -LiteralPath $emptyRoot) {
        Remove-Item -LiteralPath $emptyRoot -Recurse -Force
    }
}



