param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$resolver = Join-Path $Root 'scripts/resolve-test-plan.ps1'

$onion = @((& $resolver -Root $Root -IncludeCommands -ActivatedSkill 'onion-architecture') | ConvertFrom-Json)
Assert-True ((@($onion.Command) -join "`n") -match 'scripts/test-architecture-skills\.ps1') 'Onion activation should select architecture skill tests.'
Assert-True ((@($onion.Command) -join "`n") -match 'validate-codex-structure\.ps1 -Root \.') 'Every selected plan should include final structure validation.'
Assert-True (-not ((@($onion.Command) -join "`n") -match 'test-automation-testing-strategy\.ps1')) 'Onion activation should not select automation-testing tests.'

$automation = @((& $resolver -Root $Root -IncludeCommands -AgentName 'automation-testing') | ConvertFrom-Json)
Assert-True ((@($automation.Command) -join "`n") -match 'test-automation-testing-strategy\.ps1') 'Automation agent should select automation-testing strategy tests.'

$audit = @((& $resolver -Root $Root -IncludeCommands -ChangedFiles '.codex/hooks/agent-execution-audit.ps1') | ConvertFrom-Json)
Assert-True ((@($audit.Command) -join "`n") -match '\.codex/hooks/test-agent-execution-audit\.ps1') 'Audit hook change should select audit hook tests.'

$testFiles = @(Get-ChildItem -LiteralPath $Root -Recurse -File -Filter '*test*.ps1' |
    Where-Object { $_.FullName -notmatch '\\.git\\' } |
    ForEach-Object {
        (($_.FullName.Substring($Root.Length) -replace '^[\\/]+', '') -replace '\\', '/')
    })
$mapText = Get-Content -LiteralPath (Join-Path $Root '.codex/test-map.toml') -Raw

foreach ($testFile in $testFiles) {
    if ($testFile -eq 'scripts/test-install-skill-link.ps1') {
        continue
    }

    Assert-True ($mapText.Contains($testFile)) "Test file is not mapped in .codex/test-map.toml: $testFile"
}

Write-Output 'test map tests passed.'
