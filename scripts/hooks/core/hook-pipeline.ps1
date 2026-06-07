function Add-AiHookPipelineStage {
    [CmdletBinding()]
    param(
        [AllowNull()]
        $StageRecorder,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if ($null -eq $StageRecorder) {
        return
    }

    if ($StageRecorder -is [System.Collections.IList]) {
        [void]$StageRecorder.Add($Name)
        return
    }

    if ($StageRecorder -is [scriptblock]) {
        & $StageRecorder $Name
    }
}

function Assert-AiHookCanonicalEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event
    )

    foreach ($field in @('schema', 'eventId', 'eventName', 'mode')) {
        if ([string]::IsNullOrWhiteSpace([string]$Event.$field)) {
            throw (New-AiHookValidationException -Code 'required_field' -Message "Field '$field' is required." -Field $field)
        }
    }

    if ([string]$Event.schema -cne 'ai.hook.event.v1') {
        throw (New-AiHookValidationException -Code 'invalid_schema' -Message "Unsupported event schema '$($Event.schema)'." -Field 'schema')
    }

    if ($script:AiHookCanonicalEventNames -cnotcontains ([string]$Event.eventName)) {
        throw (New-AiHookValidationException -Code 'unsupported_event_name' -Message "Unsupported canonical event name '$($Event.eventName)'." -Field 'eventName')
    }

    if (@('observe', 'warn', 'enforce') -cnotcontains ([string]$Event.mode)) {
        throw (New-AiHookValidationException -Code 'invalid_mode' -Message "Unsupported mode '$($Event.mode)'." -Field 'mode')
    }
}

function Invoke-AiHookPipeline {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [pscustomobject]$Event,

        [AllowNull()]
        [scriptblock]$Normalize,

        [AllowEmptyCollection()]
        [object[]]$PolicyCandidates = @(),

        [AllowNull()]
        [pscustomobject]$AuditSettings,

        [AllowNull()]
        [string]$RuntimeRoot,

        [AllowNull()]
        $StageRecorder
    )

    Add-AiHookPipelineStage -StageRecorder $StageRecorder -Name 'normalize'
    if ($null -ne $Normalize) {
        $Event = & $Normalize
    }

    Add-AiHookPipelineStage -StageRecorder $StageRecorder -Name 'validate'
    if ($null -eq $Event) {
        throw (New-AiHookValidationException -Code 'required_field' -Message "Field 'event' is required." -Field 'event')
    }
    Assert-AiHookCanonicalEvent -Event $Event

    Add-AiHookPipelineStage -StageRecorder $StageRecorder -Name 'deduplicate'
    Add-AiHookPipelineStage -StageRecorder $StageRecorder -Name 'correlate'

    Add-AiHookPipelineStage -StageRecorder $StageRecorder -Name 'policy'
    $result = Invoke-AiHookPolicy -EventId $Event.eventId -Mode $Event.mode -Candidates $PolicyCandidates

    Add-AiHookPipelineStage -StageRecorder $StageRecorder -Name 'audit'
    if ($null -ne $AuditSettings) {
        $auditResult = Write-AiHookAuditEvent -Event $Event -Settings $AuditSettings
        $result.auditWritten = [bool]$auditResult.auditWritten
    }

    Add-AiHookPipelineStage -StageRecorder $StageRecorder -Name 'flow'
    if (-not [string]::IsNullOrWhiteSpace($RuntimeRoot)) {
        Add-AiHookFlowEvent -Event $Event -RuntimeRoot $RuntimeRoot | Out-Null
    }

    return $result
}
