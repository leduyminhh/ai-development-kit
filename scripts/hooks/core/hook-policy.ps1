$script:AiHookDecisionRanks = @{
    abstain = 0
    allow = 1
    ask = 2
    deny = 3
}

function Assert-AiHookDecision {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [string]$Decision
    )

    if (@('abstain', 'allow', 'ask', 'deny') -cnotcontains $Decision) {
        throw (New-AiHookValidationException -Code 'invalid_decision' -Message "Unsupported decision '$Decision'." -Field 'decision')
    }
}

function Merge-AiHookDecision {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        [AllowEmptyCollection()]
        [object[]]$Decisions
    )

    if ($null -eq $Decisions) {
        throw (New-AiHookValidationException -Code 'invalid_candidates' -Message 'Policy candidates must not be null.' -Field 'candidates')
    }

    $mergedDecision = 'abstain'
    foreach ($decisionValue in $Decisions) {
        $decision = [string]$decisionValue
        Assert-AiHookDecision -Decision $decision
        if ($script:AiHookDecisionRanks[$decision] -gt $script:AiHookDecisionRanks[$mergedDecision]) {
            $mergedDecision = $decision
        }
    }

    return $mergedDecision
}

function Invoke-AiHookPolicy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$EventId,

        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Mode,

        [Parameter(Mandatory = $true)]
        [AllowNull()]
        [AllowEmptyCollection()]
        [object[]]$Candidates
    )

    if (@('observe', 'warn', 'enforce') -cnotcontains $Mode) {
        throw (New-AiHookValidationException -Code 'invalid_mode' -Message "Unsupported mode '$Mode'." -Field 'mode')
    }

    if ($null -eq $Candidates) {
        throw (New-AiHookValidationException -Code 'invalid_candidates' -Message 'Policy candidates must not be null.' -Field 'candidates')
    }

    $decisions = @()
    $warnings = @()
    $policyIds = @()
    foreach ($candidate in $Candidates) {
        $decision = [string]$candidate.decision
        Assert-AiHookDecision -Decision $decision
        $decisions += $decision

        if (-not [string]::IsNullOrWhiteSpace([string]$candidate.policyId)) {
            $policyIds += [string]$candidate.policyId
        }

        foreach ($warning in @($candidate.warnings)) {
            if (-not [string]::IsNullOrWhiteSpace([string]$warning)) {
                $warnings += [string]$warning
            }
        }
    }

    $aggregateDecision = Merge-AiHookDecision -Decisions $decisions
    $resultDecision = if ($Mode -ceq 'enforce') { $aggregateDecision } else { 'abstain' }
    [object[]]$resultWarnings = @()
    if ($Mode -cne 'observe') {
        $resultWarnings = @($warnings)
    }
    $reason = $null
    if ($Mode -ceq 'enforce') {
        foreach ($candidate in $Candidates) {
            if ([string]$candidate.decision -ceq $aggregateDecision) {
                $reason = [string]$candidate.reason
                break
            }
        }
    }

    return New-AiHookResult `
        -EventId $EventId `
        -Mode $Mode `
        -Decision $resultDecision `
        -Reason $reason `
        -Warnings $resultWarnings `
        -PolicyIds @($policyIds)
}

function Read-AiHookPolicyRules {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
        return @()
    }

    $content = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($content)) {
        return @()
    }

    $parsed = $content | ConvertFrom-Json
    if ($null -ne $parsed.rules) {
        return @($parsed.rules)
    }

    return @($parsed)
}

function Test-AiHookPolicyRuleMatch {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [pscustomobject]$Rule
    )

    foreach ($field in @('eventName', 'provider', 'sourceName', 'nativeEvent')) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Rule.$field) -and [string]$Event.$field -cne [string]$Rule.$field) {
            return $false
        }
    }

    $payloadJson = if ($null -eq $Event.payload) { '' } else { $Event.payload | ConvertTo-Json -Depth 20 -Compress }
    if (-not [string]::IsNullOrWhiteSpace([string]$Rule.payloadContains) -and -not $payloadJson.Contains([string]$Rule.payloadContains)) {
        return $false
    }

    if (-not [string]::IsNullOrWhiteSpace([string]$Rule.commandPattern)) {
        $command = ''
        foreach ($candidatePath in @('command', 'tool_input.command', 'input.command')) {
            $cursor = $Event.payload
            foreach ($part in $candidatePath.Split('.')) {
                if ($null -eq $cursor) { break }
                $cursor = $cursor.$part
            }
            if (-not [string]::IsNullOrWhiteSpace([string]$cursor)) {
                $command = [string]$cursor
                break
            }
        }

        if ([string]::IsNullOrWhiteSpace($command) -or $command -notmatch [string]$Rule.commandPattern) {
            return $false
        }
    }

    return $true
}

function Invoke-AiHookRulePolicy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [AllowEmptyCollection()]
        [object[]]$Rules = @()
    )

    $candidates = New-Object 'System.Collections.Generic.List[object]'
    foreach ($rule in @($Rules)) {
        if ($null -eq $rule) {
            continue
        }

        $decision = if ([string]::IsNullOrWhiteSpace([string]$rule.decision)) { 'abstain' } else { [string]$rule.decision }
        Assert-AiHookDecision -Decision $decision
        if (-not (Test-AiHookPolicyRuleMatch -Event $Event -Rule $rule)) {
            continue
        }

        $warningList = New-Object 'System.Collections.Generic.List[string]'
        foreach ($warning in @($rule.warnings)) {
            if (-not [string]::IsNullOrWhiteSpace([string]$warning)) {
                $warningList.Add([string]$warning)
            }
        }
        if (-not [string]::IsNullOrWhiteSpace([string]$rule.warning)) {
            $warningList.Add([string]$rule.warning)
        }

        $candidates.Add([pscustomobject][ordered]@{
            decision = $decision
            reason = if ([string]::IsNullOrWhiteSpace([string]$rule.reason)) { "Matched policy $($rule.policyId)." } else { [string]$rule.reason }
            warnings = $warningList.ToArray()
            policyId = if ([string]::IsNullOrWhiteSpace([string]$rule.policyId)) { 'inline-policy' } else { [string]$rule.policyId }
        })
    }

    return $candidates.ToArray()
}
