param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$rootReadmePath = Join-Path $Root 'README.md'
$agentsReadmePath = Join-Path $Root '.agents/README.md'

Assert-True (Test-Path -LiteralPath $rootReadmePath) 'Root README.md must exist.'
Assert-True (Test-Path -LiteralPath $agentsReadmePath) '.agents/README.md must exist.'

$rootReadme = Get-Content -LiteralPath $rootReadmePath -Raw
$agentsReadme = Get-Content -LiteralPath $agentsReadmePath -Raw
$skillNames = @(Get-ChildItem -LiteralPath (Join-Path $Root '.agents/skills') -Directory | Select-Object -ExpandProperty Name | Sort-Object)

foreach ($skillName in $skillNames) {
    Assert-True ($rootReadme.Contains($skillName)) "Root README.md must list skill: $skillName"
    Assert-True ($agentsReadme.Contains($skillName)) ".agents/README.md must list skill: $skillName"
}

Assert-True ($rootReadme -match 'Skill Catalog Update Event') 'Root README.md must document the skill catalog update event.'
Assert-True ($agentsReadme -match 'Skill Catalog Update Event') '.agents/README.md must document the skill catalog update event.'

Write-Output 'README skill catalog tests passed.'
