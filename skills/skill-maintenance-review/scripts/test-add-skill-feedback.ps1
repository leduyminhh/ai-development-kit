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

$scriptPath = Join-Path $PSScriptRoot 'add-skill-feedback.py'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-skill-feedback-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex') -Force | Out-Null

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[skill_upgrade]
enabled = true
feedbackPath = "audit/skill-feedback"
'@

    & python $scriptPath `
        --root $tempRoot `
        --agent-name 'java-analyze' `
        --skill-names 'java-analyze' `
        --outcome 'mixed' `
        --task-summary 'Review Spring payment flow' `
        --correct-notes 'Boundary review was useful' `
        --wrong-notes 'Missed transaction warning' `
        --missing-notes 'Need checklist for async retry' | Out-Null

    Assert-Equal 0 $LASTEXITCODE 'add-skill-feedback should exit successfully with valid input.'

    $feedbackDir = Join-Path $tempRoot 'audit/skill-feedback'
    $feedbackFiles = @(Get-ChildItem -LiteralPath $feedbackDir -Filter '*_skill-feedback.jsonl' -File)
    Assert-Equal 1 $feedbackFiles.Count 'add-skill-feedback should create one feedback file.'

    $entry = (Get-Content -LiteralPath $feedbackFiles[0].FullName -Raw | ConvertFrom-Json)
    Assert-Equal 'java-analyze' $entry.agentName 'Feedback entry should keep agent name.'
    Assert-Equal 'mixed' $entry.outcome 'Feedback entry should keep outcome.'
    Assert-Equal 'Review Spring payment flow' $entry.taskSummary 'Feedback entry should keep task summary.'
    Assert-Equal 'java-analyze' $entry.skillNames[0] 'Feedback entry should keep skill names.'
    Assert-Equal 'Boundary review was useful' $entry.correctNotes 'Feedback entry should keep correct notes.'
    Assert-Equal 'Missed transaction warning' $entry.wrongNotes 'Feedback entry should keep wrong notes.'
    Assert-Equal 'Need checklist for async retry' $entry.missingNotes 'Feedback entry should keep missing notes.'
    Assert-True (-not [string]::IsNullOrWhiteSpace($entry.timestamp)) 'Feedback entry should have timestamp.'

    & python $scriptPath `
        --root $tempRoot `
        --agent-name 'java-analyze' `
        --skill-names 'java-analyze' `
        --outcome 'correct' `
        --task-summary 'Review repository naming rules' `
        --correct-notes 'Detected metadata mismatch' | Out-Null

    Assert-Equal 0 $LASTEXITCODE 'add-skill-feedback should append successfully.'
    Assert-Equal 2 @(Get-Content -LiteralPath $feedbackFiles[0].FullName).Count 'add-skill-feedback should append one JSON line per call.'

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & python $scriptPath `
            --root $tempRoot `
            --agent-name 'java-analyze' `
            --skill-names 'java-analyze' `
            --outcome 'wrong' `
            --task-summary 'Missing notes case' 2>$null | Out-Null
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    Assert-Equal 1 $LASTEXITCODE 'add-skill-feedback should fail when no notes are provided.'

    Write-Output 'add-skill-feedback tests passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
