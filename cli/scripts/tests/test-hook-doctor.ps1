param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path)

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

$doctor = Join-Path $Root 'cli/scripts/bin/hook-doctor.ps1'

$json = & powershell -NoProfile -ExecutionPolicy Bypass -File $doctor -Root $Root -Json
$result = (@($json) -join "`n") | ConvertFrom-Json
Assert-Equal 'ai.hook.doctor.v1' $result.schema 'hook-doctor should return a stable schema.'
Assert-True (@($result.checks).Count -ge 4) 'hook-doctor should report runtime, config, coexistence, and test checks.'
Assert-True (@($result.checks | Where-Object { $_.name -eq 'runtime-files' -and $_.status -eq 'pass' }).Count -eq 1) 'hook-doctor should pass runtime files in this repository.'
Assert-True (@($result.checks | Where-Object { $_.name -eq 'config-sections' -and $_.status -eq 'pass' }).Count -eq 1) 'hook-doctor should pass hook config sections in this repository.'
Assert-True (@($result.checks | Where-Object { $_.name -eq 'selected-tests' -and $_.status -eq 'pass' }).Count -eq 1) 'hook-doctor should pass selected-test mapping.'

$markdown = & powershell -NoProfile -ExecutionPolicy Bypass -File $doctor -Root $Root
Assert-True ((@($markdown) -join "`n").Contains('# Hook Doctor')) 'hook-doctor should print Markdown by default.'

$installedRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("hook-doctor-installed-" + [guid]::NewGuid().ToString())
try {
    $installer = Join-Path $Root 'cli/scripts/bin/install-hooks.ps1'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $installer -TargetRoot $installedRoot -Provider none | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $installedRoot 'scripts/bin') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $installedRoot 'scripts/tests') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $installedRoot 'scripts/hooks/core') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $installedRoot 'scripts/hooks/transports') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $installedRoot 'scripts/hooks/adapters') -Force | Out-Null
    foreach ($file in @(
        'scripts/bin/invoke-hook.ps1',
        'scripts/hooks/core/hook-contract.ps1',
        'scripts/hooks/core/hook-pipeline.ps1',
        'scripts/hooks/transports/hook-cli-transport.ps1',
        'scripts/hooks/transports/hook-http-client.ps1',
        'scripts/hooks/adapters/codex-hook-adapter.ps1',
        'scripts/hooks/adapters/claude-hook-adapter.ps1',
        'scripts/bin/hook-service.ps1',
        'scripts/bin/install-hooks.ps1'
    )) {
        Set-Content -LiteralPath (Join-Path $installedRoot $file) -Value '# placeholder' -Encoding utf8
    }
    New-Item -ItemType Directory -Path (Join-Path $installedRoot '.codex') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $installedRoot '.codex/test-map.toml') -Value @'
commands = [
  "powershell -File scripts/tests/test-hook-core.ps1",
  "powershell -File scripts/tests/test-hook-service.ps1",
  "powershell -File scripts/tests/test-install-hooks.ps1"
]
'@ -Encoding utf8

    $installedJson = & powershell -NoProfile -ExecutionPolicy Bypass -File $doctor -Root $installedRoot -Json
    $installed = (@($installedJson) -join "`n") | ConvertFrom-Json
    Assert-True (@($installed.checks | Where-Object { $_.name -eq 'installed-runtime' -and $_.status -eq 'pass' }).Count -eq 1) 'hook-doctor should pass installed runtime when marker and invoke script exist.'
} finally {
    if (Test-Path -LiteralPath $installedRoot) {
        Remove-Item -LiteralPath $installedRoot -Recurse -Force
    }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("hook-doctor-" + [guid]::NewGuid().ToString())
try {
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex/hooks') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.claude/hooks') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'scripts/bin') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'scripts/tests') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'scripts/hooks/core') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'scripts/hooks/transports') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'scripts/hooks/adapters') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex') -Force | Out-Null
    foreach ($file in @(
        'scripts/bin/invoke-hook.ps1',
        'scripts/hooks/core/hook-contract.ps1',
        'scripts/hooks/core/hook-pipeline.ps1',
        'scripts/hooks/transports/hook-cli-transport.ps1',
        'scripts/hooks/transports/hook-http-client.ps1',
        'scripts/hooks/adapters/codex-hook-adapter.ps1',
        'scripts/hooks/adapters/claude-hook-adapter.ps1',
        'scripts/bin/hook-service.ps1',
        'scripts/bin/install-hooks.ps1'
    )) {
        Set-Content -LiteralPath (Join-Path $tempRoot $file) -Value '# placeholder' -Encoding utf8
    }
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/hooks/custom.ps1') -Value '# custom hook' -Encoding utf8
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Value @'
[hooks.core]
enabled = true

[hooks.http]
url = "http://127.0.0.1:42890/v1/events"
'@ -Encoding utf8
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/test-map.toml') -Value @'
commands = [
  "powershell -File scripts/tests/test-hook-core.ps1",
  "powershell -File scripts/tests/test-hook-service.ps1",
  "powershell -File scripts/tests/test-install-hooks.ps1"
]
'@ -Encoding utf8

    $conflictJson = & powershell -NoProfile -ExecutionPolicy Bypass -File $doctor -Root $tempRoot -Json
    $conflict = (@($conflictJson) -join "`n") | ConvertFrom-Json
    Assert-Equal 'warn' $conflict.status 'hook-doctor should warn when provider custom hooks exist.'
    Assert-True (@($conflict.checks | Where-Object { $_.name -eq 'provider-coexistence' -and $_.status -eq 'warn' }).Count -eq 1) 'hook-doctor should report provider coexistence warnings.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}

Write-Output 'hook-doctor tests passed.'
