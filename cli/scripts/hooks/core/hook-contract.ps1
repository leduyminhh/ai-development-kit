$script:AiHookCanonicalEventNames = @(
    'agent.started',
    'skill.selected',
    'skill.loaded',
    'subagent.selected',
    'subagent.started',
    'subagent.completed',
    'agent.completed',
    'prompt.submitted',
    'tool.before',
    'tool.completed',
    'tool.failed',
    'permission.requested',
    'permission.resolved',
    'session.stopped',
    'flow.warning',
    'flow.invalid'
)

function New-AiHookValidationException {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Code,

        [Parameter(Mandatory = $true)]
        [string]$Message,

        [Parameter(Mandatory = $true)]
        [string]$Field
    )

    $exception = New-Object System.ArgumentException($Message, $Field)
    $exception.Data['code'] = $Code
    $exception.Data['message'] = $Message
    $exception.Data['field'] = $Field
    return $exception
}

function Assert-AiHookRequiredText {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [string]$Value,

        [Parameter(Mandatory = $true)]
        [string]$Field
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw (New-AiHookValidationException -Code 'required_field' -Message "Field '$Field' is required." -Field $Field)
    }
}

function Get-AiHookUtf8Size {
    [CmdletBinding()]
    param(
        [AllowNull()]
        $Value
    )

    $json = ConvertTo-Json -InputObject $Value -Depth 100 -Compress
    return [System.Text.Encoding]::UTF8.GetByteCount($json)
}

function New-AiHookResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$EventId,

        [Parameter(Mandatory = $true)]
        [string]$Mode,

        [Parameter(Mandatory = $true)]
        [string]$Decision,

        [AllowNull()]
        [string]$Reason,

        [AllowEmptyCollection()]
        [object[]]$Warnings = @(),

        [AllowEmptyCollection()]
        [object[]]$PolicyIds = @()
    )

    [object[]]$warningArray = @()
    if ($null -ne $Warnings) {
        $warningArray = [object[]]$Warnings.Clone()
    }

    [object[]]$policyIdArray = @()
    if ($null -ne $PolicyIds) {
        $policyIdArray = [object[]]$PolicyIds.Clone()
    }

    [pscustomobject][ordered]@{
        schema = 'ai.hook.result.v1'
        eventId = $EventId
        mode = $Mode
        decision = $Decision
        reason = $Reason
        warnings = $warningArray
        policyIds = $policyIdArray
        auditWritten = $false
    }
}

function New-AiHookEvent {
    [CmdletBinding()]
    param(
        [AllowEmptyString()]
        [string]$Provider,

        [AllowEmptyString()]
        [string]$NativeEvent,

        [AllowEmptyString()]
        [string]$EventName,

        [AllowEmptyString()]
        [string]$SessionId,

        [AllowEmptyString()]
        [string]$SourceName,

        [Parameter(Mandatory = $true)]
        [AllowNull()]
        $Payload,

        [string]$Mode = 'observe',

        [AllowEmptyString()]
        [string]$Timestamp,

        [AllowNull()]
        [string]$TeamId,

        [AllowNull()]
        [string]$ProjectId,

        [AllowNull()]
        [string]$ClientName
    )

    Assert-AiHookRequiredText -Value $Provider -Field 'provider'
    Assert-AiHookRequiredText -Value $NativeEvent -Field 'nativeEvent'
    Assert-AiHookRequiredText -Value $EventName -Field 'eventName'
    Assert-AiHookRequiredText -Value $SessionId -Field 'sessionId'
    Assert-AiHookRequiredText -Value $SourceName -Field 'sourceName'
    Assert-AiHookRequiredText -Value $Timestamp -Field 'timestamp'

    if (@('observe', 'warn', 'enforce') -cnotcontains $Mode) {
        throw (New-AiHookValidationException -Code 'invalid_mode' -Message "Unsupported mode '$Mode'." -Field 'mode')
    }

    if ($script:AiHookCanonicalEventNames -cnotcontains $EventName) {
        throw (New-AiHookValidationException -Code 'unsupported_event_name' -Message "Unsupported canonical event name '$EventName'." -Field 'eventName')
    }

    $normalizedTimestamp = ConvertTo-AiHookTimestamp -Timestamp $Timestamp
    if ($null -eq $normalizedTimestamp) {
        throw (New-AiHookValidationException -Code 'invalid_timestamp' -Message 'Timestamp must be an ISO 8601 UTC value.' -Field 'timestamp')
    }

    if ((Get-AiHookUtf8Size -Value $Payload) -gt 262144) {
        throw (New-AiHookValidationException -Code 'request_too_large' -Message 'Payload exceeds the 262144-byte UTF-8 limit.' -Field 'payload')
    }

    $identity = New-AiHookIdentity `
        -Provider $Provider `
        -NativeEvent $NativeEvent `
        -SessionId $SessionId `
        -SourceName $SourceName `
        -Payload $Payload `
        -Timestamp $normalizedTimestamp

    [pscustomobject][ordered]@{
        schema = 'ai.hook.event.v1'
        eventId = $identity.eventId
        traceId = $identity.traceId
        spanId = $identity.spanId
        timestamp = $normalizedTimestamp
        provider = $Provider
        nativeEvent = $NativeEvent
        eventName = $EventName
        mode = $Mode
        decision = 'abstain'
        sessionId = $SessionId
        sourceName = $SourceName
        teamId = $TeamId
        projectId = $ProjectId
        clientName = $ClientName
        payload = ConvertTo-AiHookRedactedValue -Value $Payload
    }
}
