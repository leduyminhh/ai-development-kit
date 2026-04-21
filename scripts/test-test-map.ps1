param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$resolver = Join-Path $Root 'scripts/resolve-test-plan.ps1'

$onion = @((& $resolver -Root $Root -IncludeCommands -ActivatedSkill 'architecture-onion-design') | ConvertFrom-Json)
Assert-True ((@($onion.Command) -join "`n") -match 'skills/java-analyze/scripts/test-architecture-skills\.ps1') 'Onion activation should select architecture skill tests.'
Assert-True ((@($onion.Command) -join "`n") -match 'validate-codex-structure\.ps1 -Root \.') 'Every selected plan should include final structure validation.'
Assert-True (-not ((@($onion.Command) -join "`n") -match 'test-automation-validate-strategy\.ps1')) 'Onion activation should not select test-automation-validate tests.'

$automation = @((& $resolver -Root $Root -IncludeCommands -AgentName 'test-automation-validate') | ConvertFrom-Json)
Assert-True ((@($automation.Command) -join "`n") -match 'test-automation-validate-strategy\.ps1') 'Automation agent should select test-automation-validate strategy tests.'

$audit = @((& $resolver -Root $Root -IncludeCommands -ChangedFiles '.codex/hooks/write-agent-audit.ps1') | ConvertFrom-Json)
Assert-True ((@($audit.Command) -join "`n") -match '\.codex/hooks/test-write-agent-audit\.ps1') 'Audit hook change should select audit hook tests.'

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
