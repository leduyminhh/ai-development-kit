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

$coreRoot = Join-Path $PSScriptRoot 'hooks/core'
. (Join-Path $coreRoot 'hook-identity.ps1')
. (Join-Path $coreRoot 'hook-contract.ps1')
. (Join-Path $coreRoot 'hook-flow.ps1')

function New-TestFlowEvent {
    param(
        [string]$EventName,
        [string]$TraceId = 'trace-123',
        [string]$Timestamp = '2026-06-06T01:00:00Z'
    )

    [pscustomobject][ordered]@{
        schema = 'ai.hook.event.v1'
        eventId = Get-AiHookSha256 -Value "$TraceId|$EventName|$Timestamp"
        traceId = $TraceId
        spanId = (Get-AiHookSha256 -Value "$EventName|$Timestamp").Substring(0, 16)
        timestamp = $Timestamp
        provider = 'codex'
        nativeEvent = 'Stop'
        eventName = $EventName
        mode = 'observe'
        sessionId = 'session-1'
        sourceName = 'agent'
        payload = [pscustomobject]@{}
    }
}

$validEvents = @(
    New-TestFlowEvent -EventName 'agent.started' -Timestamp '2026-06-06T01:00:00Z'
    New-TestFlowEvent -EventName 'skill.selected' -Timestamp '2026-06-06T01:00:01Z'
    New-TestFlowEvent -EventName 'skill.loaded' -Timestamp '2026-06-06T01:00:02Z'
    New-TestFlowEvent -EventName 'subagent.selected' -Timestamp '2026-06-06T01:00:03Z'
    New-TestFlowEvent -EventName 'subagent.started' -Timestamp '2026-06-06T01:00:04Z'
    New-TestFlowEvent -EventName 'subagent.completed' -Timestamp '2026-06-06T01:00:05Z'
    New-TestFlowEvent -EventName 'agent.completed' -Timestamp '2026-06-06T01:00:06Z'
)

$validFindings = @(Test-AiHookFlowTrace -Events $validEvents)
Assert-Equal 0 $validFindings.Count 'Valid flow should not produce findings.'

$duplicateStart = @(
    New-TestFlowEvent -EventName 'agent.started'
    New-TestFlowEvent -EventName 'agent.started' -Timestamp '2026-06-06T01:00:01Z'
)
$duplicateFindings = @(Test-AiHookFlowTrace -Events $duplicateStart)
Assert-Equal 1 @($duplicateFindings | Where-Object { $_.code -eq 'duplicate_start' }).Count 'Duplicate starts should produce one warning.'

$completeWithoutStart = @(New-TestFlowEvent -EventName 'subagent.completed')
$completeFindings = @(Test-AiHookFlowTrace -Events $completeWithoutStart)
Assert-Equal 1 @($completeFindings | Where-Object { $_.code -eq 'complete_without_start' -and $_.eventName -eq 'subagent.completed' }).Count 'Subagent completion without start should warn.'

$missingCompletion = @(
    New-TestFlowEvent -EventName 'agent.started'
    New-TestFlowEvent -EventName 'subagent.started' -Timestamp '2026-06-06T01:00:01Z'
    New-TestFlowEvent -EventName 'agent.completed' -Timestamp '2026-06-06T01:00:02Z'
)
$missingCompletionFindings = @(Test-AiHookFlowTrace -Events $missingCompletion)
Assert-Equal 1 @($missingCompletionFindings | Where-Object { $_.code -eq 'missing_subagent_completed' }).Count 'Missing subagent completion should warn.'

$missingEvidence = @(
    New-TestFlowEvent -EventName 'agent.started'
    New-TestFlowEvent -EventName 'agent.completed' -Timestamp '2026-06-06T01:00:01Z'
)
$unavailableFindings = @(Test-AiHookFlowTrace -Events $missingEvidence)
Assert-Equal 3 @($unavailableFindings | Where-Object { $_.severity -eq 'unavailable' }).Count 'Missing skill/subagent evidence should be unavailable by default.'

$requiredEvidenceFindings = @(Test-AiHookFlowTrace -Events $missingEvidence -RequireWorkflowEvidence)
Assert-Equal 3 @($requiredEvidenceFindings | Where-Object { $_.severity -eq 'warning' -and $_.code -eq 'missing_evidence' }).Count 'Required workflow evidence should warn when missing.'

$runtimeRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-hook-flow-test-" + [guid]::NewGuid().ToString())
try {
    foreach ($event in $validEvents) {
        $path = Add-AiHookFlowEvent -Event $event -RuntimeRoot $runtimeRoot
    }

    Assert-True (Test-Path -LiteralPath $path) 'Flow trace file should be created.'
    Assert-True ($path.EndsWith('flows/20260606/trace-123.jsonl'.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) 'Flow path should use runtime flows/date/trace layout.'
    $rows = @(Get-Content -LiteralPath $path)
    Assert-Equal $validEvents.Count $rows.Count 'Flow events should be append-only JSONL rows.'
    $pathFindings = @(Test-AiHookFlowTrace -Path $path)
    Assert-Equal 0 $pathFindings.Count 'Trace file should validate the valid flow.'
}
finally {
    if (Test-Path -LiteralPath $runtimeRoot) {
        Remove-Item -LiteralPath $runtimeRoot -Recurse -Force
    }
}

Write-Output 'hook flow tests passed.'
