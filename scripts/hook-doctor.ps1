param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
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
$configPath = Join-Path $resolvedRoot '.codex/config.toml'
$configText = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw } else { '' }

$requiredFiles = @(
    'scripts/invoke-hook.ps1',
    'scripts/hooks/core/hook-contract.ps1',
    'scripts/hooks/core/hook-pipeline.ps1',
    'scripts/hooks/transports/hook-cli-transport.ps1',
    'scripts/hooks/transports/hook-http-client.ps1',
    'scripts/hooks/adapters/codex-hook-adapter.ps1',
    'scripts/hooks/adapters/claude-hook-adapter.ps1',
    'scripts/hook-service.ps1',
    'scripts/install-hooks.ps1'
)

$checks = New-Object 'System.Collections.Generic.List[object]'
$missingFiles = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath (Join-Path $resolvedRoot $_)) })
$checks.Add((New-HookDoctorCheck `
    -Name 'runtime-files' `
    -Status $(if ($missingFiles.Count -eq 0) { 'pass' } else { 'fail' }) `
    -Evidence $(if ($missingFiles.Count -eq 0) { "requiredFiles=$($requiredFiles.Count)" } else { 'missing=' + ($missingFiles -join ', ') }) `
    -Suggestion 'Restore hook runtime scripts under scripts/hooks and scripts/invoke-hook.ps1.'))

$hasCore = Test-HookConfigSection -ConfigText $configText -Section 'hooks.core'
$hasHttp = Test-HookConfigSection -ConfigText $configText -Section 'hooks.http'
$checks.Add((New-HookDoctorCheck `
    -Name 'config-sections' `
    -Status $(if ($hasCore -and $hasHttp) { 'pass' } else { 'warn' }) `
    -Evidence "hooks.core=$hasCore; hooks.http=$hasHttp" `
    -Suggestion 'Run scripts/install-hooks.ps1 or add hooks.core/hooks.http config sections.'))

$codexConflict = Test-HookProviderConflict -Path (Join-Path $resolvedRoot '.codex/hooks')
$claudeConflict = Test-HookProviderConflict -Path (Join-Path $resolvedRoot '.claude/hooks')
$checks.Add((New-HookDoctorCheck `
    -Name 'provider-coexistence' `
    -Status $(if ($codexConflict -or $claudeConflict) { 'warn' } else { 'pass' }) `
    -Evidence "codexCustomHooks=$codexConflict; claudeCustomHooks=$claudeConflict" `
    -Suggestion 'Installer will safe-skip provider shims when custom hook files already exist; use additive integration only after reviewing existing hooks.'))

$testMapPath = Join-Path $resolvedRoot '.codex/test-map.toml'
$testMapText = if (Test-Path -LiteralPath $testMapPath) { Get-Content -LiteralPath $testMapPath -Raw } else { '' }
$mapped = @('scripts/test-hook-core.ps1', 'scripts/test-hook-service.ps1', 'scripts/test-install-hooks.ps1') | Where-Object {
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
