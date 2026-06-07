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
