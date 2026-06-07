param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$doctor = Join-Path $Root 'scripts/skill-doctor.ps1'
Assert-True (Test-Path -LiteralPath $doctor) "Missing skill doctor script: $doctor"

$json = powershell -ExecutionPolicy Bypass -File $doctor -Root $Root -Json
Assert-True ($LASTEXITCODE -eq 0) 'skill-doctor should exit successfully for this repository.'

$results = $json | ConvertFrom-Json
$expectedRuntimeSkillCount = @(
    Get-ChildItem -LiteralPath (Join-Path $Root 'skills') -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') }
).Count
Assert-True (@($results).Count -eq $expectedRuntimeSkillCount) 'skill-doctor should report all runtime skills.'

$security = @($results | Where-Object { $_.Skill -eq 'security-code-review' })[0]
Assert-True ($null -ne $security) 'skill-doctor should include security-code-review.'
Assert-True ($security.Score -ge 8) 'security-code-review should keep a strong quality score.'
Assert-True ($security.HasResources -eq $true) 'security-code-review should report owned resources.'
Assert-True ($security.RegisteredAgent -eq $true) 'security-code-review should report agent registry status.'

$defaultReportRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("skill-doctor-default-report-" + [guid]::NewGuid().ToString())
try {
    New-Item -ItemType Directory -Path (Join-Path $defaultReportRoot 'skills') -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $Root 'skills/SKILL_TEMPLATE.md') -Destination (Join-Path $defaultReportRoot 'skills/SKILL_TEMPLATE.md')
    Copy-Item -LiteralPath (Join-Path $Root 'skills/security-code-review') -Destination (Join-Path $defaultReportRoot 'skills/security-code-review') -Recurse
    New-Item -ItemType Directory -Path (Join-Path $defaultReportRoot '.codex') -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $Root 'skills/manifest.toml') -Destination (Join-Path $defaultReportRoot 'skills/manifest.toml')
    Copy-Item -LiteralPath (Join-Path $Root '.codex/config.toml') -Destination (Join-Path $defaultReportRoot '.codex/config.toml')
    Copy-Item -LiteralPath (Join-Path $Root '.codex/test-map.toml') -Destination (Join-Path $defaultReportRoot '.codex/test-map.toml')

    $defaultReportOutput = powershell -ExecutionPolicy Bypass -File $doctor -Root $defaultReportRoot
    Assert-True ($LASTEXITCODE -eq 0) 'skill-doctor should write a default report file for Markdown runs.'
    $defaultReports = @(Get-ChildItem -LiteralPath (Join-Path $defaultReportRoot 'reports/skills') -File)
    Assert-True ($defaultReports.Count -eq 1) 'skill-doctor should create exactly one default report file.'
    Assert-True ($defaultReports[0].Name -match '^\d{6}_\d{8}_skill-doctor\.md$') 'default report filename should match HHmmss_ddMMyyyy_skill-doctor.md.'
    Assert-True (($defaultReportOutput -join "`n").Contains('Skill doctor report written:')) 'default report run should print the written report path.'

    $stdoutOnlyOutput = powershell -ExecutionPolicy Bypass -File $doctor -Root $defaultReportRoot -NoReportFile
    Assert-True ($LASTEXITCODE -eq 0) 'skill-doctor should support stdout-only Markdown runs.'
    Assert-True (($stdoutOnlyOutput -join "`n").Contains('## Scoring Basis')) 'stdout-only Markdown run should still print the report body.'
    $defaultReportsAfterStdout = @(Get-ChildItem -LiteralPath (Join-Path $defaultReportRoot 'reports/skills') -File)
    Assert-True ($defaultReportsAfterStdout.Count -eq 1) 'stdout-only Markdown run should not create another default report file.'
} finally {
    if (Test-Path -LiteralPath $defaultReportRoot) {
        Remove-Item -LiteralPath $defaultReportRoot -Recurse -Force
    }
}

$reportPath = Join-Path ([System.IO.Path]::GetTempPath()) ("skill-doctor-report-" + [guid]::NewGuid().ToString() + ".md")
try {
    $reportOutput = powershell -ExecutionPolicy Bypass -File $doctor -Root $Root -OutputPath $reportPath
    Assert-True ($LASTEXITCODE -eq 0) 'skill-doctor should write a Markdown report file.'
    Assert-True (Test-Path -LiteralPath $reportPath) 'skill-doctor should create the requested report file.'
    $reportText = Get-Content -LiteralPath $reportPath -Raw
    Assert-True ($reportText.Contains('## Scoring Basis')) 'skill-doctor report should explain scoring basis.'
    Assert-True ($reportText.Contains('## Upgrade Plan')) 'skill-doctor report should include an upgrade plan section.'
    Assert-True (($reportOutput -join "`n").Contains('Skill doctor report written:')) 'skill-doctor should print the written report path.'
} finally {
    if (Test-Path -LiteralPath $reportPath) {
        Remove-Item -LiteralPath $reportPath -Force
    }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("skill-doctor-test-" + [guid]::NewGuid().ToString())
try {
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/weak-skill') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex') -Force | Out-Null
    [System.IO.File]::WriteAllText(
        (Join-Path $tempRoot 'skills/weak-skill/SKILL.md'),
@'
---
name: weak-skill
description: Test weak skill.
---

# Weak Skill

## Overview

Only overview exists.
'@,
        [System.Text.UTF8Encoding]::new($false)
    )

    $weakJson = powershell -ExecutionPolicy Bypass -File $doctor -Root $tempRoot -Json
    Assert-True ($LASTEXITCODE -eq 0) 'skill-doctor should run on a partial fixture repository.'
    $weak = ($weakJson | ConvertFrom-Json)[0]
    Assert-True ($weak.Skill -eq 'weak-skill') 'skill-doctor should report the weak fixture skill.'
    Assert-True ($weak.Score -lt 7) 'weak fixture should receive a low quality score.'
    Assert-True (@($weak.Missing).Count -gt 0) 'weak fixture should report missing checks.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}

Write-Output 'skill-doctor tests passed.'
