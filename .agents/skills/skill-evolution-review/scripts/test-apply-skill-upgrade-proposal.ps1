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
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.agents/skills') -Force | Out-Null
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
skill = "demo-skill"
mode = "hybrid"
auto_apply = true
allowed_paths = [".agents/skills/demo-skill/SKILL.md"]
max_patch_lines = 20
max_files_per_patch = 1
validation_commands = []
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

    $disallowedProposal = Join-Path $tempRoot 'disallowed-proposal.json'
    Set-Content -LiteralPath $disallowedProposal -Encoding utf8 -Value @'
{
  "approvalStatus": "approved",
  "targetName": "demo-skill",
  "updates": [
    {
      "path": ".agents/skills/other-skill/SKILL.md",
      "content": "bad"
    }
  ]
}
'@

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & python $scriptPath --root $tempRoot --proposal-file $disallowedProposal 2>$null | Out-Null
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Assert-Equal 1 $LASTEXITCODE 'Apply should fail when update path is outside the skill evolution allowed paths.'

    $tooManyFilesProposal = Join-Path $tempRoot 'too-many-files-proposal.json'
    Set-Content -LiteralPath $tooManyFilesProposal -Encoding utf8 -Value @'
{
  "approvalStatus": "approved",
  "targetName": "demo-skill",
  "updates": [
    {
      "path": ".agents/skills/demo-skill/SKILL.md",
      "content": "# New content"
    },
    {
      "path": ".agents/skills/demo-skill/extra.md",
      "content": "extra"
    }
  ]
}
'@

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & python $scriptPath --root $tempRoot --proposal-file $tooManyFilesProposal 2>$null | Out-Null
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Assert-Equal 1 $LASTEXITCODE 'Apply should fail when proposal exceeds max_files_per_patch.'

    $validationFailProposal = Join-Path $tempRoot 'validation-fail-proposal.json'
    Set-Content -LiteralPath $validationFailProposal -Encoding utf8 -Value @'
{
  "approvalStatus": "approved",
  "targetName": "demo-skill",
  "validationCommands": ["exit 7"],
  "updates": [
    {
      "path": ".agents/skills/demo-skill/SKILL.md",
      "content": "# Broken content"
    }
  ]
}
'@

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & python $scriptPath --root $tempRoot --proposal-file $validationFailProposal 2>$null | Out-Null
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Assert-Equal 1 $LASTEXITCODE 'Apply should fail when a proposal validation command fails.'
    Assert-Equal '# Old content' (Get-Content -LiteralPath (Join-Path $tempRoot '.agents/skills/demo-skill/SKILL.md') -Raw).Trim() 'Apply should roll back file content when validation fails.'
    $failedProposal = Get-Content -LiteralPath $validationFailProposal -Raw | ConvertFrom-Json
    Assert-Equal 'approved' $failedProposal.approvalStatus 'Validation failure should not mark the proposal as applied.'

    $goodProposal = Join-Path $tempRoot 'good-proposal.json'
    Set-Content -LiteralPath $goodProposal -Encoding utf8 -Value @'
{
  "approvalStatus": "approved",
  "targetName": "demo-skill",
  "validationCommands": [],
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






