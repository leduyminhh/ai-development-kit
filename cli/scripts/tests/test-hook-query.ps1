param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Equal {
    param($Expected, $Actual, [string]$Message)
    if ($Expected -ne $Actual) {
        throw "$Message Expected=[$Expected] Actual=[$Actual]"
    }
}

$coreRoot = Join-Path $Root 'cli/scripts/hooks/core'
. (Join-Path $coreRoot 'hook-identity.ps1')
. (Join-Path $coreRoot 'hook-contract.ps1')
. (Join-Path $coreRoot 'hook-flow.ps1')
. (Join-Path $coreRoot 'hook-query.ps1')

function New-TestEvent {
    param(
        [string]$EventName,
        [string]$TraceId,
        [string]$SessionId,
        [string]$SourceName,
        [string]$Timestamp
    )

    [pscustomobject][ordered]@{
        schema = 'ai.hook.event.v1'
        eventId = Get-AiHookSha256 -Value "$TraceId|$EventName|$Timestamp"
        traceId = $TraceId
        spanId = (Get-AiHookSha256 -Value "$EventName|$Timestamp").Substring(0, 16)
        timestamp = $Timestamp
        provider = 'codex'
        nativeEvent = 'fixture'
        eventName = $EventName
        mode = 'observe'
        sessionId = $SessionId
        sourceName = $SourceName
        payload = [pscustomobject]@{}
    }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("hook-query-" + [guid]::NewGuid().ToString())
try {
    $auditRoot = Join-Path $tempRoot 'audit'
    $runtimeRoot = Join-Path $tempRoot 'runtime'
    New-Item -ItemType Directory -Path $auditRoot -Force | Out-Null

    $events = @(
        New-TestEvent -EventName 'agent.started' -TraceId 'trace-a' -SessionId 'session-a' -SourceName 'agent' -Timestamp '2026-06-06T01:00:00Z'
        New-TestEvent -EventName 'skill.selected' -TraceId 'trace-a' -SessionId 'session-a' -SourceName 'doc-write' -Timestamp '2026-06-06T01:00:01Z'
        New-TestEvent -EventName 'agent.completed' -TraceId 'trace-a' -SessionId 'session-a' -SourceName 'agent' -Timestamp '2026-06-06T01:00:02Z'
        New-TestEvent -EventName 'agent.started' -TraceId 'trace-b' -SessionId 'session-b' -SourceName 'agent' -Timestamp '2026-06-06T02:00:00Z'
    )

    $auditFile = Join-Path $auditRoot '20260606_agent.jsonl'
    foreach ($event in $events) {
        Add-Content -LiteralPath $auditFile -Encoding utf8 -Value ($event | ConvertTo-Json -Depth 20 -Compress)
    }

    $traceMatches = @(Find-AiHookAuditEvents -EventRoot $auditRoot -TraceId 'trace-a')
    Assert-Equal 3 $traceMatches.Count 'Audit query should filter by traceId.'
    Assert-True ($traceMatches[0].auditFile.EndsWith('20260606_agent.jsonl')) 'Audit query should include source audit file.'

    $eventMatches = @(Find-AiHookAuditEvents -EventRoot $auditRoot -EventName 'agent.started' -Limit 1)
    Assert-Equal 1 $eventMatches.Count 'Audit query should apply limit.'
    Assert-Equal 'agent.started' $eventMatches[0].eventName 'Audit query should filter by event name.'

    $windowMatches = @(Find-AiHookAuditEvents -EventRoot $auditRoot -Since '2026-06-06T01:00:01Z' -Until '2026-06-06T01:00:02Z')
    Assert-Equal 2 $windowMatches.Count 'Audit query should filter by timestamp window.'

    foreach ($event in $events | Where-Object { $_.traceId -eq 'trace-a' }) {
        $flowPath = Add-AiHookFlowEvent -Event $event -RuntimeRoot $runtimeRoot
    }
    Assert-True (Test-Path -LiteralPath $flowPath) 'Flow fixture should write trace file.'

    $summary = Get-AiHookTraceSummary -Events (Read-AiHookFlowEvents -Path $flowPath) -Findings (Test-AiHookFlowTrace -Path $flowPath)
    Assert-Equal 'ai.hook.trace.summary.v1' $summary.schema 'Trace summary should expose stable schema.'
    Assert-Equal 'trace-a' $summary.traceId 'Trace summary should retain traceId.'
    Assert-Equal 3 $summary.eventCount 'Trace summary should count events.'
    Assert-Equal 2000 $summary.durationMs 'Trace summary should compute duration in milliseconds.'
    Assert-Equal 1 $summary.counts.'skill.selected' 'Trace summary should count event names.'

    $queryScript = Join-Path $Root 'cli/scripts/bin/query-hook-audit.ps1'
    $queryJson = & powershell -NoProfile -ExecutionPolicy Bypass -File $queryScript -Root $tempRoot -EventRoot $auditRoot -TraceId 'trace-a' -Json
    $queryResult = (@($queryJson) -join "`n") | ConvertFrom-Json
    Assert-Equal 'ai.hook.audit.query.v1' $queryResult.schema 'Audit query CLI should return stable schema.'
    Assert-Equal 3 $queryResult.count 'Audit query CLI should return matching event count.'

    $viewScript = Join-Path $Root 'cli/scripts/bin/view-hook-trace.ps1'
    $traceJson = & powershell -NoProfile -ExecutionPolicy Bypass -File $viewScript -Root $tempRoot -RuntimeRoot $runtimeRoot -TraceId 'trace-a' -Json
    $traceResult = (@($traceJson) -join "`n") | ConvertFrom-Json
    Assert-Equal 'ai.hook.trace.summary.v1' $traceResult.schema 'Trace viewer CLI should return stable schema.'
    Assert-Equal 'trace-a' $traceResult.traceId 'Trace viewer CLI should find trace by traceId.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}

Write-Output 'hook query tests passed.'
