param([string]$SkillRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-FileContains {
    param([string]$Path, [string]$Pattern, [string]$Message)

    Assert-True (Test-Path -LiteralPath $Path) "Missing file: $Path"
    $content = Get-Content -LiteralPath $Path -Raw
    Assert-True ($content -match $Pattern) $Message
}

$skill = Join-Path $SkillRoot 'SKILL.md'
$agent = Join-Path (Resolve-Path (Join-Path $SkillRoot '../..')).Path '.codex/agents/automation-testing.toml'
$rules = Join-Path $SkillRoot 'resources/test-implementation-rules.md'
$strategy = Join-Path $SkillRoot 'subagents/test-strategy-planner.md'

$requiredTerms = @(
    'unit',
    'integration',
    'Testcontainers',
    'transactional',
    'edge case',
    'concurrency',
    'contract'
)

foreach ($term in $requiredTerms) {
    Assert-FileContains -Path $skill -Pattern ([regex]::Escape($term)) "SKILL.md should mention $term testing capability."
    Assert-FileContains -Path $strategy -Pattern ([regex]::Escape($term)) "test-strategy-planner should route $term testing."
    Assert-FileContains -Path $agent -Pattern ([regex]::Escape($term)) "automation-testing agent should advertise $term testing."
}

$expectedSubagents = @(
    'unit-test-agent.md',
    'integration-api-test-agent.md',
    'testcontainers-test-agent.md',
    'transactional-test-agent.md',
    'edge-case-test-agent.md',
    'concurrency-test-agent.md',
    'contract-test-agent.md'
)

foreach ($subagent in $expectedSubagents) {
    $path = Join-Path $SkillRoot "subagents/$subagent"
    Assert-True (Test-Path -LiteralPath $path) "Expected test subagent missing: $subagent"
}

Assert-FileContains -Path $rules -Pattern 'transaction rollback|committed state|isolation level' 'Rules should cover transactional test isolation.'
Assert-FileContains -Path $rules -Pattern 'race|parallel|idempotency' 'Rules should cover concurrency test risks.'
Assert-FileContains -Path $rules -Pattern 'consumer|provider|schema|OpenAPI|Pact' 'Rules should cover contract testing choices.'

Write-Output 'automation-testing strategy tests passed.'
