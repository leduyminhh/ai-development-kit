param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
    [string]$AuditRoot,
    [string]$SessionId,
    [string]$AgentName,
    [string]$Model,
    [string]$Reasoning,
    [string]$SummaryJob,
    [string]$StartAt,
    [string]$EndAt,
    [ValidateSet('started', 'completed', 'failed', 'cancelled', 'skipped')]
    [string]$Status = 'completed',
    [decimal]$Cost = 0,
    [int]$RemainingDays = -1,
    [ValidateSet('text', 'jsonl', 'csv')]
    [string]$Format,
    [string]$TraceId,
    [string]$SpanId
)

$ErrorActionPreference = 'Stop'

. (Join-Path $Root 'scripts/lib/codex-config.ps1')

function Convert-ToUtcDateTimeOffset {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return [DateTimeOffset]::UtcNow
    }

    $parsed = [DateTimeOffset]::Parse($Value, [Globalization.CultureInfo]::InvariantCulture)
    return $parsed.ToUniversalTime()
}

function Format-UtcInstant {
    param([DateTimeOffset]$Value)
    return $Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
}

function Format-LocalInstant {
    param([DateTimeOffset]$Value, [TimeZoneInfo]$TimeZone)
    $local = [TimeZoneInfo]::ConvertTime($Value, $TimeZone)
    return $local.ToString('yyyy-MM-ddTHH:mm:sszzz', [Globalization.CultureInfo]::InvariantCulture)
}

function Format-LogField {
    param([object]$Value)

    if ($null -eq $Value) {
        return '""'
    }

    $text = [string]$Value
    $text = $text -replace "\r|\n|\t", ' '
    if ($text -eq '') {
        return '""'
    }

    if ($text -match '[\s"=|]') {
        return '"' + ($text -replace '\\', '\\' -replace '"', '\"') + '"'
    }

    return $text
}

function Format-LogMessage {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return '-'
    }

    return $Value -replace "\r|\n|\t", ' '
}

$configPath = Join-Path $Root '.codex/config.toml'
$configText = ''
if (Test-Path -LiteralPath $configPath) {
    $configText = Get-Content -LiteralPath $configPath -Raw
}

if ([string]::IsNullOrWhiteSpace($AuditRoot)) {
    $configuredRoot = Get-CodexTomlStringValue -TomlText $configText -Section 'audit.agent' -Key 'path'
    if ([string]::IsNullOrWhiteSpace($configuredRoot)) {
        $configuredRoot = 'audit/agent'
    }
    $AuditRoot = Join-Path $Root $configuredRoot
}

if ($RemainingDays -lt 0) {
    $configuredRemainingDays = Get-CodexTomlStringValue -TomlText $configText -Section 'audit.agent' -Key 'remainingDays'
    if ([string]::IsNullOrWhiteSpace($configuredRemainingDays)) {
        $RemainingDays = 30
    } else {
        $RemainingDays = [int]$configuredRemainingDays
    }
}

if ([string]::IsNullOrWhiteSpace($Format)) {
    $configuredFormat = Get-CodexTomlStringValue -TomlText $configText -Section 'audit.agent' -Key 'format'
    if ([string]::IsNullOrWhiteSpace($configuredFormat)) {
        $Format = 'text'
    } else {
        $Format = $configuredFormat.ToLowerInvariant()
    }
}

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    $SessionId = [guid]::NewGuid().ToString()
}

$startUtc = Convert-ToUtcDateTimeOffset -Value $StartAt
$endUtc = if ([string]::IsNullOrWhiteSpace($EndAt)) { $startUtc } else { Convert-ToUtcDateTimeOffset -Value $EndAt }
$timeZone = Get-CodexHoChiMinhTimeZone
$durationMs = [Math]::Max(0, [int64](($endUtc - $startUtc).TotalMilliseconds))
$level = if ($Status -eq 'failed') { 'error' } else { 'info' }
$traceValue = if ([string]::IsNullOrWhiteSpace($TraceId)) { '-' } else { $TraceId }
$spanValue = if ([string]::IsNullOrWhiteSpace($SpanId)) { '-' } else { $SpanId }

New-Item -ItemType Directory -Path $AuditRoot -Force | Out-Null

if ($RemainingDays -gt 0) {
    $cutoff = (Get-Date).ToUniversalTime().AddDays(-$RemainingDays)
    Get-ChildItem -LiteralPath $AuditRoot -Filter '*_action.*' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTimeUtc -lt $cutoff } |
        Remove-Item -Force
}

$localStart = [TimeZoneInfo]::ConvertTime($startUtc, $timeZone)
$extension = if ($Format -eq 'csv') { 'csv' } elseif ($Format -eq 'jsonl') { 'jsonl' } else { 'log' }
$auditFile = Join-Path $AuditRoot ($localStart.ToString('yyMMdd', [Globalization.CultureInfo]::InvariantCulture) + "_action.$extension")
$row = [pscustomobject]@{
    timestamp     = Format-UtcInstant -Value $endUtc
    level         = $level
    service       = 'codex-agent'
    eventName     = 'agent.execution'
    eventVersion  = '1.0'
    sessionId     = $SessionId
    agentName     = $AgentName
    model         = $Model
    reasoning     = $Reasoning
    summaryJob    = $SummaryJob
    startTime     = Format-LocalInstant -Value $startUtc -TimeZone $timeZone
    endTime       = Format-LocalInstant -Value $endUtc -TimeZone $timeZone
    startAt       = Format-UtcInstant -Value $startUtc
    endAt         = Format-UtcInstant -Value $endUtc
    durationMs    = $durationMs
    status        = $Status
    cost          = [decimal]$Cost
    traceId       = $traceValue
    spanId        = $spanValue
    timezone      = 'Asia/Ho_Chi_Minh'
    schema        = 'codex.agent.audit.v1'
}

if ($Format -eq 'csv') {
    if (Test-Path -LiteralPath $auditFile) {
        $row | Export-Csv -LiteralPath $auditFile -NoTypeInformation -Append
    } else {
        $row | Export-Csv -LiteralPath $auditFile -NoTypeInformation
    }
} else {
    if ($Format -eq 'jsonl') {
        $json = $row | ConvertTo-Json -Compress -Depth 4
        Add-Content -LiteralPath $auditFile -Value $json -Encoding utf8
    } else {
        $fields = @(
            "timestamp=$(Format-LogField $row.timestamp)",
            "level=$(Format-LogField $row.level)",
            "service=$(Format-LogField $row.service)",
            "eventName=$(Format-LogField $row.eventName)",
            "eventVersion=$(Format-LogField $row.eventVersion)",
            "sessionId=$(Format-LogField $row.sessionId)",
            "agentName=$(Format-LogField $row.agentName)",
            "model=$(Format-LogField $row.model)",
            "reasoning=$(Format-LogField $row.reasoning)",
            "summaryJob=$(Format-LogField $row.summaryJob)",
            "startTime=$(Format-LogField $row.startTime)",
            "endTime=$(Format-LogField $row.endTime)",
            "startAt=$(Format-LogField $row.startAt)",
            "endAt=$(Format-LogField $row.endAt)",
            "durationMs=$($row.durationMs)",
            "status=$(Format-LogField $row.status)",
            "cost=$($row.cost.ToString([Globalization.CultureInfo]::InvariantCulture))",
            "traceId=$(Format-LogField $row.traceId)",
            "spanId=$(Format-LogField $row.spanId)",
            "timezone=$(Format-LogField $row.timezone)",
            "schema=$(Format-LogField $row.schema)"
        )

        $line = '{0} [{1}] [{2}] [{3}] [{4}] [{5}] [{6}] codex.agent.audit - {7} | {8}' -f `
            $row.startTime, `
            $row.level.ToUpperInvariant(), `
            $row.service, `
            $row.agentName, `
            $row.sessionId, `
            $row.traceId, `
            $row.spanId, `
            (Format-LogMessage $row.summaryJob), `
            ($fields -join ' ')

        Add-Content -LiteralPath $auditFile -Value $line -Encoding utf8
    }
}

Write-Output $auditFile
