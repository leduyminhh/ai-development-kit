param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Equal {
    param([object]$Expected, [object]$Actual, [string]$Message)
    if ($Expected -ne $Actual) {
        throw "$Message Expected=[$Expected] Actual=[$Actual]"
    }
}

$installer = Join-Path $Root 'scripts/install-hooks.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-install-hooks-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

    $dryRunTarget = Join-Path $tempRoot 'dry-run-project'
    $dryRunOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $installer `
        -TargetRoot $dryRunTarget `
        -Provider all `
        -Transport http `
        -DryRun
    $plainDryRunOutput = @($dryRunOutput) -join "`n"
    Assert-True ($plainDryRunOutput.Contains('"status":  "planned"') -or $plainDryRunOutput.Contains('"status": "planned"')) 'Dry-run install should report planned actions.'
    Assert-True (-not (Test-Path -LiteralPath $dryRunTarget)) 'Dry-run install should not create target files.'

    $cleanTarget = Join-Path $tempRoot 'clean-project'
    $cleanOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $installer `
        -TargetRoot $cleanTarget `
        -Provider all `
        -Transport http `
        -Mode observe `
        -HttpUrl 'http://hooks.example.test/v1/events' `
        -SharedTokenEnv 'AI_HOOK_SHARED_TOKEN'
    $cleanResults = @((@($cleanOutput) -join "`n") | ConvertFrom-Json)

    Assert-True (Test-Path -LiteralPath (Join-Path $cleanTarget '.ai-hooks/invoke-hook.ps1')) 'Installer should copy hook runtime invoke script.'
    Assert-True (Test-Path -LiteralPath (Join-Path $cleanTarget '.ai-hooks/install.json')) 'Installer should write install marker.'
    Assert-True (Test-Path -LiteralPath (Join-Path $cleanTarget '.ai-hooks/hooks/core/hook-contract.ps1')) 'Installer should copy hook core scripts.'
    Assert-True (Test-Path -LiteralPath (Join-Path $cleanTarget '.codex/hooks/invoke-ai-hook.ps1')) 'Installer should create Codex provider shim for clean target.'
    Assert-True (Test-Path -LiteralPath (Join-Path $cleanTarget '.claude/hooks/invoke-ai-hook.ps1')) 'Installer should create Claude provider shim for clean target.'

    $cleanConfig = Get-Content -LiteralPath (Join-Path $cleanTarget '.codex/config.toml') -Raw
    Assert-True ($cleanConfig.Contains('[hooks.core]')) 'Installer should append hooks.core config.'
    Assert-True ($cleanConfig.Contains('transport = "http"')) 'Installer should preserve selected transport.'
    Assert-True ($cleanConfig.Contains('[hooks.http]')) 'Installer should append hooks.http config.'
    Assert-True ($cleanConfig.Contains('url = "http://hooks.example.test/v1/events"')) 'Installer should preserve selected HTTP URL.'
    Assert-True ($cleanConfig.Contains('sharedTokenEnv = "AI_HOOK_SHARED_TOKEN"')) 'Installer should preserve selected token env name.'
    $cleanConfigLines = @($cleanConfig -split '\r?\n' | ForEach-Object { $_.Trim() })
    Assert-Equal 1 @(($cleanConfigLines | Where-Object { $_ -eq '[hooks.core]' })).Count 'Installer should add hooks.core once.'
    Assert-Equal 1 @(($cleanConfigLines | Where-Object { $_ -eq '[hooks.http]' })).Count 'Installer should add hooks.http once.'

    $conflictTarget = Join-Path $tempRoot 'conflict-project'
    New-Item -ItemType Directory -Path (Join-Path $conflictTarget '.codex/hooks') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $conflictTarget '.claude/hooks') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $conflictTarget '.codex/hooks/existing.ps1') -Value '# codex custom hook' -Encoding utf8
    Set-Content -LiteralPath (Join-Path $conflictTarget '.claude/hooks/existing.ps1') -Value '# claude custom hook' -Encoding utf8
    New-Item -ItemType Directory -Path (Join-Path $conflictTarget '.codex') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $conflictTarget '.codex/config.toml') -Value @'
[hooks.core]
enabled = true
mode = "warn"
transport = "cli"
timeoutMs = 999
failureMode = "abstain"

[hooks.http]
url = "http://existing.example.test/v1/events"
sharedTokenEnv = ""
teamId = ""
projectId = ""
clientName = ""
maxRequestBytes = 123
'@ -Encoding utf8

    $conflictOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $installer -TargetRoot $conflictTarget -Provider all
    $plainConflictOutput = @($conflictOutput) -join "`n"
    Assert-True ($plainConflictOutput.Contains('"status":  "skipped"') -or $plainConflictOutput.Contains('"status": "skipped"')) 'Installer should report skipped entries for existing hooks/config.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $conflictTarget '.codex/hooks/invoke-ai-hook.ps1'))) 'Installer should not add Codex shim over custom hook.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $conflictTarget '.claude/hooks/invoke-ai-hook.ps1'))) 'Installer should not add Claude shim over custom hook.'

    $conflictConfig = Get-Content -LiteralPath (Join-Path $conflictTarget '.codex/config.toml') -Raw
    Assert-True ($conflictConfig.Contains('mode = "warn"')) 'Installer should preserve existing hooks.core config.'
    Assert-True ($conflictConfig.Contains('maxRequestBytes = 123')) 'Installer should preserve existing hooks.http config.'

    $uninstallOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $installer -TargetRoot $cleanTarget -Action uninstall -Provider all
    $plainUninstallOutput = @($uninstallOutput) -join "`n"
    Assert-True ($plainUninstallOutput.Contains('"status":  "removed"') -or $plainUninstallOutput.Contains('"status": "removed"')) 'Uninstall should report removed runtime and shims.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $cleanTarget '.ai-hooks'))) 'Uninstall should remove hook runtime.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $cleanTarget '.codex/hooks/invoke-ai-hook.ps1'))) 'Uninstall should remove Codex provider shim.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $cleanTarget '.claude/hooks/invoke-ai-hook.ps1'))) 'Uninstall should remove Claude provider shim.'
    Assert-True (Test-Path -LiteralPath (Join-Path $cleanTarget '.codex/config.toml')) 'Uninstall should preserve config file.'

    Write-Output 'install-hooks tests passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
