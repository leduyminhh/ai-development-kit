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

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    $SessionId = [guid]::NewGuid().ToString()
}

$auditScript = Join-Path $Root '.codex/hooks/agent-execution-audit.ps1'
if (-not (Test-Path -LiteralPath $auditScript)) {
    throw "Audit script not found: $auditScript"
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
