param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$RuntimeRoot = '',
    [string]$TraceId = '',
    [string]$Path = '',
    [switch]$RequireWorkflowEvidence,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$coreRoot = Join-Path $PSScriptRoot 'hooks/core'
. (Join-Path $coreRoot 'hook-identity.ps1')
. (Join-Path $coreRoot 'hook-contract.ps1')
. (Join-Path $coreRoot 'hook-flow.ps1')
. (Join-Path $coreRoot 'hook-query.ps1')

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
if ([string]::IsNullOrWhiteSpace($RuntimeRoot)) {
    $RuntimeRoot = Join-Path $resolvedRoot 'reports/audit/runtime'
} elseif (-not [System.IO.Path]::IsPathRooted($RuntimeRoot)) {
    $RuntimeRoot = Join-Path $resolvedRoot $RuntimeRoot
}

if ([string]::IsNullOrWhiteSpace($Path)) {
    if ([string]::IsNullOrWhiteSpace($TraceId)) {
        throw 'TraceId or Path is required.'
    }

    $traceFileName = "$($TraceId -replace '[^a-zA-Z0-9_.-]+', '-').jsonl"
    $match = Get-ChildItem -LiteralPath (Join-Path $RuntimeRoot 'flows') -Recurse -File -Filter $traceFileName -ErrorAction SilentlyContinue |
        Sort-Object FullName |
        Select-Object -First 1
    if ($null -eq $match) {
        throw "Trace file not found for traceId: $TraceId"
    }
    $Path = $match.FullName
} elseif (-not [System.IO.Path]::IsPathRooted($Path)) {
    $Path = Join-Path $resolvedRoot $Path
}

$events = @(Read-AiHookFlowEvents -Path $Path)
$findings = @(Test-AiHookFlowTrace -Events $events -RequireWorkflowEvidence:$RequireWorkflowEvidence)
$summary = Get-AiHookTraceSummary -Events $events -Findings $findings
$summary | Add-Member -NotePropertyName path -NotePropertyValue $Path -Force

if ($Json) {
    $summary | ConvertTo-Json -Depth 20
    return
}

Write-Output "Trace: $($summary.traceId)"
Write-Output "Events: $($summary.eventCount)"
Write-Output "DurationMs: $($summary.durationMs)"
Write-Output "Findings: $(@($summary.findings).Count)"
foreach ($event in $summary.events) {
    Write-Output "- $($event.timestamp) $($event.eventName) source=$($event.sourceName)"
}
foreach ($finding in $summary.findings) {
    Write-Output "! $($finding.severity) $($finding.code) $($finding.eventName): $($finding.message)"
}
