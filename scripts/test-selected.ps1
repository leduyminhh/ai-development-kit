param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string[]]$ChangedFiles = @(),
    [string[]]$ActivatedSkill = @(),
    [string[]]$AgentName = @(),
    [switch]$FromGit,
    [switch]$PlanOnly
)

$ErrorActionPreference = 'Stop'

$planJson = & (Join-Path $PSScriptRoot 'resolve-test-plan.ps1') `
    -Root $Root `
    -ChangedFiles $ChangedFiles `
    -ActivatedSkill $ActivatedSkill `
    -AgentName $AgentName `
    -FromGit:$FromGit `
    -IncludeCommands

$planJsonText = @($planJson) -join "`n"
if ([string]::IsNullOrWhiteSpace($planJsonText)) {
    Write-Output 'No selected tests.'
    exit 0
}

$convertedPlan = $planJsonText | ConvertFrom-Json
$plan = @()
foreach ($item in $convertedPlan) {
    $plan += $item
}
if ($plan.Count -eq 0) {
    Write-Output 'No selected tests.'
    exit 0
}

Write-Output '## Selected Tests'
foreach ($item in $plan) {
    Write-Output "- $($item.Section) [$($item.Reason)]: $($item.Command)"
}

if ($PlanOnly) {
    exit 0
}

$seen = New-Object System.Collections.Generic.HashSet[string]
foreach ($item in $plan) {
    if (-not $seen.Add($item.Command)) {
        continue
    }

    Write-Output "`n>> $($item.Command)"
    & powershell -NoProfile -ExecutionPolicy Bypass -Command $item.Command
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
    if ($exitCode -ne 0) {
        throw "Selected test failed with exit code $exitCode`: $($item.Command)"
    }
}

Write-Output "`nSelected tests passed."
