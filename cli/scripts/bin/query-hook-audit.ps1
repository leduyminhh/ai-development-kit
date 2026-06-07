param(
    [string]$Root = $(if (Test-Path (Join-Path $PSScriptRoot '../../src/index.ts')) {
        (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
    } else {
        (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
    }),
    [string]$EventRoot = '',
    [string]$EventName = '',
    [string]$TraceId = '',
    [string]$SessionId = '',
    [string]$SourceName = '',
    [string]$Provider = '',
    [string]$Since = '',
    [string]$Until = '',
    [int]$Limit = 100,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$coreRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'hooks/core'
. (Join-Path $coreRoot 'hook-query.ps1')

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
if ([string]::IsNullOrWhiteSpace($EventRoot)) {
    $EventRoot = Join-Path $resolvedRoot 'reports/audit'
} elseif (-not [System.IO.Path]::IsPathRooted($EventRoot)) {
    $EventRoot = Join-Path $resolvedRoot $EventRoot
}

$events = @(Find-AiHookAuditEvents `
    -EventRoot $EventRoot `
    -EventName $EventName `
    -TraceId $TraceId `
    -SessionId $SessionId `
    -SourceName $SourceName `
    -Provider $Provider `
    -Since $Since `
    -Until $Until `
    -Limit $Limit)

if ($Json) {
    [pscustomobject][ordered]@{
        schema = 'ai.hook.audit.query.v1'
        eventRoot = $EventRoot
        count = $events.Count
        events = $events
    } | ConvertTo-Json -Depth 20
    return
}

if ($events.Count -eq 0) {
    Write-Output 'No hook audit events matched.'
    return
}

foreach ($event in $events) {
    Write-Output "$($event.timestamp) $($event.eventName) provider=$($event.provider) source=$($event.sourceName) trace=$($event.traceId)"
}
