$ErrorActionPreference = 'Stop'

function ConvertTo-ProjectHookPropertyMap {
    param([object]$Value)

    $map = @{}
    if ($null -eq $Value) {
        return $map
    }

    if ($Value -is [hashtable]) {
        return $Value
    }

    foreach ($property in $Value.PSObject.Properties) {
        $map[$property.Name] = $property.Value
    }

    return $map
}

function Get-ProjectHookLoggerName {
    param(
        [pscustomobject]$Settings,
        [string]$SourceType
    )

    $suffix = if ([string]::IsNullOrWhiteSpace($SourceType)) {
        'event'
    } else {
        ($SourceType -replace '[^a-zA-Z0-9]+', '.').Trim('.').ToLowerInvariant()
    }

    if ([string]::IsNullOrWhiteSpace($suffix)) {
        $suffix = 'event'
    }

    return "$($Settings.DefaultLogger).$suffix"
}

function Test-ProjectHookEventAllowed {
    param(
        [string]$Root,
        [pscustomobject]$Settings,
        [pscustomobject]$Payload
    )

    if (-not $Settings.Enabled) {
        return [pscustomobject]@{
            Allowed = $false
            Reason  = 'project hooks are disabled.'
        }
    }

    if ($Payload.sourceType -eq 'agent') {
        $registration = Get-ProjectHookAgentRegistration -Root $Root -AgentName $Payload.sourceName
        if (-not $registration.Exists) {
            return [pscustomobject]@{
                Allowed = $false
                Reason  = "agent $($Payload.sourceName) is not registered."
            }
        }

        if (-not $registration.Enabled) {
            return [pscustomobject]@{
                Allowed = $false
                Reason  = "agent $($Payload.sourceName) is disabled."
            }
        }

        if (-not $registration.HooksProjectEnabled) {
            return [pscustomobject]@{
                Allowed = $false
                Reason  = "project hook is disabled for agent $($Payload.sourceName)."
            }
        }
    }

    return [pscustomobject]@{
        Allowed = $true
        Reason  = ''
    }
}

function Invoke-ProjectHookDispatch {
    param(
        [string]$Root,
        [pscustomobject]$Settings,
        [pscustomobject]$Payload
    )

    foreach ($requiredField in @('eventName', 'sourceType', 'sourceName', 'message')) {
        if ([string]::IsNullOrWhiteSpace([string]$Payload.$requiredField)) {
            throw "Missing required event field: $requiredField"
        }
    }

    $decision = Test-ProjectHookEventAllowed -Root $Root -Settings $Settings -Payload $Payload
    if (-not $decision.Allowed) {
        return [pscustomobject]@{
            written = $false
            skipped = $true
            reason  = $decision.Reason
            file    = $null
        }
    }

    $properties = ConvertTo-ProjectHookPropertyMap -Value $Payload.properties
    $event = New-ProjectHookEvent `
        -ServiceName $Settings.ServiceName `
        -EventName $Payload.eventName `
        -SessionId $Payload.sessionId `
        -SourceType $Payload.sourceType `
        -SourceName $Payload.sourceName `
        -Message $Payload.message `
        -Status $(if ([string]::IsNullOrWhiteSpace([string]$Payload.status)) { 'completed' } else { [string]$Payload.status }) `
        -Cost $(if ($null -eq $Payload.cost) { 0 } else { [decimal]$Payload.cost }) `
        -Logger (Get-ProjectHookLoggerName -Settings $Settings -SourceType $Payload.sourceType) `
        -TraceId $Payload.traceId `
        -SpanId $Payload.spanId `
        -Throwable $Payload.throwable `
        -TimeZoneId $Settings.TimeZoneId `
        -TimeZone $Settings.TimeZone `
        -StartAt $Payload.startAt `
        -EndAt $Payload.endAt `
        -Properties $properties

    $eventFile = Write-ProjectHookEvent -Event $event -EventRoot $Settings.EventRoot -Format $Settings.Format -TimeZone $Settings.TimeZone -FilenamePattern $Settings.FilenamePattern
    return [pscustomobject]@{
        written = $true
        skipped = $false
        reason  = ''
        file    = $eventFile
    }
}
