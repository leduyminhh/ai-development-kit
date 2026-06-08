function Get-AiHookFlowDateStamp {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event
    )

    $timestampText = if ([string]::IsNullOrWhiteSpace([string]$Event.timestamp)) {
        [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
    } else {
        [string]$Event.timestamp
    }

    $timestamp = [DateTimeOffset]::Parse($timestampText, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime()
    return $timestamp.ToString('yyyyMMdd', [Globalization.CultureInfo]::InvariantCulture)
}

function Get-AiHookFlowTraceId {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event
    )

    if (-not [string]::IsNullOrWhiteSpace([string]$Event.traceId)) {
        return [string]$Event.traceId
    }

    if (-not [string]::IsNullOrWhiteSpace([string]$Event.sessionId)) {
        return Get-AiHookSha256 -Value ([string]$Event.sessionId)
    }

    throw (New-AiHookValidationException -Code 'required_field' -Message "Field 'traceId' is required." -Field 'traceId')
}

function Get-AiHookFlowPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot
    )

    $dateStamp = Get-AiHookFlowDateStamp -Event $Event
    $traceId = Get-AiHookFlowTraceId -Event $Event
    $safeTraceId = ($traceId -replace '[^a-zA-Z0-9_.-]+', '-').Trim('-')
    if ([string]::IsNullOrWhiteSpace($safeTraceId)) {
        $safeTraceId = 'trace'
    }

    return Join-Path (Join-Path (Join-Path $RuntimeRoot 'flows') $dateStamp) "$safeTraceId.jsonl"
}

function Add-AiHookFlowEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [string]$RuntimeRoot
    )

    $flowPath = Get-AiHookFlowPath -Event $Event -RuntimeRoot $RuntimeRoot
    $flowDirectory = Split-Path -Parent $flowPath
    New-Item -ItemType Directory -Path $flowDirectory -Force | Out-Null
    Add-Content -LiteralPath $flowPath -Value ($Event | ConvertTo-Json -Compress -Depth 20) -Encoding utf8
    return $flowPath
}

function Read-AiHookFlowEvents {
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
        if (-not [string]::IsNullOrWhiteSpace($line)) {
            $events.Add(($line | ConvertFrom-Json))
        }
    }

    return $events.ToArray()
}

function New-AiHookFlowFinding {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Severity,

        [Parameter(Mandatory = $true)]
        [string]$Code,

        [Parameter(Mandatory = $true)]
        [string]$EventName,

        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    [pscustomobject][ordered]@{
        severity = $Severity
        code = $Code
        eventName = $EventName
        message = $Message
    }
}

function Test-AiHookFlowTrace {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object[]]$Events,

        [string]$Path,

        [switch]$RequireWorkflowEvidence
    )

    if ($null -eq $Events) {
        if ([string]::IsNullOrWhiteSpace($Path)) {
            throw (New-AiHookValidationException -Code 'required_field' -Message "Field 'events' or 'path' is required." -Field 'events')
        }
        $Events = Read-AiHookFlowEvents -Path $Path
    }

    $findings = New-Object 'System.Collections.Generic.List[object]'
    $agentStartCount = 0
    $agentCompleted = $false
    $subagentStarted = 0
    $subagentCompleted = 0
    $seen = @{}

    foreach ($event in $Events) {
        $name = [string]$event.eventName
        if (-not $seen.ContainsKey($name)) {
            $seen[$name] = 0
        }
        $seen[$name] = [int]$seen[$name] + 1

        if ($name -ceq 'agent.started') {
            $agentStartCount++
            if ($agentStartCount -gt 1) {
                $findings.Add((New-AiHookFlowFinding -Severity 'warning' -Code 'duplicate_start' -EventName $name -Message 'agent.started appeared more than once in the trace.'))
            }
        } elseif ($name -ceq 'subagent.started') {
            $subagentStarted++
        } elseif ($name -ceq 'subagent.completed') {
            $subagentCompleted++
            if ($subagentCompleted -gt $subagentStarted) {
                $findings.Add((New-AiHookFlowFinding -Severity 'warning' -Code 'complete_without_start' -EventName $name -Message 'subagent.completed appeared before a matching subagent.started.'))
            }
        } elseif ($name -ceq 'agent.completed') {
            $agentCompleted = $true
            if ($agentStartCount -eq 0) {
                $findings.Add((New-AiHookFlowFinding -Severity 'warning' -Code 'complete_without_start' -EventName $name -Message 'agent.completed appeared without agent.started.'))
            }
        }
    }

    if ($subagentStarted -gt $subagentCompleted) {
        $findings.Add((New-AiHookFlowFinding -Severity 'warning' -Code 'missing_subagent_completed' -EventName 'subagent.completed' -Message 'A subagent.started event has no matching subagent.completed event.'))
    }

    foreach ($evidenceName in @('skill.selected', 'skill.loaded', 'subagent.selected')) {
        if (-not $seen.ContainsKey($evidenceName)) {
            $severity = if ($RequireWorkflowEvidence) { 'warning' } else { 'unavailable' }
            $findings.Add((New-AiHookFlowFinding -Severity $severity -Code 'missing_evidence' -EventName $evidenceName -Message "No evidence event was available for $evidenceName."))
        }
    }

    if ($agentCompleted -and $agentStartCount -eq 0) {
        $agentCompleted = $false
    }

    return $findings.ToArray()
}
