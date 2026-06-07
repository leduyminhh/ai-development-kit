param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Equal {
    param([object]$Expected, [object]$Actual, [string]$Message)
    if ($Expected -ne $Actual) {
        throw "$Message Expected=[$Expected] Actual=[$Actual]"
    }
}

function Invoke-WithRetry {
    param(
        [scriptblock]$Script,
        [int]$Attempts = 20,
        [int]$DelayMs = 250
    )

    $lastError = $null
    for ($index = 0; $index -lt $Attempts; $index++) {
        try {
            return & $Script
        } catch {
            $lastError = $_
            Start-Sleep -Milliseconds $DelayMs
        }
    }

    throw $lastError
}

function Assert-HttpError {
    param(
        [scriptblock]$Script,
        [int]$StatusCode,
        [string]$Message
    )

    try {
        & $Script | Out-Null
    } catch {
        $actual = if ($null -ne $_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        Assert-Equal $StatusCode $actual $Message
        return
    }

    throw "$Message Expected HTTP $StatusCode but request succeeded."
}

$script = Join-Path $Root 'scripts/hook-service.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-hook-service-" + [guid]::NewGuid().ToString())
$configPath = Join-Path $tempRoot '.codex/config.toml'

try {
    $env:AI_HOOK_TEST_TOKEN = 'team-secret'
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex/hooks') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'reports/audit/runtime/20200101') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'reports/audit/runtime/20200101/stale.log') -Encoding utf8 -Value 'stale'
    (Get-Item -LiteralPath (Join-Path $tempRoot 'reports/audit/runtime/20200101/stale.log')).LastWriteTimeUtc = [datetime]::UtcNow.AddDays(-10)
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/hooks/policy.json') -Encoding utf8 -Value (@{
        rules = @(
            @{
                policyId = 'deny-recursive-delete'
                eventName = 'tool.before'
                commandPattern = 'Remove-Item.*-Recurse'
                decision = 'deny'
                reason = 'Recursive delete commands require explicit approval.'
                warning = 'Recursive delete matched policy.'
            }
        )
    } | ConvertTo-Json -Depth 6)

    Set-Content -LiteralPath $configPath -Encoding utf8 -Value @'
[hooks.project]
enabled = true
host = "127.0.0.1"
port = 42891
path = "reports/audit"
runtimePath = "reports/audit/runtime"
filenamePattern = "yyyyMMdd_filename"
remainingDays = 2
format = "text"
serviceName = "codex-workflow-kit"
defaultLogger = "codex.project"
defaultTimezone = "Asia/Saigon"
agentHook = ".codex/hooks/log-agent-event.ps1"
reloadOnConfigChange = true

[hooks.core]
enabled = true
mode = "observe"
transport = "cli"
timeoutMs = 1500
failureMode = "abstain"

[hooks.http]
url = "http://127.0.0.1:42891/v1/events"
sharedTokenEnv = ""
teamId = "team-alpha"
projectId = "project-one"
clientName = "local-test"
maxRequestBytes = 4096

[hooks.policy]
enabled = true
path = ".codex/hooks/policy.json"

[agent_registry.java-analyze]
path = ".codex/agents/java-analyze.toml"
read_only = false
enabled = true
hooks_project_enabled = true
'@

    $start = & powershell -NoProfile -ExecutionPolicy Bypass -File $script -Action start -Root $tempRoot
    $startState = ($start -join "`n") | ConvertFrom-Json
    Assert-True $startState.running 'Service should be running after start.'
    Assert-Equal 42891 $startState.port 'Service should bind configured port.'

    $health = Invoke-WithRetry -Script {
        Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:42891/health'
    }
    Assert-Equal 'ok' $health.status 'Health endpoint should report ok.'

    $todayFolder = Join-Path $tempRoot ('reports/audit/runtime/' + (Get-Date).ToString('yyyyMMdd', [Globalization.CultureInfo]::InvariantCulture))
    Assert-True (Test-Path -LiteralPath (Join-Path $todayFolder 'hook-service.log')) 'Service should write runtime log under runtime/yyyyMMdd.'
    Assert-True (Test-Path -LiteralPath (Join-Path $todayFolder 'hook-service.state.json')) 'Service should write runtime state under runtime/yyyyMMdd.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $tempRoot 'reports/audit/runtime/20200101'))) 'Retention should remove empty stale runtime day folders.'

    $eventResult = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:42891/events' -ContentType 'application/json' -Body (@{
        eventName = 'agent.execution'
        sourceType = 'agent'
        sourceName = 'java-analyze'
        message = 'Review payment flow'
        status = 'completed'
        traceId = 'trace-42891'
        spanId = 'span-42891'
        startAt = '2026-04-21T01:00:00Z'
        endAt = '2026-04-21T01:05:00Z'
        cost = 1.5
        properties = @{
            agentName = 'java-analyze'
            model = 'gpt-5.4'
            reasoning = 'high'
        }
    } | ConvertTo-Json -Depth 6)

    Assert-True $eventResult.written 'Enabled agent event should be written.'
    $eventFile = Join-Path $tempRoot 'reports/audit/20260421_java-analyze.log'
    Assert-True (Test-Path -LiteralPath $eventFile) 'Service should write event log into reports/audit.'
    $line = Get-Content -LiteralPath $eventFile | Select-Object -First 1
    Assert-True ($line.Contains('eventName=agent.execution')) 'Service-written event should keep structured fields.'

    $canonicalResult = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:42891/v1/events' -ContentType 'application/json' -Body (@{
        provider = 'codex'
        nativeEvent = 'UserPromptSubmit'
        eventName = 'prompt.submitted'
        sessionId = 'hook-service-session'
        sourceName = 'codex'
        timestamp = '2026-04-21T03:00:00Z'
        payload = @{
            prompt = 'Check project flow'
            token = 'secret-value'
        }
    } | ConvertTo-Json -Depth 6)

    Assert-Equal 'ai.hook.result.v1' $canonicalResult.schema 'Canonical endpoint should return canonical result schema.'
    Assert-Equal 'abstain' $canonicalResult.decision 'Audit-only canonical event should abstain.'
    Assert-True $canonicalResult.auditWritten 'Canonical endpoint should write JSONL audit.'
    $canonicalFile = Join-Path $tempRoot 'reports/audit/20260421_codex.jsonl'
    Assert-True (Test-Path -LiteralPath $canonicalFile) 'Canonical endpoint should write JSONL event log.'
    $canonicalLine = Get-Content -LiteralPath $canonicalFile | Select-Object -First 1
    $canonicalEvent = $canonicalLine | ConvertFrom-Json
    Assert-Equal 'team-alpha' $canonicalEvent.teamId 'Canonical endpoint should apply configured team id.'
    Assert-Equal 'project-one' $canonicalEvent.projectId 'Canonical endpoint should apply configured project id.'
    Assert-Equal 'local-test' $canonicalEvent.clientName 'Canonical endpoint should apply configured client name.'
    Assert-Equal '[REDACTED]' $canonicalEvent.payload.token 'Canonical endpoint should redact secrets before audit.'

    Assert-HttpError -StatusCode 400 -Message 'Canonical endpoint should reject malformed JSON.' -Script {
        Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:42891/v1/events' -ContentType 'application/json' -Body '{'
    }

    $policyResult = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:42891/v1/events' -ContentType 'application/json' -Body (@{
        provider = 'codex'
        nativeEvent = 'PreToolUse'
        eventName = 'tool.before'
        mode = 'enforce'
        sessionId = 'hook-service-session'
        sourceName = 'PowerShell'
        timestamp = '2026-04-21T03:30:00Z'
        payload = @{
            command = 'Remove-Item -LiteralPath reports -Recurse -Force'
        }
    } | ConvertTo-Json -Depth 6)
    Assert-Equal 'deny' $policyResult.decision 'Canonical endpoint should enforce matching deny policy.'
    Assert-Equal 'Recursive delete commands require explicit approval.' $policyResult.reason 'Canonical endpoint should return deny policy reason.'
    Assert-Equal 1 $policyResult.warnings.Count 'Canonical endpoint should include matching policy warning in enforce mode.'

    Set-Content -LiteralPath $configPath -Encoding utf8 -Value @'
[hooks.project]
enabled = true
host = "127.0.0.1"
port = 42891
path = "reports/audit"
runtimePath = "reports/audit/runtime"
filenamePattern = "yyyyMMdd_filename"
remainingDays = 2
format = "text"
serviceName = "codex-workflow-kit"
defaultLogger = "codex.project"
defaultTimezone = "Asia/Saigon"
agentHook = ".codex/hooks/log-agent-event.ps1"
reloadOnConfigChange = true

[hooks.core]
enabled = true
mode = "observe"
transport = "cli"
timeoutMs = 1500
failureMode = "abstain"

[hooks.http]
url = "http://127.0.0.1:42891/v1/events"
sharedTokenEnv = "AI_HOOK_TEST_TOKEN"
teamId = "team-alpha"
projectId = "project-one"
clientName = "local-test"
maxRequestBytes = 64

[hooks.policy]
enabled = true
path = ".codex/hooks/policy.json"

[agent_registry.java-analyze]
path = ".codex/agents/java-analyze.toml"
read_only = false
enabled = true
hooks_project_enabled = false
'@
    Assert-HttpError -StatusCode 401 -Message 'Canonical endpoint should reject missing shared token when configured.' -Script {
        Invoke-WithRetry -Script {
            Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:42891/v1/events' -ContentType 'application/json' -Body (@{
                provider = 'codex'
                nativeEvent = 'UserPromptSubmit'
                eventName = 'prompt.submitted'
                sessionId = 'hook-service-session'
                sourceName = 'codex'
                timestamp = '2026-04-21T04:00:00Z'
                payload = @{ prompt = 'missing token' }
            } | ConvertTo-Json -Depth 5)
        }
    }

    Assert-HttpError -StatusCode 413 -Message 'Canonical endpoint should reject oversized requests.' -Script {
        Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:42891/v1/events' -ContentType 'application/json' -Headers @{ 'X-AI-Hook-Token' = 'team-secret' } -Body ('{"large":"' + ('x' * 200) + '"}')
    }

    $skippedEvent = Invoke-WithRetry -Script {
        $result = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:42891/events' -ContentType 'application/json' -Body (@{
            eventName = 'agent.execution'
            sourceType = 'agent'
            sourceName = 'java-analyze'
            message = 'Disabled hook should skip'
            status = 'completed'
            startAt = '2026-04-21T02:00:00Z'
        } | ConvertTo-Json -Depth 4)

        if (-not $result.skipped) {
            throw 'Waiting for auto reload to disable the agent hook.'
        }

        return $result
    }

    Assert-True $skippedEvent.skipped 'Auto reload should disable future agent events.'

    $reloadResult = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:42891/reload'
    Assert-Equal 'reloaded' $reloadResult.status 'Reload endpoint should acknowledge reload.'

    $status = & powershell -NoProfile -ExecutionPolicy Bypass -File $script -Action status -Root $tempRoot
    $statusState = ($status -join "`n") | ConvertFrom-Json
    Assert-True $statusState.running 'Status command should report a running service.'
    Assert-Equal 42891 $statusState.port 'Status command should report current port.'

    $stop = & powershell -NoProfile -ExecutionPolicy Bypass -File $script -Action stop -Root $tempRoot
    $stopState = ($stop -join "`n") | ConvertFrom-Json
    Assert-Equal 'stopped' $stopState.status 'Stop command should stop the service.'

    $finalStatus = & powershell -NoProfile -ExecutionPolicy Bypass -File $script -Action status -Root $tempRoot
    $finalState = ($finalStatus -join "`n") | ConvertFrom-Json
    Assert-True (-not $finalState.running) 'Status should report stopped after stop.'

    Write-Output 'hook-service tests passed'
} finally {
    Remove-Item Env:\AI_HOOK_TEST_TOKEN -ErrorAction SilentlyContinue

    try {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $script -Action stop -Root $tempRoot | Out-Null
    } catch {
    }

    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
