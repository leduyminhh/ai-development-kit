param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$bootstrapSkill = Join-Path $Root 'skills/using-workflow-kit/SKILL.md'
$registry = Join-Path $Root '.codex/workflows/registry.toml'
$validator = Join-Path $Root 'scripts/validate-workflows.ps1'
$manifest = Join-Path $Root 'skills/manifest.toml'

Assert-True (Test-Path -LiteralPath $bootstrapSkill) 'using-workflow-kit skill should exist.'
Assert-True (Test-Path -LiteralPath $registry) 'Workflow registry should exist.'
Assert-True (Test-Path -LiteralPath $validator) 'Workflow validator should exist.'

$skillText = Get-Content -LiteralPath $bootstrapSkill -Raw
Assert-True ($skillText.Contains('name: using-workflow-kit')) 'Bootstrap skill should declare matching name.'
Assert-True ($skillText.Contains('.codex/workflows/registry.toml')) 'Bootstrap skill should reference workflow registry.'
Assert-True ($skillText.Contains('The workflow registry may be empty.')) 'Bootstrap skill should allow empty registry.'

$manifestText = Get-Content -LiteralPath $manifest -Raw
Assert-True ($manifestText.Contains('name = "using-workflow-kit"')) 'Manifest should register using-workflow-kit.'

$validationJson = & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $Root -Json
$validation = (@($validationJson) -join "`n") | ConvertFrom-Json
Assert-True ($validation.status -eq 'pass') 'Workflow validator should pass with empty registry.'
Assert-True (@($validation.findings | Where-Object { $_.message -match 'empty registry is valid' }).Count -eq 1) 'Workflow validator should explicitly allow empty registry.'

foreach ($pluginPath in @('.codex-plugin/plugin.json', '.claude-plugin/plugin.json', '.cursor-plugin/plugin.json')) {
    $fullPath = Join-Path $Root $pluginPath
    Assert-True (Test-Path -LiteralPath $fullPath) "Plugin adapter should exist: $pluginPath"
    $plugin = Get-Content -LiteralPath $fullPath -Raw | ConvertFrom-Json
    Assert-True ($plugin.name -eq 'codex-workflow-kit') "Plugin adapter should use codex-workflow-kit name: $pluginPath"
}

Write-Output 'workflow bootstrap tests passed.'
