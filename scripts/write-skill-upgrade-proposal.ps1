param(
    [Parameter(Mandatory = $true)]
    [string]$SnapshotFile,
    [Parameter(Mandatory = $true)]
    [string]$ProposalFile,
    [string[]]$ValidationCommands = @()
)

$ErrorActionPreference = 'Stop'

$snapshot = Get-Content -LiteralPath $SnapshotFile -Raw | ConvertFrom-Json
$feedbackEntries = @($snapshot.feedbackEntries)

$correctNotes = @($feedbackEntries | ForEach-Object { $_.correctNotes } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
$wrongNotes = @($feedbackEntries | ForEach-Object { $_.wrongNotes } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
$missingNotes = @($feedbackEntries | ForEach-Object { $_.missingNotes } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)

$proposedChanges = New-Object System.Collections.Generic.List[string]
foreach ($note in $wrongNotes) {
    $proposedChanges.Add("Tighten or replace guidance related to: $note")
}
foreach ($note in $missingNotes) {
    $proposedChanges.Add("Add missing guidance for: $note")
}
if ($proposedChanges.Count -eq 0 -and $correctNotes.Count -gt 0) {
    $proposedChanges.Add('Preserve current guidance and review for overfitting before changing the skill.')
}

$proposal = [ordered]@{
    createdAt          = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
    targetAgent        = $snapshot.targetAgent
    targetSkills       = @($snapshot.targetSkills)
    feedbackCount      = @($feedbackEntries).Count
    observedPatterns   = @(
        "correct_notes=$($correctNotes.Count)"
        "wrong_notes=$($wrongNotes.Count)"
        "missing_notes=$($missingNotes.Count)"
    )
    correctGuidance    = $correctNotes
    incorrectGuidance  = $wrongNotes
    missingGuidance    = $missingNotes
    proposedChanges    = $proposedChanges.ToArray()
    validationCommands = @($ValidationCommands | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    approvalStatus     = 'pending'
    updates            = @()
}

$proposalJson = $proposal | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($ProposalFile, $proposalJson, (New-Object System.Text.UTF8Encoding($false)))

Write-Output $ProposalFile
