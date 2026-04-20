param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$AuditRoot,
    [string]$SessionId,
    [Parameter(Mandatory = $true)]
    [string]$AgentName,
    [string]$Model,
    [string]$Reasoning,
    [Parameter(Mandatory = $true)]
    [string]$SummaryJob,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [decimal]$Cost = 0,
    [int]$RemainingDays = -1
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib/codex-config.ps1')

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    $SessionId = [guid]::NewGuid().ToString()
}

$auditScript = Join-Path $Root '.codex/hooks/write-agent-audit.ps1'
if (-not (Test-Path -LiteralPath $auditScript)) {
    throw "Audit script not found: $auditScript"
}

$agentConfigPath = Join-Path $Root (Join-Path '.codex/agents' "$AgentName.toml")
if (-not (Test-Path -LiteralPath $agentConfigPath)) {
    throw "Agent config not found for '$AgentName': $agentConfigPath"
}

$agentConfigText = Get-Content -LiteralPath $agentConfigPath -Raw
$configuredAgentName = Get-CodexTomlStringValue -TomlText $agentConfigText -Key 'name'
if ([string]::IsNullOrWhiteSpace($configuredAgentName)) {
    throw "Agent config is missing required name: $agentConfigPath"
}

if ($configuredAgentName -ne $AgentName) {
    throw "AgentName '$AgentName' does not match config name '$configuredAgentName': $agentConfigPath"
}

if ([string]::IsNullOrWhiteSpace($Model)) {
    $Model = Get-CodexTomlStringValue -TomlText $agentConfigText -Key 'model'
}

if ([string]::IsNullOrWhiteSpace($Reasoning)) {
    $Reasoning = Get-CodexTomlStringValue -TomlText $agentConfigText -Key 'model_reasoning_effort'
}

$startAt = [DateTimeOffset]::UtcNow
$status = 'completed'
$exitCode = 0

try {
    & powershell -NoProfile -ExecutionPolicy Bypass -Command $Command
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
    if ($exitCode -ne 0) {
        $status = 'failed'
    }
} catch {
    $status = 'failed'
    $exitCode = 1
    Write-Error $_
} finally {
    $endAt = [DateTimeOffset]::UtcNow
    $auditArgs = @{
        Root       = $Root
        SessionId  = $SessionId
        AgentName  = $AgentName
        Model      = $Model
        Reasoning  = $Reasoning
        SummaryJob = $SummaryJob
        StartAt    = $startAt.ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
        EndAt      = $endAt.ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
        Status     = $status
        Cost       = $Cost
    }

    if (-not [string]::IsNullOrWhiteSpace($AuditRoot)) {
        $auditArgs.AuditRoot = $AuditRoot
    }

    if ($RemainingDays -ge 0) {
        $auditArgs.RemainingDays = $RemainingDays
    }

    & $auditScript @auditArgs | Out-Null
}

exit $exitCode
