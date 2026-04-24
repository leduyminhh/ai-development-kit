param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path,
    [Parameter(Mandatory = $true)]
    [string]$AgentName,
    [string[]]$SkillNames = @(),
    [ValidateSet('correct', 'wrong', 'mixed')]
    [string]$Outcome = 'mixed',
    [Parameter(Mandatory = $true)]
    [string]$TaskSummary,
    [string]$CorrectNotes = '',
    [string]$WrongNotes = '',
    [string]$MissingNotes = ''
)

$ErrorActionPreference = 'Stop'

. (Join-Path $Root 'scripts/lib/codex-config.ps1')

if (
    [string]::IsNullOrWhiteSpace($CorrectNotes) -and
    [string]::IsNullOrWhiteSpace($WrongNotes) -and
    [string]::IsNullOrWhiteSpace($MissingNotes)
) {
    throw 'At least one of CorrectNotes, WrongNotes, or MissingNotes is required.'
}

$configPath = Join-Path $Root '.codex/config.toml'
$configText = if (Test-Path -LiteralPath $configPath) {
    Get-Content -LiteralPath $configPath -Raw
} else {
    ''
}

$configuredFeedbackPath = Get-CodexTomlStringValue -TomlText $configText -Section 'skill_upgrade' -Key 'feedbackPath'
if ([string]::IsNullOrWhiteSpace($configuredFeedbackPath)) {
    $configuredFeedbackPath = 'audit/skill-feedback'
}

$feedbackRoot = Join-Path $Root $configuredFeedbackPath
New-Item -ItemType Directory -Path $feedbackRoot -Force | Out-Null

$timeZone = Get-CodexHoChiMinhTimeZone
$now = [TimeZoneInfo]::ConvertTime([DateTimeOffset]::UtcNow, $timeZone)
$feedbackFile = Join-Path $feedbackRoot ($now.ToString('yyyyMMdd', [Globalization.CultureInfo]::InvariantCulture) + '_skill-feedback.jsonl')

$entry = [ordered]@{
    timestamp    = $now.ToString('yyyy-MM-ddTHH:mm:sszzz', [Globalization.CultureInfo]::InvariantCulture)
    agentName    = $AgentName
    skillNames   = @($SkillNames | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    outcome      = $Outcome
    taskSummary  = $TaskSummary
    correctNotes = $CorrectNotes
    wrongNotes   = $WrongNotes
    missingNotes = $MissingNotes
}

$json = $entry | ConvertTo-Json -Compress -Depth 4
Add-Content -LiteralPath $feedbackFile -Value $json -Encoding utf8

Write-Output $feedbackFile





