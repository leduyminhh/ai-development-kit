param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
    [string]$EventRoot,
    [string]$SessionId,
    [Parameter(Mandatory = $true)]
    [string]$AgentName,
    [string]$Model,
    [string]$Reasoning,
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [string]$StartAt,
    [string]$EndAt,
    [ValidateSet('started', 'completed', 'failed', 'cancelled', 'skipped')]
    [string]$Status = 'completed',
    [decimal]$Cost = 0,
    [int]$RemainingDays = -1,
    [ValidateSet('text', 'jsonl', 'csv')]
    [string]$Format,
    [string]$TraceId,
    [string]$SpanId,
    [string]$Throwable
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path

. (Join-Path $repoRoot 'scripts/lib/codex-config.ps1')
. (Join-Path $PSScriptRoot 'lib/project-hook-config.ps1')
. (Join-Path $PSScriptRoot 'lib/project-hook-dispatch.ps1')
. (Join-Path $PSScriptRoot 'lib/project-hook-event.ps1')
. (Join-Path $PSScriptRoot 'lib/project-hook-format.ps1')
. (Join-Path $PSScriptRoot 'lib/project-hook-retention.ps1')
. (Join-Path $PSScriptRoot 'lib/project-hook-writer.ps1')

$settings = Get-ProjectHookSettings -Root $Root -EventRoot $EventRoot -Format $Format -RemainingDays $RemainingDays
Invoke-ProjectHookRetention -EventRoot $settings.EventRoot -RemainingDays $settings.RemainingDays

$result = Invoke-ProjectHookDispatch -Root $Root -Settings $settings -Payload ([pscustomobject]@{
    eventName  = 'agent.execution'
    sessionId  = $SessionId
    sourceType = 'agent'
    sourceName = $AgentName
    message    = $Message
    status     = $Status
    cost       = $Cost
    traceId    = $TraceId
    spanId     = $SpanId
    throwable  = $Throwable
    startAt    = $StartAt
    endAt      = $EndAt
    properties = @{
        agentName = $AgentName
        model     = $Model
        reasoning = $Reasoning
    }
})

if ($result.skipped) {
    Write-Output "Skipped: $($result.reason)"
    exit 0
}

Write-Output $result.file
