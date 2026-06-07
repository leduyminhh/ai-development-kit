$script:ClaudeHookEventMap = @{
    PreToolUse = 'tool.before'
    PostToolUse = 'tool.completed'
    PermissionRequest = 'permission.requested'
    UserPromptSubmit = 'prompt.submitted'
    SubagentStart = 'subagent.started'
    SubagentStop = 'subagent.completed'
    Stop = 'agent.completed'
}

function Get-ClaudeHookNativeEvent {
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

    foreach ($field in @('nativeEvent', 'hook_event_name', 'hookEventName', 'event', 'eventName')) {
        if (-not [string]::IsNullOrWhiteSpace([string]$InputObject.$field)) {
            return [string]$InputObject.$field
        }
    }

    throw (New-AiHookValidationException -Code 'required_field' -Message "Field 'nativeEvent' is required." -Field 'nativeEvent')
}

function ConvertFrom-ClaudeHookEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$InputObject,

        [AllowNull()]
        [string]$NativeEvent
    )

    $resolvedNativeEvent = Get-ClaudeHookNativeEvent -InputObject $InputObject -NativeEvent $NativeEvent
    if (-not $script:ClaudeHookEventMap.ContainsKey($resolvedNativeEvent)) {
        throw (New-AiHookValidationException -Code 'unsupported_native_event' -Message "Unsupported Claude hook event '$resolvedNativeEvent'." -Field 'nativeEvent')
    }

    $sourceName = if (-not [string]::IsNullOrWhiteSpace([string]$InputObject.sourceName)) {
        [string]$InputObject.sourceName
    } elseif (-not [string]::IsNullOrWhiteSpace([string]$InputObject.tool_name)) {
        [string]$InputObject.tool_name
    } elseif (-not [string]::IsNullOrWhiteSpace([string]$InputObject.subagentName)) {
        [string]$InputObject.subagentName
    } else {
        'claude'
    }

    $payload = if ($null -eq $InputObject.payload) { $InputObject } else { $InputObject.payload }
    return New-AiHookEvent `
        -Provider 'claude-code' `
        -NativeEvent $resolvedNativeEvent `
        -EventName $script:ClaudeHookEventMap[$resolvedNativeEvent] `
        -SessionId $InputObject.sessionId `
        -SourceName $sourceName `
        -Payload $payload `
        -Mode $(if ([string]::IsNullOrWhiteSpace([string]$InputObject.mode)) { 'observe' } else { [string]$InputObject.mode }) `
        -Timestamp $InputObject.timestamp `
        -TeamId $InputObject.teamId `
        -ProjectId $InputObject.projectId `
        -ClientName $InputObject.clientName
}

function ConvertTo-ClaudeHookResponse {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Result
    )

    [pscustomobject][ordered]@{
        provider = 'claude-code'
        decision = $Result.decision
        reason = $Result.reason
        continue = ($Result.decision -cne 'deny')
        suppressOutput = $true
        warnings = $Result.warnings
        auditWritten = $Result.auditWritten
    }
}

function Invoke-ClaudeHookAdapter {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$InputObject,

        [AllowNull()]
        [string]$NativeEvent
    )

    $event = ConvertFrom-ClaudeHookEvent -InputObject $InputObject -NativeEvent $NativeEvent
    $result = Invoke-AiHookPipeline -Event $event
    return ConvertTo-ClaudeHookResponse -Result $result
}
