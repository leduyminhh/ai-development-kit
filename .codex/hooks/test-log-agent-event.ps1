param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path)

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

$script = Join-Path $Root '.codex/hooks/log-agent-event.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-project-hook-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[hooks.project]
enabled = true
path = "reports/audit"
filenamePattern = "yyyyMMdd_filename"
format = "text"
serviceName = "codex-workflow-kit"
defaultLogger = "codex.project"
defaultTimezone = "Asia/Saigon"
agentHook = ".codex/hooks/log-agent-event.ps1"

[agent_registry.java-analyze]
path = ".codex/agents/java-analyze.toml"
read_only = false
enabled = true
hooks_project_enabled = true

[agent_registry.react-code-generate]
path = ".codex/agents/react-code-generate.toml"
read_only = false
enabled = true
hooks_project_enabled = true

[agent_registry.test-qa-review]
path = ".codex/agents/test-qa-review.toml"
read_only = false
enabled = true
hooks_project_enabled = true
'@

    $eventRoot = Join-Path $tempRoot 'reports/audit'
    Get-ChildItem -LiteralPath $eventRoot -Filter '*.log' -File -ErrorAction SilentlyContinue |
        Remove-Item -Force

    & $script `
        -Root $tempRoot `
        -SessionId '11111111-1111-1111-1111-111111111111' `
        -AgentName 'java-analyze' `
        -Model 'gpt-5.4' `
        -Reasoning 'high' `
        -Message 'Review payment flow' `
        -StartAt '2026-04-15T00:00:00Z' `
        -EndAt '2026-04-15T00:05:00Z' `
        -Status 'completed' `
        -Cost 1.25 `
        -RemainingDays 7 `
        -TraceId 'trace-111' `
        -SpanId 'span-111' | Out-Null

    $expectedFile = Join-Path $eventRoot '20260415_java-analyze.log'
    Assert-True (Test-Path -LiteralPath $expectedFile) 'Project event log should be created using yyyyMMdd_filename.log in reports/audit.'

    $rows = @(Get-Content -LiteralPath $expectedFile)
    Assert-Equal 1 $rows.Count 'Project event log should contain exactly one row.'
    $line = $rows[0]
    Assert-True ($line.StartsWith('2026-04-15T07:00:00+07:00 [INFO] [codex-workflow-kit] [java-analyze] [trace-111] codex.project.agent - Review payment flow | ')) 'Text log prefix mismatch.'
    Assert-True ($line.Contains('schema=codex.project.event.v1')) 'Schema field mismatch.'
    Assert-True ($line.Contains('service=codex-workflow-kit')) 'Service field mismatch.'
    Assert-True ($line.Contains('eventName=agent.execution')) 'Event name field mismatch.'
    Assert-True ($line.Contains('eventVersion=1.0')) 'Event version field mismatch.'
    Assert-True ($line.Contains('level=info')) 'Level field mismatch.'
    Assert-True ($line.Contains('sessionId=11111111-1111-1111-1111-111111111111')) 'Session ID field mismatch.'
    Assert-True ($line.Contains('sourceType=agent')) 'sourceType field mismatch.'
    Assert-True ($line.Contains('sourceName=java-analyze')) 'sourceName field mismatch.'
    Assert-True ($line.Contains('agentName=java-analyze')) 'Agent name field mismatch.'
    Assert-True ($line.Contains('model=gpt-5.4')) 'Model field mismatch.'
    Assert-True ($line.Contains('reasoning=high')) 'Reasoning field mismatch.'
    Assert-True ($line.Contains('message="Review payment flow"')) 'Message field mismatch.'
    Assert-True ($line.Contains('startAt=2026-04-15T00:00:00Z')) 'startAt field mismatch.'
    Assert-True ($line.Contains('endAt=2026-04-15T00:05:00Z')) 'endAt field mismatch.'
    Assert-True ($line.Contains('timestamp=2026-04-15T00:05:00Z')) 'timestamp field mismatch.'
    Assert-True ($line.Contains('durationMs=300000')) 'durationMs field mismatch.'
    Assert-True ($line.Contains('status=completed')) 'Status field mismatch.'
    Assert-True ($line.Contains('cost=1.25')) 'Cost field mismatch.'
    Assert-True ($line.Contains('traceId=trace-111')) 'Trace ID field mismatch.'
    Assert-True ($line.Contains('spanId=span-111')) 'Span ID field mismatch.'
    Assert-True ($line.Contains('timezone=Asia/Saigon')) 'Timezone field mismatch.'

    & $script `
        -Root $tempRoot `
        -AgentName 'react-code-generate' `
        -Model 'gpt-5.4' `
        -Reasoning 'medium' `
        -Message 'Build checkout UI' `
        -StartAt '2026-04-16T01:00:00Z' `
        -Status 'started' `
        -RemainingDays 7 | Out-Null

    $secondFile = Join-Path $eventRoot '20260416_react-code-generate.log'
    $secondRows = @(Get-Content -LiteralPath $secondFile)
    Assert-True ($secondRows[0] -match 'sessionId=([0-9a-fA-F-]{36})') 'Missing sessionId should generate a UUID.'
    Assert-True ([guid]::TryParse($Matches[1], [ref]([guid]::Empty))) 'Generated sessionId should be a UUID.'
    Assert-True ($secondRows[0].Contains('cost=0')) 'Missing cost should default to 0.'
    Assert-True ($secondRows[0].Contains('traceId=-')) 'Missing traceId should default to dash.'
    Assert-True ($secondRows[0].Contains('spanId=-')) 'Missing spanId should default to dash.'

    & $script `
        -Root $tempRoot `
        -SessionId '66666666-6666-6666-6666-666666666666' `
        -AgentName 'react-code-generate' `
        -Model 'gpt-5.4' `
        -Reasoning 'medium' `
        -Message 'Verify jsonl compatibility' `
        -StartAt '2026-04-19T01:00:00Z' `
        -Status 'completed' `
        -RemainingDays 7 `
        -Format jsonl | Out-Null

    $jsonFile = Join-Path $eventRoot '20260419_react-code-generate.jsonl'
    $jsonRows = @(Get-Content -LiteralPath $jsonFile | ForEach-Object { $_ | ConvertFrom-Json })
    Assert-Equal 'codex.project.event.v1' $jsonRows[0].schema 'JSONL compatibility should keep schema.'

    & $script `
        -Root $tempRoot `
        -SessionId '55555555-5555-5555-5555-555555555555' `
        -AgentName 'test-qa-review' `
        -Model 'gpt-5.4' `
        -Reasoning 'low' `
        -Message 'Verify csv compatibility' `
        -StartAt '2026-04-18T01:00:00Z' `
        -Status 'failed' `
        -RemainingDays 7 `
        -Format csv | Out-Null

    $csvFile = Join-Path $eventRoot '20260418_test-qa-review.csv'
    $csvRows = @(Import-Csv -LiteralPath $csvFile)
    Assert-Equal 'error' $csvRows[0].level 'CSV compatibility should keep structured level.'
    Assert-Equal 'codex.project.event.v1' $csvRows[0].schema 'CSV compatibility should keep schema.'

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[hooks.project]
enabled = false
path = "reports/audit"
filenamePattern = "yyyyMMdd_filename"
format = "text"
serviceName = "codex-workflow-kit"
defaultLogger = "codex.project"
defaultTimezone = "Asia/Saigon"
agentHook = ".codex/hooks/log-agent-event.ps1"

[agent_registry.java-analyze]
path = ".codex/agents/java-analyze.toml"
read_only = false
enabled = true
hooks_project_enabled = true
'@

    $disabledOutput = & $script `
        -Root $tempRoot `
        -AgentName 'java-analyze' `
        -Model 'gpt-5.4' `
        -Reasoning 'high' `
        -Message 'Disabled hook should skip' `
        -StartAt '2026-04-20T01:00:00Z'

    Assert-Equal 'Skipped: project hooks are disabled.' ($disabledOutput | Select-Object -Last 1) 'Disabled hook should exit early with skip message.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $eventRoot '20260420_java-analyze.log'))) 'Disabled hook should not create any log file.'

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[hooks.project]
enabled = true
path = "reports/audit"
filenamePattern = "yyyyMMdd_filename"
format = "text"
serviceName = "codex-workflow-kit"
defaultLogger = "codex.project"
defaultTimezone = "Asia/Saigon"
agentHook = ".codex/hooks/log-agent-event.ps1"

[agent_registry.java-analyze]
path = ".codex/agents/java-analyze.toml"
read_only = false
enabled = true
hooks_project_enabled = false
'@

    $agentDisabledOutput = & $script `
        -Root $tempRoot `
        -AgentName 'java-analyze' `
        -Model 'gpt-5.4' `
        -Reasoning 'high' `
        -Message 'Disabled agent hook should skip' `
        -StartAt '2026-04-21T01:00:00Z'

    Assert-Equal 'Skipped: project hook is disabled for agent java-analyze.' ($agentDisabledOutput | Select-Object -Last 1) 'Disabled agent hook should exit early with skip message.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $eventRoot '20260421_java-analyze.log'))) 'Disabled agent hook should not create any log file.'

    Write-Output 'log-agent-event tests passed'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
