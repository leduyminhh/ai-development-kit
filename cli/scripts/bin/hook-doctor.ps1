param(
    [string]$Root = $(if (Test-Path (Join-Path $PSScriptRoot '../../src/index.ts')) {
        (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
    } else {
        (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
    }),
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

function New-HookDoctorCheck {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Evidence,
        [string]$Suggestion
    )

    [pscustomobject][ordered]@{
        name = $Name
        status = $Status
        evidence = $Evidence
        suggestion = $Suggestion
    }
}

function Test-HookConfigSection {
    param([string]$ConfigText, [string]$Section)

    return $ConfigText -match "(?m)^\[$([regex]::Escape($Section))\]\s*$"
}

function Test-HookProviderConflict {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }

    return @(Get-ChildItem -LiteralPath $Path -File -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -ne 'invoke-ai-hook.ps1'
    }).Count -gt 0
}

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$sourceMode = Test-Path -LiteralPath (Join-Path $resolvedRoot 'cli/scripts')
$scriptPrefix = if ($sourceMode) { 'cli/scripts' } else { 'scripts' }
$configPath = Join-Path $resolvedRoot $(if ($sourceMode) { 'adapters/codex/config.toml' } else { '.codex/config.toml' })
$configText = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw } else { '' }

$requiredFiles = @(
    "$scriptPrefix/bin/invoke-hook.ps1",
    "$scriptPrefix/hooks/core/hook-contract.ps1",
    "$scriptPrefix/hooks/core/hook-pipeline.ps1",
    "$scriptPrefix/hooks/transports/hook-cli-transport.ps1",
    "$scriptPrefix/hooks/transports/hook-http-client.ps1",
    "$scriptPrefix/hooks/adapters/codex-hook-adapter.ps1",
    "$scriptPrefix/hooks/adapters/claude-hook-adapter.ps1",
    "$scriptPrefix/bin/hook-service.ps1",
    "$scriptPrefix/bin/install-hooks.ps1"
)

$checks = New-Object 'System.Collections.Generic.List[object]'
$missingFiles = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $resolvedRoot $_)) })
$checks.Add((New-HookDoctorCheck `
    -Name 'runtime-files' `
    -Status $(if ($missingFiles.Count -eq 0) { 'pass' } else { 'fail' }) `
    -Evidence $(if ($missingFiles.Count -eq 0) { "requiredFiles=$($requiredFiles.Count)" } else { 'missing=' + ($missingFiles -join ', ') }) `
    -Suggestion 'Restore hook runtime scripts under scripts/hooks and scripts/bin/invoke-hook.ps1.'))

$installedMarkerPath = Join-Path $resolvedRoot '.ai-hooks/install.json'
$installedInvokePath = Join-Path $resolvedRoot '.ai-hooks/invoke-hook.ps1'
$installedMarker = $null
if (Test-Path -LiteralPath $installedMarkerPath) {
    try {
        $installedMarker = Get-Content -LiteralPath $installedMarkerPath -Raw | ConvertFrom-Json
    } catch {
        $installedMarker = $null
    }
}
$installedRuntimeOk = (Test-Path -LiteralPath $installedInvokePath) -and $null -ne $installedMarker -and [string]$installedMarker.schema -eq 'ai.hook.install.v1'
$checks.Add((New-HookDoctorCheck `
    -Name 'installed-runtime' `
    -Status $(if ($installedRuntimeOk) { 'pass' } elseif (Test-Path -LiteralPath (Join-Path $resolvedRoot '.ai-hooks')) { 'warn' } else { 'warn' }) `
    -Evidence "marker=$((Test-Path -LiteralPath $installedMarkerPath)); invoke=$((Test-Path -LiteralPath $installedInvokePath)); transport=$([string]$installedMarker.transport)" `
    -Suggestion 'Run scripts/bin/install-hooks.ps1 -TargetRoot <project> -Action install or repair when this is a target project.'))

$hasCore = Test-HookConfigSection -ConfigText $configText -Section 'hooks.core'
$hasHttp = Test-HookConfigSection -ConfigText $configText -Section 'hooks.http'
$checks.Add((New-HookDoctorCheck `
    -Name 'config-sections' `
    -Status $(if ($hasCore -and $hasHttp) { 'pass' } else { 'warn' }) `
    -Evidence "hooks.core=$hasCore; hooks.http=$hasHttp" `
    -Suggestion 'Run scripts/bin/install-hooks.ps1 or add hooks.core/hooks.http config sections.'))

$codexConflict = Test-HookProviderConflict -Path (Join-Path $resolvedRoot '.codex/hooks')
$claudeConflict = Test-HookProviderConflict -Path (Join-Path $resolvedRoot '.claude/hooks')
$checks.Add((New-HookDoctorCheck `
    -Name 'provider-coexistence' `
    -Status $(if ($codexConflict -or $claudeConflict) { 'warn' } else { 'pass' }) `
    -Evidence "codexCustomHooks=$codexConflict; claudeCustomHooks=$claudeConflict" `
    -Suggestion 'Installer will safe-skip provider shims when custom hook files already exist; use additive integration only after reviewing existing hooks.'))

$testMapPath = Join-Path $resolvedRoot $(if ($sourceMode) { 'adapters/codex/test-map.toml' } else { '.codex/test-map.toml' })
$testMapText = if (Test-Path -LiteralPath $testMapPath) { Get-Content -LiteralPath $testMapPath -Raw } else { '' }
$mapped = @("$scriptPrefix/tests/test-hook-core.ps1", "$scriptPrefix/tests/test-hook-service.ps1", "$scriptPrefix/tests/test-install-hooks.ps1") | Where-Object {
    $testMapText.Contains($_)
}
$checks.Add((New-HookDoctorCheck `
    -Name 'selected-tests' `
    -Status $(if ($mapped.Count -eq 3) { 'pass' } else { 'warn' }) `
    -Evidence "mapped=$($mapped.Count)/3" `
    -Suggestion 'Map hook core, service, and installer tests in .codex/test-map.toml.'))

$result = [pscustomobject][ordered]@{
    schema = 'ai.hook.doctor.v1'
    root = $resolvedRoot
    status = if (@($checks | Where-Object { $_.status -eq 'fail' }).Count -gt 0) { 'fail' } elseif (@($checks | Where-Object { $_.status -eq 'warn' }).Count -gt 0) { 'warn' } else { 'pass' }
    checks = $checks.ToArray()
}

if ($Json) {
    $result | ConvertTo-Json -Depth 6
    return
}

$lines = New-Object 'System.Collections.Generic.List[string]'
$lines.Add('# Hook Doctor')
$lines.Add('')
$lines.Add("Status: $($result.status)")
$lines.Add('')
$lines.Add('| Check | Status | Evidence | Suggestion |')
$lines.Add('|---|---|---|---|')
foreach ($check in $result.checks) {
    $lines.Add("| $($check.name) | $($check.status) | $($check.evidence) | $($check.suggestion) |")
}

Write-Output ($lines -join [Environment]::NewLine)
