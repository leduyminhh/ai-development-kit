$ErrorActionPreference = 'Stop'

function Convert-ToProjectHookUtcDateTimeOffset {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return [DateTimeOffset]::UtcNow
    }

    return [DateTimeOffset]::Parse($Value, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime()
}

function Format-ProjectHookUtcInstant {
    param([DateTimeOffset]$Value)

    return $Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
}

function Format-ProjectHookLocalInstant {
    param(
        [DateTimeOffset]$Value,
        [TimeZoneInfo]$TimeZone
    )

    $local = [TimeZoneInfo]::ConvertTime($Value, $TimeZone)
    return $local.ToString('yyyy-MM-ddTHH:mm:sszzz', [Globalization.CultureInfo]::InvariantCulture)
}

function New-ProjectHookEvent {
    param(
        [string]$ServiceName,
        [string]$EventName,
        [string]$EventVersion = '1.0',
        [string]$SessionId,
        [string]$SourceType,
        [string]$SourceName,
        [string]$Message,
        [ValidateSet('started', 'completed', 'failed', 'cancelled', 'skipped')]
        [string]$Status = 'completed',
        [decimal]$Cost = 0,
        [string]$Logger,
        [string]$TraceId,
        [string]$SpanId,
        [string]$Throwable,
        [string]$TimeZoneId,
        [TimeZoneInfo]$TimeZone,
        [string]$StartAt,
        [string]$EndAt,
        [hashtable]$Properties = @{}
    )

    if ([string]::IsNullOrWhiteSpace($SessionId)) {
        $SessionId = [guid]::NewGuid().ToString()
    }

    $startUtc = Convert-ToProjectHookUtcDateTimeOffset -Value $StartAt
    $endUtc = if ([string]::IsNullOrWhiteSpace($EndAt)) { $startUtc } else { Convert-ToProjectHookUtcDateTimeOffset -Value $EndAt }
    $level = if ($Status -eq 'failed') { 'error' } else { 'info' }
    $traceValue = if ([string]::IsNullOrWhiteSpace($TraceId)) { '-' } else { $TraceId }
    $spanValue = if ([string]::IsNullOrWhiteSpace($SpanId)) { '-' } else { $SpanId }

    $event = [ordered]@{
        timestamp    = Format-ProjectHookUtcInstant -Value $endUtc
        level        = $level
        service      = $ServiceName
        eventName    = $EventName
        eventVersion = $EventVersion
        sessionId    = $SessionId
        sourceType   = $SourceType
        sourceName   = $SourceName
        message      = $Message
        status       = $Status
        traceId      = $traceValue
        spanId       = $spanValue
        logger       = $Logger
        thread       = $SourceName
        startTime    = Format-ProjectHookLocalInstant -Value $startUtc -TimeZone $TimeZone
        endTime      = Format-ProjectHookLocalInstant -Value $endUtc -TimeZone $TimeZone
        startAt      = Format-ProjectHookUtcInstant -Value $startUtc
        endAt        = Format-ProjectHookUtcInstant -Value $endUtc
        durationMs   = [Math]::Max(0, [int64](($endUtc - $startUtc).TotalMilliseconds))
        cost         = [decimal]$Cost
        timezone     = $TimeZoneId
        schema       = 'codex.project.event.v1'
        throwable    = if ([string]::IsNullOrWhiteSpace($Throwable)) { '' } else { $Throwable }
    }

    foreach ($key in $Properties.Keys) {
        $event[$key] = $Properties[$key]
    }

    return [pscustomobject]$event
}
