param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-Equal {
    param([object]$Expected, [object]$Actual, [string]$Message)
    if ($Expected -ne $Actual) {
        throw "$Message Expected '$Expected' but got '$Actual'."
    }
}

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) {
        throw $Message
    }
}

$scriptPath = Join-Path $PSScriptRoot 'run-skill-upgrade-cycle.py'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-skill-cycle-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.agents/skills/java-analyze') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot '.agents/skills/java-analyze/SKILL.md') -Encoding utf8 -Value @'
---
name: java-analyze
description: Use when analyzing Java backend architecture.
---

# Java Architect

## Architecture Defaults

- Put transaction boundaries in application services, not controllers.
'@
    Set-Content -LiteralPath (Join-Path $tempRoot '.agents/skills/manifest.toml') -Encoding utf8 -Value @'
[repo_structure]
skills_root = ".agents/skills"

[evolution.defaults]
enabled = true
reviewer = "skill-evolution-review"
mode = "hybrid"
min_pattern_count = 3
allow_fast_track = true
auto_apply = false

[[evolution.profile]]
skill = "java-analyze"
mode = "hybrid"
auto_apply = true
allowed_paths = [".agents/skills/java-analyze/SKILL.md"]
max_patch_lines = 40
validation_commands = ["powershell -ExecutionPolicy Bypass -File .agents/skills/java-analyze/scripts/test-architecture-skills.ps1"]
'@

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[validation]
validator_command = ""

[skill_upgrade]
enabled = false
intervalDays = 14
reviewerAgent = "skill-evolution-review"
feedbackPath = "audit/skill-feedback"
proposalPath = "audit/skill-upgrade"
statePath = "audit/skill-upgrade-state"
autoApply = false
requireApproval = true
'@

    $output = & python $scriptPath --root $tempRoot
    Assert-True (($output -join "`n") -match 'skill upgrade is disabled') 'Cycle should skip when skill upgrade is disabled.'
    $stateFiles = @(Get-ChildItem -LiteralPath (Join-Path $tempRoot 'audit/skill-upgrade-state') -Filter '*.jsonl' -File -ErrorAction SilentlyContinue)
    Assert-Equal 1 $stateFiles.Count 'Cycle should create one state log when disabled.'

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[validation]
validator_command = ""

[skill_upgrade]
enabled = true
intervalDays = 14
reviewerAgent = "skill-evolution-review"
feedbackPath = "audit/skill-feedback"
proposalPath = "audit/skill-upgrade"
statePath = "audit/skill-upgrade-state"
autoApply = false
requireApproval = true
'@

    $output = & python $scriptPath --root $tempRoot
    Assert-True (($output -join "`n") -match 'No skill feedback found') 'Cycle should skip when no feedback exists.'

    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'audit/skill-feedback') -Force | Out-Null
    Add-Content -LiteralPath (Join-Path $tempRoot 'audit/skill-feedback/20260417_skill-feedback.jsonl') -Encoding utf8 -Value '{"timestamp":"2026-04-17T09:00:00+07:00","agentName":"java-analyze","skillNames":["java-analyze"],"targetType":"skill","targetName":"java-analyze","outcome":"mixed","severity":"medium","reproducible":true,"evidenceKey":"missing-async-transaction-checklist","taskSummary":"Review Spring payment flow","correctNotes":"Boundary review was useful","wrongNotes":"Missed transaction warning","missingNotes":"Need checklist for async retry"}'

    $output = & python $scriptPath --root $tempRoot
    Assert-True (($output -join "`n") -match 'Created skill upgrade proposal') 'Cycle should create proposal when feedback exists.'

    $proposalFiles = @(Get-ChildItem -LiteralPath (Join-Path $tempRoot 'audit/skill-upgrade') -Filter '*.json' -File)
    Assert-Equal 1 $proposalFiles.Count 'Cycle should create one proposal file for one target agent.'
    $proposal = Get-Content -LiteralPath $proposalFiles[0].FullName -Raw | ConvertFrom-Json
    Assert-Equal 'java-analyze' $proposal.targetAgent 'Proposal should target the agent from feedback.'
    Assert-Equal 'pending' $proposal.approvalStatus 'Proposal should wait for approval.'
    Assert-Equal 1 $proposal.feedbackCount 'Proposal should count grouped feedback.'
    Assert-Equal 'insufficient-evidence' $proposal.recommendation 'Single anecdote should not trigger a real upgrade recommendation.'
    Assert-Equal 0 $proposal.patternCount 'Single anecdote should not count as a repeated pattern.'
    Assert-Equal 0 $proposal.proposedChanges.Count 'Single anecdote should not create actionable proposed changes.'

    Add-Content -LiteralPath (Join-Path $tempRoot 'audit/skill-feedback/20260418_skill-feedback.jsonl') -Encoding utf8 -Value '{"timestamp":"2026-04-18T09:00:00+07:00","agentName":"java-analyze","skillNames":["java-analyze"],"targetType":"skill","targetName":"java-analyze","outcome":"mixed","severity":"medium","reproducible":true,"evidenceKey":"missing-async-transaction-checklist","taskSummary":"Review order orchestration","correctNotes":"Boundary review was useful","wrongNotes":"Missed transaction warning","missingNotes":"Need checklist for async retry"}'
    Add-Content -LiteralPath (Join-Path $tempRoot 'audit/skill-feedback/20260419_skill-feedback.jsonl') -Encoding utf8 -Value '{"timestamp":"2026-04-19T09:00:00+07:00","agentName":"java-analyze","skillNames":["java-analyze"],"targetType":"skill","targetName":"java-analyze","outcome":"mixed","severity":"medium","reproducible":true,"evidenceKey":"missing-async-transaction-checklist","taskSummary":"Review invoice orchestration","correctNotes":"Boundary review was useful","wrongNotes":"Missed transaction warning","missingNotes":"Need checklist for async retry"}'

    Start-Sleep -Seconds 1
    $output = & python $scriptPath --root $tempRoot
    Assert-True (($output -join "`n") -match 'Created skill upgrade proposal') 'Cycle should still emit proposal output for repeated evidence.'

    $proposalFiles = @(Get-ChildItem -LiteralPath (Join-Path $tempRoot 'audit/skill-upgrade') -Filter '*.json' -File | Sort-Object LastWriteTime)
    Assert-Equal 2 $proposalFiles.Count 'Cycle should keep both proposal files when the same target is reviewed multiple times on the same day.'
    $proposal = Get-Content -LiteralPath $proposalFiles[-1].FullName -Raw | ConvertFrom-Json
    Assert-Equal 'safe-auto-apply' $proposal.recommendation 'Repeated evidence should recommend safe auto apply when scope is small.'
    Assert-Equal 3 $proposal.patternCount 'Repeated evidence should count matching patterns.'
    Assert-True ($proposal.proposedChanges.Count -ge 1) 'Repeated evidence should produce actionable proposed changes.'
    Assert-True ($proposal.validationCommands.Count -ge 1) 'Repeated evidence should attach validation commands from the skill evolution policy.'
    Assert-True ($proposal.updates.Count -ge 1) 'Repeated evidence for java-analyze should generate a concrete update patch.'
    Assert-Equal '.agents/skills/java-analyze/SKILL.md' $proposal.updates[0].path 'Generated patch should stay within the java-analyze skill scope.'
    Assert-True (($proposal.updates[0].content | Out-String) -match 'async, retry, transaction, and idempotency') 'Generated patch should add the async transaction checklist guidance.'

    Write-Output 'run-skill-upgrade-cycle tests passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}





