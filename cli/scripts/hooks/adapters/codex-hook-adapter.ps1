$script:CodexHookEventMap = @{
    PreToolUse = 'tool.before'
    PostToolUse = 'tool.completed'
    PermissionRequest = 'permission.requested'
    UserPromptSubmit = 'prompt.submitted'
    SubagentStart = 'subagent.started'
    SubagentStop = 'subagent.completed'
    Stop = 'agent.completed'
}

function Get-CodexHookNativeEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$InputObject,

        [AllowNull()]
        [string]$NativeEvent
    )

    if (-not [string]::IsNullOrWhiteSpace($NativeEvent)) {
        return $NativeEvent
    }

    foreach ($field in @('nativeEvent', 'hook_event', 'event', 'eventName')) {
        if (-not [string]::IsNullOrWhiteSpace([string]$InputObject.$field)) {
            return [string]$InputObject.$field
        }
    }

    throw (New-AiHookValidationException -Code 'required_field' -Message "Field 'nativeEvent' is required." -Field 'nativeEvent')
}

function ConvertFrom-CodexHookEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$InputObject,

        [AllowNull()]
        [string]$NativeEvent
    )

    $resolvedNativeEvent = Get-CodexHookNativeEvent -InputObject $InputObject -NativeEvent $NativeEvent
    if (-not $script:CodexHookEventMap.ContainsKey($resolvedNativeEvent)) {
        throw (New-AiHookValidationException -Code 'unsupported_native_event' -Message "Unsupported Codex hook event '$resolvedNativeEvent'." -Field 'nativeEvent')
    }

    $sourceName = if (-not [string]::IsNullOrWhiteSpace([string]$InputObject.sourceName)) {
        [string]$InputObject.sourceName
    } elseif (-not [string]::IsNullOrWhiteSpace([string]$InputObject.toolName)) {
        [string]$InputObject.toolName
    } elseif (-not [string]::IsNullOrWhiteSpace([string]$InputObject.subagentName)) {
        [string]$InputObject.subagentName
    } else {
        'codex'
    }

    $payload = if ($null -eq $InputObject.payload) { $InputObject } else { $InputObject.payload }
    return New-AiHookEvent `
        -Provider 'codex' `
        -NativeEvent $resolvedNativeEvent `
        -EventName $script:CodexHookEventMap[$resolvedNativeEvent] `
        -SessionId $InputObject.sessionId `
        -SourceName $sourceName `
        -Payload $payload `
        -Mode $(if ([string]::IsNullOrWhiteSpace([string]$InputObject.mode)) { 'observe' } else { [string]$InputObject.mode }) `
        -Timestamp $InputObject.timestamp `
        -TeamId $InputObject.teamId `
        -ProjectId $InputObject.projectId `
        -ClientName $InputObject.clientName
}

function ConvertTo-CodexHookResponse {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Result
    )

    [pscustomobject][ordered]@{
        provider = 'codex'
        decision = $Result.decision
        reason = $Result.reason
        continue = ($Result.decision -cne 'deny')
        warnings = $Result.warnings
        auditWritten = $Result.auditWritten
    }
}

function Invoke-CodexHookAdapter {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$InputObject,

        [AllowNull()]
        [string]$NativeEvent
    )

    $event = ConvertFrom-CodexHookEvent -InputObject $InputObject -NativeEvent $NativeEvent
    $result = Invoke-AiHookPipeline -Event $event
    return ConvertTo-CodexHookResponse -Result $result
}
