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

$scriptPath = Join-Path $PSScriptRoot 'apply-skill-upgrade-proposal.py'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-skill-apply-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.agents/skills/demo-skill') -Force | Out-Null

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[validation]
validator_command = ""

[skill_upgrade]
statePath = "audit/skill-upgrade-state"
'@

    Set-Content -LiteralPath (Join-Path $tempRoot '.agents/skills/demo-skill/SKILL.md') -Encoding utf8 -Value "# Old content"

    $pendingProposal = Join-Path $tempRoot 'pending-proposal.json'
    Set-Content -LiteralPath $pendingProposal -Encoding utf8 -Value @'
{
  "approvalStatus": "pending",
  "updates": []
}
'@

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & python $scriptPath --root $tempRoot --proposal-file $pendingProposal 2>$null | Out-Null
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Assert-Equal 1 $LASTEXITCODE 'Apply should fail when proposal is not approved.'

    $badScopeProposal = Join-Path $tempRoot 'bad-scope-proposal.json'
    Set-Content -LiteralPath $badScopeProposal -Encoding utf8 -Value @'
{
  "approvalStatus": "approved",
  "updates": [
    {
      "path": "../outside.txt",
      "content": "bad"
    }
  ]
}
'@

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & python $scriptPath --root $tempRoot --proposal-file $badScopeProposal 2>$null | Out-Null
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Assert-Equal 1 $LASTEXITCODE 'Apply should fail when update path escapes the repo root.'

    $goodProposal = Join-Path $tempRoot 'good-proposal.json'
    Set-Content -LiteralPath $goodProposal -Encoding utf8 -Value @'
{
  "approvalStatus": "approved",
  "updates": [
    {
      "path": ".agents/skills/demo-skill/SKILL.md",
      "content": "# New content"
    }
  ]
}
'@

    & python $scriptPath --root $tempRoot --proposal-file $goodProposal --approved-by 'user' | Out-Null
    Assert-Equal 0 $LASTEXITCODE 'Apply should succeed for approved in-scope updates.'
    Assert-Equal '# New content' (Get-Content -LiteralPath (Join-Path $tempRoot '.agents/skills/demo-skill/SKILL.md') -Raw).Trim() 'Apply should write updated content.'

    $appliedProposal = Get-Content -LiteralPath $goodProposal -Raw | ConvertFrom-Json
    Assert-Equal 'applied' $appliedProposal.approvalStatus 'Apply should persist applied status back into proposal file.'
    Assert-Equal 'user' $appliedProposal.approvedBy 'Apply should persist approver.'
    Assert-True (-not [string]::IsNullOrWhiteSpace($appliedProposal.appliedAt)) 'Apply should persist applied timestamp.'
    $stateFiles = @(Get-ChildItem -LiteralPath (Join-Path $tempRoot 'audit/skill-upgrade-state') -Filter '*.jsonl' -File -ErrorAction SilentlyContinue)
    Assert-Equal 1 $stateFiles.Count 'Apply should write one state log file.'
    $applyStates = @(Get-Content -LiteralPath $stateFiles[0].FullName | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_ | ConvertFrom-Json })
    $upgradeState = @($applyStates | Where-Object { $_.phase -eq 'upgrade' -and $_.status -eq 'completed' })
    Assert-Equal 1 $upgradeState.Count 'Apply should log completed upgrade state.'
    Assert-Equal 'user' $upgradeState[0].approvedBy 'Apply state should include approver.'

    Write-Output 'apply-skill-upgrade-proposal tests passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}






