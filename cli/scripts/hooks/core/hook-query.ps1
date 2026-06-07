function Read-AiHookJsonlEvents {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return @()
    }

    $events = New-Object 'System.Collections.Generic.List[object]'
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $events.Add(($line | ConvertFrom-Json))
    }

    return $events.ToArray()
}

function Find-AiHookAuditEvents {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$EventRoot,

        [AllowNull()]
        [string]$EventName,

        [AllowNull()]
        [string]$TraceId,

        [AllowNull()]
        [string]$SessionId,

        [AllowNull()]
        [string]$SourceName,

        [AllowNull()]
        [string]$Provider,

        [AllowNull()]
        [string]$Since,

        [AllowNull()]
        [string]$Until,

        [int]$Limit = 100
    )

    if (-not (Test-Path -LiteralPath $EventRoot)) {
        return @()
    }

    $sinceTime = if ([string]::IsNullOrWhiteSpace($Since)) { $null } else { [DateTimeOffset]::Parse($Since, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime() }
    $untilTime = if ([string]::IsNullOrWhiteSpace($Until)) { $null } else { [DateTimeOffset]::Parse($Until, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime() }
    $matches = New-Object 'System.Collections.Generic.List[object]'

    $files = Get-ChildItem -LiteralPath $EventRoot -Recurse -File -Filter '*.jsonl' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike '*.ids' } |
        Sort-Object FullName

    foreach ($file in $files) {
        foreach ($event in Read-AiHookJsonlEvents -Path $file.FullName) {
            if (-not [string]::IsNullOrWhiteSpace($EventName) -and [string]$event.eventName -cne $EventName) { continue }
            if (-not [string]::IsNullOrWhiteSpace($TraceId) -and [string]$event.traceId -cne $TraceId) { continue }
            if (-not [string]::IsNullOrWhiteSpace($SessionId) -and [string]$event.sessionId -cne $SessionId) { continue }
            if (-not [string]::IsNullOrWhiteSpace($SourceName) -and [string]$event.sourceName -cne $SourceName) { continue }
            if (-not [string]::IsNullOrWhiteSpace($Provider) -and [string]$event.provider -cne $Provider) { continue }

            if ($null -ne $sinceTime -or $null -ne $untilTime) {
                if ([string]::IsNullOrWhiteSpace([string]$event.timestamp)) { continue }
                $eventTime = [DateTimeOffset]::Parse([string]$event.timestamp, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime()
                if ($null -ne $sinceTime -and $eventTime -lt $sinceTime) { continue }
                if ($null -ne $untilTime -and $eventTime -gt $untilTime) { continue }
            }

            $event | Add-Member -NotePropertyName auditFile -NotePropertyValue $file.FullName -Force
            $matches.Add($event)
            if ($Limit -gt 0 -and $matches.Count -ge $Limit) {
                return $matches.ToArray()
            }
        }
    }

    return $matches.ToArray()
}

function Get-AiHookTraceSummary {
    [CmdletBinding()]
    param(
        [AllowEmptyCollection()]
        [object[]]$Events = @(),

        [AllowEmptyCollection()]
        [object[]]$Findings = @()
    )

    $orderedEvents = @($Events | Sort-Object timestamp)
    $first = $orderedEvents | Select-Object -First 1
    $last = $orderedEvents | Select-Object -Last 1
    $counts = [ordered]@{}
    foreach ($event in $orderedEvents) {
        $name = [string]$event.eventName
        if (-not $counts.Contains($name)) {
            $counts[$name] = 0
        }
        $counts[$name] = [int]$counts[$name] + 1
    }

    $durationMs = $null
    if ($null -ne $first -and $null -ne $last -and -not [string]::IsNullOrWhiteSpace([string]$first.timestamp) -and -not [string]::IsNullOrWhiteSpace([string]$last.timestamp)) {
        $start = [DateTimeOffset]::Parse([string]$first.timestamp, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime()
        $end = [DateTimeOffset]::Parse([string]$last.timestamp, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime()
        $durationMs = [int64]($end - $start).TotalMilliseconds
    }

    return [pscustomobject][ordered]@{
        schema = 'ai.hook.trace.summary.v1'
        traceId = if ($null -ne $first) { [string]$first.traceId } else { '' }
        sessionId = if ($null -ne $first) { [string]$first.sessionId } else { '' }
        eventCount = $orderedEvents.Count
        startedAt = if ($null -ne $first) { [string]$first.timestamp } else { '' }
        completedAt = if ($null -ne $last) { [string]$last.timestamp } else { '' }
        durationMs = $durationMs
        counts = [pscustomobject]$counts
        findings = @($Findings)
        events = $orderedEvents
    }
}
