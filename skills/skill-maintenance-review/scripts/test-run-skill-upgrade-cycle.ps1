param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path)

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

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[validation]
validator_command = ""

[skill_upgrade]
enabled = false
intervalDays = 14
reviewerAgent = "skill-maintenance-review"
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
reviewerAgent = "skill-maintenance-review"
feedbackPath = "audit/skill-feedback"
proposalPath = "audit/skill-upgrade"
statePath = "audit/skill-upgrade-state"
autoApply = false
requireApproval = true
'@

    $output = & python $scriptPath --root $tempRoot
    Assert-True (($output -join "`n") -match 'No skill feedback found') 'Cycle should skip when no feedback exists.'

    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'audit/skill-feedback') -Force | Out-Null
    Add-Content -LiteralPath (Join-Path $tempRoot 'audit/skill-feedback/20260417_skill-feedback.jsonl') -Encoding utf8 -Value '{"timestamp":"2026-04-17T09:00:00+07:00","agentName":"java-analyze","skillNames":["java-analyze"],"outcome":"mixed","taskSummary":"Review Spring payment flow","correctNotes":"Boundary review was useful","wrongNotes":"Missed transaction warning","missingNotes":"Need checklist for async retry"}'

    $output = & python $scriptPath --root $tempRoot
    Assert-True (($output -join "`n") -match 'Created skill upgrade proposal') 'Cycle should create proposal when feedback exists.'

    $proposalFiles = @(Get-ChildItem -LiteralPath (Join-Path $tempRoot 'audit/skill-upgrade') -Filter '*.json' -File)
    Assert-Equal 1 $proposalFiles.Count 'Cycle should create one proposal file for one target agent.'
    $proposal = Get-Content -LiteralPath $proposalFiles[0].FullName -Raw | ConvertFrom-Json
    Assert-Equal 'java-analyze' $proposal.targetAgent 'Proposal should target the agent from feedback.'
    Assert-Equal 'pending' $proposal.approvalStatus 'Proposal should wait for approval.'
    Assert-Equal 1 $proposal.feedbackCount 'Proposal should count grouped feedback.'
    Assert-True ($proposal.proposedChanges.Count -ge 1) 'Proposal should contain at least one proposed change.'

    Write-Output 'run-skill-upgrade-cycle tests passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
