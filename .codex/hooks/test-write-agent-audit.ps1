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

$script = Join-Path $Root '.codex/hooks/write-agent-audit.ps1'
$auditRoot = Join-Path $Root '.codex/hooks'

Get-ChildItem -LiteralPath $auditRoot -Filter '*_action.*' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force

& $script `
    -AuditRoot $auditRoot `
    -SessionId '11111111-1111-1111-1111-111111111111' `
    -AgentName 'java-analyze' `
    -Model 'gpt-5.4' `
    -Reasoning 'high' `
    -SummaryJob 'Review payment flow' `
    -StartAt '2026-04-15T00:00:00Z' `
    -EndAt '2026-04-15T00:05:00Z' `
    -Status 'completed' `
    -Cost 1.25 `
    -RemainingDays 7 `
    -TraceId 'trace-111' `
    -SpanId 'span-111'

$expectedFile = Join-Path $auditRoot '260415_action.log'
Assert-True (Test-Path -LiteralPath $expectedFile) 'Audit file was not created using yyMMdd_action.log.'

$rows = @(Get-Content -LiteralPath $expectedFile)
Assert-Equal 1 $rows.Count 'Audit file should contain exactly one row.'
$line = $rows[0]
Assert-True ($line.StartsWith('2026-04-15T07:00:00+07:00 [INFO] [codex-agent] [java-analyze] [11111111-1111-1111-1111-111111111111] [trace-111] [span-111] codex.agent.audit - Review payment flow | ')) 'Text log prefix mismatch.'
Assert-True ($line.Contains('schema=codex.agent.audit.v1')) 'Schema field mismatch.'
Assert-True ($line.Contains('service=codex-agent')) 'Service field mismatch.'
Assert-True ($line.Contains('eventName=agent.execution')) 'Event name field mismatch.'
Assert-True ($line.Contains('eventVersion=1.0')) 'Event version field mismatch.'
Assert-True ($line.Contains('level=info')) 'Level field mismatch.'
Assert-True ($line.Contains('sessionId=11111111-1111-1111-1111-111111111111')) 'Session ID field mismatch.'
Assert-True ($line.Contains('agentName=java-analyze')) 'Agent name field mismatch.'
Assert-True ($line.Contains('model=gpt-5.4')) 'Model field mismatch.'
Assert-True ($line.Contains('reasoning=high')) 'Reasoning field mismatch.'
Assert-True ($line.Contains('summaryJob="Review payment flow"')) 'Summary job field mismatch.'
Assert-True ($line.Contains('startTime=2026-04-15T07:00:00+07:00')) 'startTime field mismatch.'
Assert-True ($line.Contains('endTime=2026-04-15T07:05:00+07:00')) 'endTime field mismatch.'
Assert-True ($line.Contains('startAt=2026-04-15T00:00:00Z')) 'startAt field mismatch.'
Assert-True ($line.Contains('endAt=2026-04-15T00:05:00Z')) 'endAt field mismatch.'
Assert-True ($line.Contains('timestamp=2026-04-15T00:05:00Z')) 'timestamp field mismatch.'
Assert-True ($line.Contains('durationMs=300000')) 'durationMs field mismatch.'
Assert-True ($line.Contains('status=completed')) 'Status field mismatch.'
Assert-True ($line.Contains('cost=1.25')) 'Cost field mismatch.'
Assert-True ($line.Contains('traceId=trace-111')) 'Trace ID field mismatch.'
Assert-True ($line.Contains('spanId=span-111')) 'Span ID field mismatch.'
Assert-True ($line.Contains('timezone=Asia/Ho_Chi_Minh')) 'Timezone field mismatch.'

& $script `
    -AuditRoot $auditRoot `
    -AgentName 'react-code-generate' `
    -Model 'gpt-5.4' `
    -Reasoning 'medium' `
    -SummaryJob 'Build checkout UI' `
    -StartAt '2026-04-16T01:00:00Z' `
    -Status 'started' `
    -RemainingDays 7

$secondFile = Join-Path $auditRoot '260416_action.log'
$secondRows = @(Get-Content -LiteralPath $secondFile)
Assert-True ($secondRows[0] -match 'sessionId=([0-9a-fA-F-]{36})') 'Missing sessionId should generate a UUID.'
Assert-True ([guid]::TryParse($Matches[1], [ref]([guid]::Empty))) 'Generated sessionId should be a UUID.'
Assert-True ($secondRows[0].Contains('cost=0')) 'Missing cost should default to 0.'
Assert-True ($secondRows[0].Contains('traceId=-')) 'Missing traceId should default to dash.'
Assert-True ($secondRows[0].Contains('spanId=-')) 'Missing spanId should default to dash.'

& $script `
    -AuditRoot $auditRoot `
    -SessionId '22222222-2222-2222-2222-222222222222' `
    -AgentName 'code-design-pattern' `
    -Model 'gpt-5.4' `
    -Reasoning 'high' `
    -SummaryJob 'Verify local date file naming' `
    -StartAt '2026-04-14T18:00:00Z' `
    -Status 'completed' `
    -RemainingDays 7

$localDateFile = Join-Path $auditRoot '260415_action.log'
$localDateRows = @(Get-Content -LiteralPath $localDateFile)
Assert-True (($localDateRows -join "`n").Contains('sessionId=22222222-2222-2222-2222-222222222222')) 'Audit filename should use Asia/Ho_Chi_Minh local date, not UTC date.'

$oldFile = Join-Path $auditRoot '260101_action.log'
New-Item -ItemType File -Path $oldFile -Force | Out-Null
(Get-Item -LiteralPath $oldFile).LastWriteTimeUtc = (Get-Date).ToUniversalTime().AddDays(-10)

& $script `
    -AuditRoot $auditRoot `
    -AgentName 'test-qa-review' `
    -Model 'gpt-5.4' `
    -Reasoning 'low' `
    -SummaryJob 'Cleanup old audit files' `
    -StartAt '2026-04-17T01:00:00Z' `
    -Status 'completed' `
    -RemainingDays 7

Assert-True (-not (Test-Path -LiteralPath $oldFile)) 'Old audit file should be deleted after remainingDays.'

& $script `
    -AuditRoot $auditRoot `
    -SessionId '66666666-6666-6666-6666-666666666666' `
    -AgentName 'react-code-generate' `
    -Model 'gpt-5.4' `
    -Reasoning 'medium' `
    -SummaryJob 'Verify jsonl compatibility' `
    -StartAt '2026-04-19T01:00:00Z' `
    -Status 'completed' `
    -RemainingDays 7 `
    -Format jsonl

$jsonFile = Join-Path $auditRoot '260419_action.jsonl'
$jsonRows = @(Get-Content -LiteralPath $jsonFile | ForEach-Object { $_ | ConvertFrom-Json })
Assert-Equal 'codex.agent.audit.v1' $jsonRows[0].schema 'JSONL compatibility should keep schema.'

& $script `
    -AuditRoot $auditRoot `
    -SessionId '55555555-5555-5555-5555-555555555555' `
    -AgentName 'test-qa-review' `
    -Model 'gpt-5.4' `
    -Reasoning 'low' `
    -SummaryJob 'Verify csv compatibility' `
    -StartAt '2026-04-18T01:00:00Z' `
    -Status 'failed' `
    -RemainingDays 7 `
    -Format csv

$csvFile = Join-Path $auditRoot '260418_action.csv'
$csvRows = @(Import-Csv -LiteralPath $csvFile)
Assert-Equal 'error' $csvRows[0].level 'CSV compatibility should keep structured level.'
Assert-Equal 'codex.agent.audit.v1' $csvRows[0].schema 'CSV compatibility should keep schema.'

Get-ChildItem -LiteralPath $auditRoot -Filter '*_action.*' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force

Write-Output 'write-agent-audit tests passed'




