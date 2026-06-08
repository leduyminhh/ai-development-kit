function Read-AiHookCliInput {
    [CmdletBinding()]
    param()

    $reader = [Console]::In
    return $reader.ReadToEnd()
}

function ConvertFrom-AiHookCliJson {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [string]$Json
    )

    if ([string]::IsNullOrWhiteSpace($Json)) {
        throw (New-AiHookValidationException -Code 'invalid_json' -Message 'Hook input JSON is required.' -Field 'stdin')
    }

    try {
        return $Json | ConvertFrom-Json
    }
    catch {
        throw (New-AiHookValidationException -Code 'invalid_json' -Message 'Hook input must be valid JSON.' -Field 'stdin')
    }
}

function ConvertTo-AiHookCliEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$InputObject,

        [AllowNull()]
        [string]$Provider,

        [AllowNull()]
        [string]$NativeEvent
    )

    if ([string]$InputObject.schema -ceq 'ai.hook.event.v1') {
        return $InputObject
    }

    $payload = if ($null -eq $InputObject.payload) { [pscustomobject]@{} } else { $InputObject.payload }
    return New-AiHookEvent `
        -Provider $(if ([string]::IsNullOrWhiteSpace($Provider)) { [string]$InputObject.provider } else { $Provider }) `
        -NativeEvent $(if ([string]::IsNullOrWhiteSpace($NativeEvent)) { [string]$InputObject.nativeEvent } else { $NativeEvent }) `
        -EventName $InputObject.eventName `
        -SessionId $InputObject.sessionId `
        -SourceName $InputObject.sourceName `
        -Payload $payload `
        -Mode $(if ([string]::IsNullOrWhiteSpace([string]$InputObject.mode)) { 'observe' } else { [string]$InputObject.mode }) `
        -Timestamp $InputObject.timestamp `
        -TeamId $InputObject.teamId `
        -ProjectId $InputObject.projectId `
        -ClientName $InputObject.clientName
}

function Write-AiHookCliError {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Exception]$Exception
    )

    $errorObject = [pscustomobject][ordered]@{
        schema = 'ai.hook.error.v1'
        code = if ($Exception.Data.Contains('code')) { [string]$Exception.Data['code'] } else { 'hook_error' }
        field = if ($Exception.Data.Contains('field')) { [string]$Exception.Data['field'] } else { '' }
        message = if ($Exception.Data.Contains('message')) { [string]$Exception.Data['message'] } else { $Exception.Message }
    }
    [Console]::Error.WriteLine(($errorObject | ConvertTo-Json -Compress -Depth 6))
}

function Invoke-AiHookCliTransport {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [string]$Provider,

        [AllowNull()]
        [string]$Event,

        [AllowNull()]
        [pscustomobject]$AuditSettings,

        [AllowNull()]
        [string]$RuntimeRoot
    )

    try {
        $raw = Read-AiHookCliInput
        $inputObject = ConvertFrom-AiHookCliJson -Json $raw
        $canonicalEvent = ConvertTo-AiHookCliEvent -InputObject $inputObject -Provider $Provider -NativeEvent $Event
        $result = Invoke-AiHookPipeline -Event $canonicalEvent -AuditSettings $AuditSettings -RuntimeRoot $RuntimeRoot
        [Console]::Out.WriteLine(($result | ConvertTo-Json -Compress -Depth 20))
        return 0
    }
    catch {
        Write-AiHookCliError -Exception $_.Exception
        return 1
    }
}
