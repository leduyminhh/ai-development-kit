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

$script = Join-Path $Root 'scripts/invoke-agent-audited.ps1'
$auditRoot = Join-Path $Root '.codex/hooks'

Get-ChildItem -LiteralPath $auditRoot -Filter '*_action.*' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force

& powershell -NoProfile -ExecutionPolicy Bypass -File $script `
    -Root $Root `
    -AuditRoot $auditRoot `
    -SessionId '33333333-3333-3333-3333-333333333333' `
    -AgentName 'react-js' `
    -Model 'gpt-5.4' `
    -Reasoning 'medium' `
    -SummaryJob 'Run audited success command' `
    -Command "Write-Output 'ok'; exit 0" `
    -RemainingDays 7

Assert-Equal 0 $LASTEXITCODE 'Successful audited command should return exit code 0.'

$rows = @(Get-ChildItem -LiteralPath $auditRoot -Filter '*_action.log' -File | ForEach-Object { Get-Content -LiteralPath $_.FullName })
Assert-Equal 1 $rows.Count 'Successful audited command should create one audit row.'
Assert-True ($rows[0].Contains('[INFO] [codex-agent] [react-js] [33333333-3333-3333-3333-333333333333]')) 'Text log prefix mismatch.'
Assert-True ($rows[0].Contains('schema=codex.agent.audit.v1')) 'Schema field mismatch.'
Assert-True ($rows[0].Contains('service=codex-agent')) 'Service field mismatch.'
Assert-True ($rows[0].Contains('eventName=agent.execution')) 'Event name field mismatch.'
Assert-True ($rows[0].Contains('level=info')) 'Success level mismatch.'
Assert-True ($rows[0].Contains('sessionId=33333333-3333-3333-3333-333333333333')) 'Session ID field mismatch.'
Assert-True ($rows[0].Contains('agentName=react-js')) 'Agent name field mismatch.'
Assert-True ($rows[0].Contains('model=gpt-5.4')) 'Model field mismatch.'
Assert-True ($rows[0].Contains('reasoning=medium')) 'Reasoning field mismatch.'
Assert-True ($rows[0].Contains('summaryJob="Run audited success command"')) 'Summary job field mismatch.'
Assert-True ($rows[0].Contains('status=completed')) 'Success status mismatch.'
Assert-True ($rows[0].Contains('cost=0')) 'Default cost mismatch.'
Assert-True ($rows[0].Contains('timezone=Asia/Ho_Chi_Minh')) 'Timezone field mismatch.'

& powershell -NoProfile -ExecutionPolicy Bypass -File $script `
    -Root $Root `
    -AuditRoot $auditRoot `
    -SessionId '44444444-4444-4444-4444-444444444444' `
    -AgentName 'qa-reviewer' `
    -Model 'gpt-5.4' `
    -Reasoning 'low' `
    -SummaryJob 'Run audited failed command' `
    -Command "Write-Error 'fail'; exit 5" `
    -Cost 2.5 `
    -RemainingDays 7

Assert-Equal 5 $LASTEXITCODE 'Failed audited command should preserve exit code.'

$rows = @(Get-ChildItem -LiteralPath $auditRoot -Filter '*_action.log' -File | ForEach-Object { Get-Content -LiteralPath $_.FullName })
Assert-Equal 2 $rows.Count 'Failed audited command should append one audit row.'
$failedRow = $rows | Where-Object { $_.Contains('sessionId=44444444-4444-4444-4444-444444444444') } | Select-Object -First 1
Assert-True ($null -ne $failedRow) 'Failed audit row was not written.'
Assert-True ($failedRow.Contains('[ERROR]')) 'Failure prefix level mismatch.'
Assert-True ($failedRow.Contains('status=failed')) 'Failure status mismatch.'
Assert-True ($failedRow.Contains('level=error')) 'Failure level mismatch.'
Assert-True ($failedRow.Contains('cost=2.5')) 'Explicit cost mismatch.'

Get-ChildItem -LiteralPath $auditRoot -Filter '*_action.*' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force

Write-Output 'invoke-agent-audited tests passed'
