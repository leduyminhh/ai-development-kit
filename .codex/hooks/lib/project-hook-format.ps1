$ErrorActionPreference = 'Stop'

function Format-ProjectHookField {
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

function Format-ProjectHookMessage {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return '-'
    }

    return $Value -replace "\r|\n|\t", ' '
}

function ConvertTo-ProjectHookTextLine {
    param([pscustomobject]$Event)

    $preferredOrder = @(
        'timestamp', 'level', 'service', 'eventName', 'eventVersion', 'sessionId',
        'sourceType', 'sourceName', 'agentName', 'model', 'reasoning', 'message',
        'status', 'startTime', 'endTime', 'startAt', 'endAt', 'durationMs',
        'cost', 'traceId', 'spanId', 'timezone', 'schema'
    )

    $fields = New-Object System.Collections.Generic.List[string]
    foreach ($name in $preferredOrder) {
        if ($Event.PSObject.Properties.Name -contains $name) {
            if ($name -eq 'durationMs' -or $name -eq 'cost') {
                $fields.Add("$name=$([string]$Event.$name)")
            } else {
                $fields.Add("$name=$(Format-ProjectHookField $Event.$name)")
            }
        }
    }

    foreach ($property in $Event.PSObject.Properties) {
        if ($preferredOrder -contains $property.Name -or $property.Name -eq 'logger' -or $property.Name -eq 'thread' -or $property.Name -eq 'throwable') {
            continue
        }

        $fields.Add("$($property.Name)=$(Format-ProjectHookField $property.Value)")
    }

    $line = '{0} [{1}] [{2}] [{3}] [{4}] {5} - {6} | {7}' -f `
        $Event.startTime, `
        $Event.level.ToUpperInvariant(), `
        $Event.service, `
        $Event.thread, `
        $Event.traceId, `
        $Event.logger, `
        (Format-ProjectHookMessage $Event.message), `
        ($fields -join ' ')

    if (-not [string]::IsNullOrWhiteSpace($Event.throwable)) {
        $line = $line + [Environment]::NewLine + $Event.throwable
    }

    return $line
}
