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

$coreRoot = Join-Path $PSScriptRoot '../hooks/core'
$adapterRoot = Join-Path $PSScriptRoot '../hooks/adapters'
$fixtureRoot = Join-Path $PSScriptRoot '../hooks/fixtures'

. (Join-Path $coreRoot 'hook-redaction.ps1')
. (Join-Path $coreRoot 'hook-identity.ps1')
. (Join-Path $coreRoot 'hook-contract.ps1')
. (Join-Path $coreRoot 'hook-policy.ps1')
. (Join-Path $coreRoot 'hook-audit.ps1')
. (Join-Path $coreRoot 'hook-flow.ps1')
. (Join-Path $coreRoot 'hook-pipeline.ps1')
. (Join-Path $adapterRoot 'codex-hook-adapter.ps1')
. (Join-Path $adapterRoot 'claude-hook-adapter.ps1')

$expectedMap = @{
    PreToolUse = 'tool.before'
    PostToolUse = 'tool.completed'
    PermissionRequest = 'permission.requested'
    UserPromptSubmit = 'prompt.submitted'
    SubagentStart = 'subagent.started'
    SubagentStop = 'subagent.completed'
    Stop = 'agent.completed'
}

foreach ($provider in @('codex', 'claude')) {
    $providerRoot = Join-Path $fixtureRoot $provider
    foreach ($fixtureFile in Get-ChildItem -LiteralPath $providerRoot -Filter '*.json' -File) {
        $fixture = Get-Content -LiteralPath $fixtureFile.FullName -Raw | ConvertFrom-Json
        if ($provider -eq 'codex') {
            $event = ConvertFrom-CodexHookEvent -InputObject $fixture
            $response = Invoke-CodexHookAdapter -InputObject $fixture
            Assert-Equal 'codex' $event.provider 'Codex adapter should set provider.'
            Assert-Equal 'codex' $response.provider 'Codex response should set provider.'
        } else {
            $event = ConvertFrom-ClaudeHookEvent -InputObject $fixture
            $response = Invoke-ClaudeHookAdapter -InputObject $fixture
            Assert-Equal 'claude-code' $event.provider 'Claude adapter should set provider.'
            Assert-Equal 'claude-code' $response.provider 'Claude response should set provider.'
        }

        Assert-Equal $expectedMap[$fixture.nativeEvent] $event.eventName "Fixture should map native event: $($fixtureFile.Name)"
        Assert-Equal 'observe' $event.mode 'Adapter fixture should default to observe.'
        Assert-Equal 'abstain' $response.decision 'Observe adapter response should abstain.'
        Assert-True $response.continue 'Observe adapter response should not block.'
    }
}

Write-Output 'hook adapter tests passed.'
