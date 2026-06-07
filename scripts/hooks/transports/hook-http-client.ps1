function New-AiHookHttpAbstainResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [string]$Reason
    )

    $eventId = if ([string]::IsNullOrWhiteSpace([string]$Event.eventId)) { 'http-unavailable' } else { [string]$Event.eventId }
    $mode = if ([string]::IsNullOrWhiteSpace([string]$Event.mode)) { 'observe' } else { [string]$Event.mode }
    return New-AiHookResult -EventId $eventId -Mode $mode -Decision 'abstain' -Reason $Reason
}

function Invoke-AiHookHttpClient {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [string]$Url,

        [int]$TimeoutMs = 1500,

        [ValidateSet('abstain', 'fallback-cli', 'fail')]
        [string]$FailureMode = 'abstain',

        [AllowNull()]
        [string]$SharedToken,

        [AllowNull()]
        [scriptblock]$Fallback
    )

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($SharedToken)) {
        $headers['X-AI-Hook-Token'] = $SharedToken
    }

    try {
        $timeoutSeconds = [Math]::Max(1, [int][Math]::Ceiling($TimeoutMs / 1000.0))
        return Invoke-RestMethod `
            -Method Post `
            -Uri $Url `
            -ContentType 'application/json' `
            -Headers $headers `
            -Body ($Event | ConvertTo-Json -Depth 20 -Compress) `
            -TimeoutSec $timeoutSeconds
    } catch {
        if ($FailureMode -ceq 'fail') {
            throw
        }

        if ($FailureMode -ceq 'fallback-cli' -and $null -ne $Fallback) {
            return & $Fallback $Event
        }

        return New-AiHookHttpAbstainResult -Event $Event -Reason 'http_unavailable'
    }
}
