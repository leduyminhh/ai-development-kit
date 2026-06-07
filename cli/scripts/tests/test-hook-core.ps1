$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Equal {
    param($Expected, $Actual, [string]$Message)
    if ($Expected -ne $Actual) {
        throw "$Message Expected=[$Expected] Actual=[$Actual]"
    }
}

function Assert-ValidationError {
    param(
        [scriptblock]$Action,
        [string]$Code,
        [string]$Field
    )

    try {
        & $Action
        throw "Expected validation error code [$Code] for field [$Field]."
    }
    catch {
        Assert-Equal $Code $_.Exception.Data['code'] 'Validation error code should be stable.'
        Assert-Equal $Field $_.Exception.Data['field'] 'Validation error field should be stable.'
        Assert-True (-not [string]::IsNullOrWhiteSpace([string]$_.Exception.Data['message'])) 'Validation error message should be present.'
    }
}

$coreRoot = Join-Path $PSScriptRoot '../hooks/core'
. (Join-Path $coreRoot 'hook-redaction.ps1')
. (Join-Path $coreRoot 'hook-identity.ps1')
. (Join-Path $coreRoot 'hook-contract.ps1')
$policyPath = Join-Path $coreRoot 'hook-policy.ps1'
if (Test-Path -LiteralPath $policyPath) {
    . $policyPath
}
$auditPath = Join-Path $coreRoot 'hook-audit.ps1'
if (Test-Path -LiteralPath $auditPath) {
    . $auditPath
}
$flowPath = Join-Path $coreRoot 'hook-flow.ps1'
if (Test-Path -LiteralPath $flowPath) {
    . $flowPath
}
$pipelinePath = Join-Path $coreRoot 'hook-pipeline.ps1'
if (Test-Path -LiteralPath $pipelinePath) {
    . $pipelinePath
}
$httpClientPath = Join-Path $PSScriptRoot '../hooks/transports/hook-http-client.ps1'
if (Test-Path -LiteralPath $httpClientPath) {
    . $httpClientPath
}

$timestamp = '2026-06-06T01:00:00Z'
$eventArgs = @{
    Provider = 'codex'
    NativeEvent = 'PreToolUse'
    EventName = 'tool.before'
    SessionId = 'session-1'
    SourceName = 'Bash'
    Payload = @{ command = 'git status' }
    Timestamp = $timestamp
}

$event = New-AiHookEvent @eventArgs
Assert-Equal 'ai.hook.event.v1' $event.schema 'Schema should use the canonical version.'
Assert-Equal 'observe' $event.mode 'Default mode should be observe.'
Assert-Equal 'abstain' $event.decision 'Default decision should be abstain.'
Assert-True ($event.eventId -cmatch '^[0-9a-f]{64}$') 'Event ID should be a lowercase SHA-256 hex string.'
Assert-Equal $event.eventId (New-AiHookEvent @eventArgs).eventId 'Event ID should be deterministic.'
Assert-True ($event.traceId -cmatch '^[0-9a-f]{64}$') 'Trace ID should derive from the session.'
Assert-Equal $event.eventId.Substring(0, 16) $event.spanId 'Span ID should derive from the event ID.'
Assert-Equal 'git status' $event.payload.command 'Payload should retain non-sensitive values.'

$genericIdArgsA = $eventArgs.Clone()
$genericIdArgsA.Payload = @{ command = 'git status'; id = 'generic-1' }
$genericIdArgsB = $eventArgs.Clone()
$genericIdArgsB.Payload = @{ command = 'git status'; id = 'generic-2' }
Assert-Equal `
    (New-AiHookEvent @genericIdArgsA).eventId `
    (New-AiHookEvent @genericIdArgsB).eventId `
    'Generic payload ID should not affect event identity.'

$toolCallArgsA = $eventArgs.Clone()
$toolCallArgsA.Payload = @{ command = 'git status'; toolCallId = 'tool-1' }
$toolCallArgsB = $eventArgs.Clone()
$toolCallArgsB.Payload = @{ command = 'git status'; toolCallId = 'tool-2' }
Assert-True `
    ((New-AiHookEvent @toolCallArgsA).eventId -ne (New-AiHookEvent @toolCallArgsB).eventId) `
    'Different tool call IDs should produce different event IDs.'

$identityInputCases = @(
    @{ Field = 'Provider'; Value = 'claude' },
    @{ Field = 'NativeEvent'; Value = 'PostToolUse' },
    @{ Field = 'SessionId'; Value = 'session-2' },
    @{ Field = 'SourceName'; Value = 'PowerShell' },
    @{ Field = 'Timestamp'; Value = '2026-06-06T01:00:01Z' }
)
foreach ($case in $identityInputCases) {
    $changedArgs = $eventArgs.Clone()
    $changedArgs[$case.Field] = $case.Value
    Assert-True `
        ($event.eventId -ne (New-AiHookEvent @changedArgs).eventId) `
        "Changing identity input should change event ID: $($case.Field)"
}

$allowedNames = @(
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
foreach ($name in $allowedNames) {
    $allowedArgs = $eventArgs.Clone()
    $allowedArgs.EventName = $name
    $allowed = New-AiHookEvent @allowedArgs
    Assert-Equal $name $allowed.eventName "Canonical event name should be allowed: $name"
}

Assert-ValidationError -Code 'unsupported_event_name' -Field 'eventName' -Action {
    $invalidArgs = $eventArgs.Clone()
    $invalidArgs.EventName = 'tool.unknown'
    New-AiHookEvent @invalidArgs
}
Assert-ValidationError -Code 'unsupported_event_name' -Field 'eventName' -Action {
    $invalidArgs = $eventArgs.Clone()
    $invalidArgs.EventName = 'TOOL.BEFORE'
    New-AiHookEvent @invalidArgs
}
Assert-ValidationError -Code 'required_field' -Field 'provider' -Action {
    $invalidArgs = $eventArgs.Clone()
    $invalidArgs.Remove('Provider')
    New-AiHookEvent @invalidArgs
}
Assert-ValidationError -Code 'required_field' -Field 'nativeEvent' -Action {
    $invalidArgs = $eventArgs.Clone()
    $invalidArgs.Remove('NativeEvent')
    New-AiHookEvent @invalidArgs
}
Assert-ValidationError -Code 'invalid_timestamp' -Field 'timestamp' -Action {
    $invalidArgs = $eventArgs.Clone()
    $invalidArgs.Timestamp = '06/06/2026 01:00'
    New-AiHookEvent @invalidArgs
}
Assert-ValidationError -Code 'invalid_mode' -Field 'mode' -Action {
    $invalidArgs = $eventArgs.Clone()
    $invalidArgs.Mode = 'audit'
    New-AiHookEvent @invalidArgs
}
Assert-ValidationError -Code 'invalid_mode' -Field 'mode' -Action {
    $invalidArgs = $eventArgs.Clone()
    $invalidArgs.Mode = 'ENFORCE'
    New-AiHookEvent @invalidArgs
}
$warnArgs = $eventArgs.Clone()
$warnArgs.Mode = 'warn'
Assert-Equal 'warn' (New-AiHookEvent @warnArgs).mode 'Warn should be a supported event mode.'

$oversizedPayload = @{ body = ('x' * 262145) }
Assert-ValidationError -Code 'request_too_large' -Field 'payload' -Action {
    $invalidArgs = $eventArgs.Clone()
    $invalidArgs.Payload = $oversizedPayload
    New-AiHookEvent @invalidArgs
}

$longText = 'x' * 5000
$sensitivePayload = @{
    token = 'top-secret'
    nested = @{
        Authorization = 'Bearer secret'
        api_key = 'key-value'
        note = $longText
    }
}
$redactedArgs = $eventArgs.Clone()
$redactedArgs.Payload = $sensitivePayload
$redacted = New-AiHookEvent @redactedArgs
Assert-Equal '[REDACTED]' $redacted.payload.token 'Token should be redacted.'
Assert-Equal '[REDACTED]' $redacted.payload.nested.Authorization 'Authorization should be redacted.'
Assert-Equal '[REDACTED]' $redacted.payload.nested.api_key 'API key should be redacted.'
Assert-Equal 4096 $redacted.payload.nested.note.Length 'Long strings should be truncated.'

$arrayArgs = $eventArgs.Clone()
$arrayArgs.Payload = @{
    empty = @()
    single = @('one')
    multiple = @('first', 'second', 'third')
}
$arrayEvent = New-AiHookEvent @arrayArgs
Assert-True ($arrayEvent.payload.empty -is [array]) 'Empty payload array should remain an array.'
Assert-Equal 0 $arrayEvent.payload.empty.Count 'Empty payload array should keep count zero.'
Assert-True ($arrayEvent.payload.single -is [array]) 'One-item payload array should remain an array.'
Assert-Equal 1 $arrayEvent.payload.single.Count 'One-item payload array should keep count one.'
Assert-Equal 'one' $arrayEvent.payload.single[0] 'One-item payload array should keep its value.'
Assert-True ($arrayEvent.payload.multiple -is [array]) 'Multi-item payload array should remain an array.'
Assert-Equal 3 $arrayEvent.payload.multiple.Count 'Multi-item payload array should keep its count.'
Assert-Equal 'first|second|third' ($arrayEvent.payload.multiple -join '|') 'Multi-item payload array should keep order.'

$deepPayload = @{ value = 'root' }
$cursor = $deepPayload
foreach ($level in 1..9) {
    $cursor.child = @{ value = "level-$level" }
    $cursor = $cursor.child
}
$depthArgs = $eventArgs.Clone()
$depthArgs.Payload = $deepPayload
$depthLimited = New-AiHookEvent @depthArgs
Assert-Equal '[MAX_DEPTH]' $depthLimited.payload.child.child.child.child.child.child.child.child.child 'Payload traversal should stop after depth 8.'

$decisionCases = @(
    @{ Decisions = @('allow', 'deny', 'ask', 'abstain'); Expected = 'deny' },
    @{ Decisions = @('allow', 'ask', 'abstain'); Expected = 'ask' },
    @{ Decisions = @('allow', 'abstain'); Expected = 'allow' },
    @{ Decisions = @('abstain'); Expected = 'abstain' }
)
foreach ($case in $decisionCases) {
    Assert-Equal `
        $case.Expected `
        (Merge-AiHookDecision -Decisions $case.Decisions) `
        "Decision precedence should resolve to $($case.Expected)."
}

$policyCandidates = @(
    [pscustomobject]@{
        decision = 'allow'
        reason = 'Known safe command.'
        warnings = @()
        policyId = 'policy-allow'
    },
    [pscustomobject]@{
        decision = 'deny'
        reason = 'Blocked by command policy.'
        warnings = @('Command matched a blocked pattern.')
        policyId = 'policy-deny'
    }
)

$observeResult = Invoke-AiHookPolicy -EventId $event.eventId -Mode 'observe' -Candidates $policyCandidates
Assert-Equal 'ai.hook.result.v1' $observeResult.schema 'Policy result should use the canonical schema.'
Assert-Equal $event.eventId $observeResult.eventId 'Policy result should retain the event ID.'
Assert-Equal 'observe' $observeResult.mode 'Observe result should retain its mode.'
Assert-Equal 'abstain' $observeResult.decision 'Observe mode should never block.'
Assert-True ($observeResult.warnings -is [array]) 'Warnings should always be an array.'
Assert-Equal 0 $observeResult.warnings.Count 'Observe mode should not promote candidate warnings.'
Assert-True ($observeResult.policyIds -is [array]) 'Policy IDs should always be an array.'
Assert-Equal 2 $observeResult.policyIds.Count 'Observe mode should retain evaluated policy IDs.'
Assert-Equal $false $observeResult.auditWritten 'Policy result should default auditWritten to false.'
Assert-Equal `
    'schema|eventId|mode|decision|reason|warnings|policyIds|auditWritten' `
    ($observeResult.psobject.Properties.Name -join '|') `
    'Policy result should expose only the canonical fields in order.'

$emptyResult = Invoke-AiHookPolicy -EventId $event.eventId -Mode 'enforce' -Candidates @()
Assert-Equal 'abstain' $emptyResult.decision 'Empty enforce candidates should resolve to abstain.'
Assert-True ([string]::IsNullOrEmpty([string]$emptyResult.reason)) 'Empty enforce candidates should not produce a reason.'
Assert-True ($emptyResult.warnings -is [array]) 'Empty warnings should remain an array.'
Assert-Equal 0 $emptyResult.warnings.Count 'Empty warnings should keep count zero.'
Assert-True ($emptyResult.policyIds -is [array]) 'Empty policy IDs should remain an array.'
Assert-Equal 0 $emptyResult.policyIds.Count 'Empty policy IDs should keep count zero.'

$inputWarnings = [object[]]@('warning-before')
$inputPolicyIds = [object[]]@('policy-before')
$copiedResult = New-AiHookResult `
    -EventId $event.eventId `
    -Mode 'warn' `
    -Decision 'abstain' `
    -Reason $null `
    -Warnings $inputWarnings `
    -PolicyIds $inputPolicyIds
$inputWarnings[0] = 'warning-after'
$inputPolicyIds[0] = 'policy-after'
Assert-Equal 'warning-before' $copiedResult.warnings[0] 'Canonical result should copy warnings.'
Assert-Equal 'policy-before' $copiedResult.policyIds[0] 'Canonical result should copy policy IDs.'

$warnResult = Invoke-AiHookPolicy -EventId $event.eventId -Mode 'warn' -Candidates $policyCandidates
Assert-Equal 'abstain' $warnResult.decision 'Warn mode should not block.'
Assert-Equal 1 $warnResult.warnings.Count 'Warn mode should retain candidate warnings.'
Assert-Equal 'Command matched a blocked pattern.' $warnResult.warnings[0] 'Warn mode should preserve warning text.'

$enforceCases = @(
    @{ Candidates = @([pscustomobject]@{ decision = 'allow'; reason = 'Allowed.'; warnings = @(); policyId = 'allow' }); Expected = 'allow' },
    @{ Candidates = @([pscustomobject]@{ decision = 'allow'; reason = 'Allowed.'; warnings = @(); policyId = 'allow' }, [pscustomobject]@{ decision = 'ask'; reason = 'Needs approval.'; warnings = @(); policyId = 'ask' }); Expected = 'ask' },
    @{ Candidates = $policyCandidates; Expected = 'deny' }
)
foreach ($case in $enforceCases) {
    $enforceResult = Invoke-AiHookPolicy -EventId $event.eventId -Mode 'enforce' -Candidates $case.Candidates
    Assert-Equal $case.Expected $enforceResult.decision "Enforce mode should aggregate to $($case.Expected)."
}

$singleArrayResult = Invoke-AiHookPolicy `
    -EventId $event.eventId `
    -Mode 'warn' `
    -Candidates @([pscustomobject]@{
        decision = 'abstain'
        reason = 'Context only.'
        warnings = @('Review context.')
        policyId = 'single-policy'
    })
Assert-True ($singleArrayResult.warnings -is [array]) 'One warning should remain an array.'
Assert-Equal 1 $singleArrayResult.warnings.Count 'One warning should keep count one.'
Assert-True ($singleArrayResult.policyIds -is [array]) 'One policy ID should remain an array.'
Assert-Equal 1 $singleArrayResult.policyIds.Count 'One policy ID should keep count one.'

$ruleEventArgs = $eventArgs.Clone()
$ruleEventArgs.Payload = @{ command = 'Remove-Item -Recurse -Force reports' }
$ruleEventArgs.Mode = 'enforce'
$ruleEvent = New-AiHookEvent @ruleEventArgs
$ruleCandidates = @(Invoke-AiHookRulePolicy -Event $ruleEvent -Rules @(
    [pscustomobject]@{
        policyId = 'deny-recursive-delete'
        eventName = 'tool.before'
        commandPattern = 'Remove-Item.*-Recurse'
        decision = 'deny'
        reason = 'Recursive delete commands require explicit approval.'
        warning = 'Recursive delete matched policy.'
    },
    [pscustomobject]@{
        policyId = 'non-matching'
        eventName = 'tool.completed'
        decision = 'deny'
        reason = 'Should not match.'
    }
))
Assert-Equal 1 $ruleCandidates.Count 'Rule policy should only return matching candidates.'
Assert-Equal 'deny-recursive-delete' $ruleCandidates[0].policyId 'Rule policy should retain policy ID.'
Assert-Equal 'deny' $ruleCandidates[0].decision 'Rule policy should retain decision.'
Assert-Equal 1 $ruleCandidates[0].warnings.Count 'Rule policy should retain warnings.'
$ruleResult = Invoke-AiHookPolicy -EventId $ruleEvent.eventId -Mode 'enforce' -Candidates $ruleCandidates
Assert-Equal 'deny' $ruleResult.decision 'Enforce mode should deny matching rule candidates.'
Assert-Equal 'Recursive delete commands require explicit approval.' $ruleResult.reason 'Enforce mode should return matching rule reason.'

$policyRuleRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-hook-policy-rules-" + [guid]::NewGuid().ToString())
try {
    New-Item -ItemType Directory -Path $policyRuleRoot -Force | Out-Null
    $policyRulePath = Join-Path $policyRuleRoot 'policy.json'
    Set-Content -LiteralPath $policyRulePath -Encoding utf8 -Value (@{
        rules = @(
            @{
                policyId = 'payload-secret'
                eventName = 'prompt.submitted'
                payloadContains = 'secret'
                decision = 'ask'
                reason = 'Prompt contains a sensitive marker.'
            }
        )
    } | ConvertTo-Json -Depth 6)
    $loadedRules = @(Read-AiHookPolicyRules -Path $policyRulePath)
    Assert-Equal 1 $loadedRules.Count 'Policy rules should load from JSON object with rules array.'
    $missingRules = @(Read-AiHookPolicyRules -Path (Join-Path $policyRuleRoot 'missing.json'))
    Assert-Equal 0 $missingRules.Count 'Missing policy rule file should produce no rules.'
}
finally {
    if (Test-Path -LiteralPath $policyRuleRoot) {
        Remove-Item -LiteralPath $policyRuleRoot -Recurse -Force
    }
}

Assert-ValidationError -Code 'invalid_decision' -Field 'decision' -Action {
    Merge-AiHookDecision -Decisions @('allow', 'block')
}
Assert-ValidationError -Code 'invalid_decision' -Field 'decision' -Action {
    Merge-AiHookDecision -Decisions @('DENY')
}
Assert-ValidationError -Code 'invalid_candidates' -Field 'candidates' -Action {
    Merge-AiHookDecision -Decisions $null
}
Assert-ValidationError -Code 'invalid_candidates' -Field 'candidates' -Action {
    Invoke-AiHookPolicy -EventId $event.eventId -Mode 'enforce' -Candidates $null
}
Assert-ValidationError -Code 'invalid_decision' -Field 'decision' -Action {
    Invoke-AiHookPolicy `
        -EventId $event.eventId `
        -Mode 'enforce' `
        -Candidates @([pscustomobject]@{ decision = 'block'; reason = 'Invalid.'; warnings = @(); policyId = 'invalid' })
}
Assert-ValidationError -Code 'invalid_mode' -Field 'mode' -Action {
    Invoke-AiHookPolicy -EventId $event.eventId -Mode 'audit' -Candidates @()
}
Assert-ValidationError -Code 'invalid_mode' -Field 'mode' -Action {
    Invoke-AiHookPolicy -EventId $event.eventId -Mode 'ENFORCE' -Candidates @()
}

$auditRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-hook-audit-test-" + [guid]::NewGuid().ToString())
try {
    $auditSettings = [pscustomobject]@{
        EventRoot = $auditRoot
        Format = 'jsonl'
        FilenamePattern = 'yyyyMMdd_filename'
        TimeZone = [TimeZoneInfo]::Utc
    }

    $auditResult = Write-AiHookAuditEvent -Event $event -Settings $auditSettings
    Assert-True $auditResult.auditWritten 'Canonical audit should write the first event.'
    Assert-True (Test-Path -LiteralPath $auditResult.file) 'Canonical audit file should exist.'
    $auditRows = @(Get-Content -LiteralPath $auditResult.file | ForEach-Object { $_ | ConvertFrom-Json })
    Assert-Equal 1 $auditRows.Count 'Canonical audit should write one JSONL row.'
    Assert-Equal 'ai.hook.event.v1' $auditRows[0].schema 'Canonical audit should preserve schema.'
    Assert-Equal $event.eventId $auditRows[0].eventId 'Canonical audit should preserve event ID.'

    $duplicateResult = Write-AiHookAuditEvent -Event $event -Settings $auditSettings
    Assert-True (-not $duplicateResult.auditWritten) 'Duplicate canonical event should not be written twice.'
    Assert-True $duplicateResult.skipped 'Duplicate canonical event should report skipped.'
    $dedupedRows = @(Get-Content -LiteralPath $auditResult.file)
    Assert-Equal 1 $dedupedRows.Count 'Duplicate canonical event should keep one JSONL row.'

    $invalidRoot = Join-Path $auditRoot 'not-a-directory'
    Set-Content -LiteralPath $invalidRoot -Value 'file blocks directory creation' -Encoding utf8
    $observeAuditFailure = Write-AiHookAuditEvent `
        -Event $event `
        -Settings ([pscustomobject]@{
            EventRoot = (Join-Path $invalidRoot 'child')
            Format = 'jsonl'
            FilenamePattern = 'yyyyMMdd_filename'
            TimeZone = [TimeZoneInfo]::Utc
        })
    Assert-True (-not $observeAuditFailure.auditWritten) 'Observe audit failure should not throw.'
    Assert-Equal 'audit_failed' $observeAuditFailure.reason 'Observe audit failure should return a stable reason.'
}
finally {
    if (Test-Path -LiteralPath $auditRoot) {
        Remove-Item -LiteralPath $auditRoot -Recurse -Force
    }
}

$stageRecorder = New-Object 'System.Collections.Generic.List[string]'
$pipelineResult = Invoke-AiHookPipeline -Event $event -StageRecorder $stageRecorder
Assert-Equal `
    'normalize|validate|deduplicate|correlate|policy|audit|flow' `
    ($stageRecorder.ToArray() -join '|') `
    'Pipeline stages should run in the expected order.'
Assert-Equal 'ai.hook.result.v1' $pipelineResult.schema 'Pipeline should return a canonical result.'
Assert-Equal 'abstain' $pipelineResult.decision 'Pipeline default observe mode should abstain.'

$pipelineFailureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-hook-pipeline-failure-" + [guid]::NewGuid().ToString())
try {
    Set-Content -LiteralPath $pipelineFailureRoot -Value 'file blocks directory creation' -Encoding utf8
    $pipelineAuditFailure = Invoke-AiHookPipeline `
        -Event $event `
        -AuditSettings ([pscustomobject]@{
            EventRoot = (Join-Path $pipelineFailureRoot 'child')
            Format = 'jsonl'
            FilenamePattern = 'yyyyMMdd_filename'
            TimeZone = [TimeZoneInfo]::Utc
        })
    Assert-Equal 'abstain' $pipelineAuditFailure.decision 'Observe pipeline should still abstain when audit fails.'
    Assert-True (-not $pipelineAuditFailure.auditWritten) 'Observe pipeline should report auditWritten false when audit fails.'
}
finally {
    if (Test-Path -LiteralPath $pipelineFailureRoot) {
        Remove-Item -LiteralPath $pipelineFailureRoot -Force
    }
}

$httpAbstainResult = Invoke-AiHookHttpClient `
    -Event $event `
    -Url 'http://127.0.0.1:1/v1/events' `
    -TimeoutMs 250 `
    -FailureMode 'abstain'
Assert-Equal 'ai.hook.result.v1' $httpAbstainResult.schema 'HTTP client abstain failure should return canonical result.'
Assert-Equal 'abstain' $httpAbstainResult.decision 'HTTP client abstain failure should abstain.'
Assert-Equal 'http_unavailable' $httpAbstainResult.reason 'HTTP client abstain failure should use stable reason.'

$fallbackCalled = $false
$httpFallbackResult = Invoke-AiHookHttpClient `
    -Event $event `
    -Url 'http://127.0.0.1:1/v1/events' `
    -TimeoutMs 250 `
    -FailureMode 'fallback-cli' `
    -Fallback {
        param($fallbackEvent)
        $script:fallbackCalled = $true
        New-AiHookResult -EventId $fallbackEvent.eventId -Mode $fallbackEvent.mode -Decision 'allow' -Reason 'fallback'
    }
Assert-True $fallbackCalled 'HTTP client fallback mode should invoke fallback callback.'
Assert-Equal 'allow' $httpFallbackResult.decision 'HTTP client fallback mode should return fallback result.'

try {
    Invoke-AiHookHttpClient `
        -Event $event `
        -Url 'http://127.0.0.1:1/v1/events' `
        -TimeoutMs 250 `
        -FailureMode 'fail' | Out-Null
    throw 'Expected HTTP client fail mode to throw.'
} catch {
    Assert-True ($_.Exception.Message -ne 'Expected HTTP client fail mode to throw.') 'HTTP client fail mode should rethrow transport errors.'
}

$invokeHook = Join-Path $PSScriptRoot '../bin/invoke-hook.ps1'
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = 'powershell'
$processInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$invokeHook`""
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$process = [System.Diagnostics.Process]::Start($processInfo)
$process.StandardInput.WriteLine('{not-json}')
$process.StandardInput.Close()
$badJsonStdout = $process.StandardOutput.ReadToEnd()
$badJsonStderr = $process.StandardError.ReadToEnd()
$process.WaitForExit()
Assert-True ($process.ExitCode -ne 0) 'Malformed CLI JSON should exit non-zero.'
Assert-Equal '' $badJsonStdout.Trim() 'Malformed CLI JSON should not write to stdout.'
Assert-True ($badJsonStderr.Contains('"schema":"ai.hook.error.v1"')) 'Malformed CLI JSON should write structured JSON error.'
Assert-True ($badJsonStderr.Contains('"code":"invalid_json"')) 'Malformed CLI JSON should use invalid_json code.'

$goodProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
$goodProcessInfo.FileName = 'powershell'
$goodProcessInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$invokeHook`""
$goodProcessInfo.RedirectStandardInput = $true
$goodProcessInfo.RedirectStandardOutput = $true
$goodProcessInfo.RedirectStandardError = $true
$goodProcessInfo.UseShellExecute = $false
$goodProcess = [System.Diagnostics.Process]::Start($goodProcessInfo)
$goodProcess.StandardInput.WriteLine(($event | ConvertTo-Json -Compress -Depth 20))
$goodProcess.StandardInput.Close()
$goodStdout = $goodProcess.StandardOutput.ReadToEnd()
$goodStderr = $goodProcess.StandardError.ReadToEnd()
$goodProcess.WaitForExit()
Assert-Equal 0 $goodProcess.ExitCode 'Valid CLI JSON should exit zero.'
Assert-Equal '' $goodStderr.Trim() 'Valid CLI JSON should not write stderr.'
$goodResult = $goodStdout | ConvertFrom-Json
Assert-Equal 'ai.hook.result.v1' $goodResult.schema 'Valid CLI JSON should write one canonical result.'
Assert-Equal 'abstain' $goodResult.decision 'Valid CLI JSON should default to abstain.'

Write-Output 'hook core tests passed.'
