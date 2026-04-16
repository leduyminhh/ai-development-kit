param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$rootReadmePath = Join-Path $Root 'README.md'
$agentsReadmePath = Join-Path $Root 'skills/README.md'

Assert-True (Test-Path -LiteralPath $rootReadmePath) 'Root README.md must exist.'
Assert-True (Test-Path -LiteralPath $agentsReadmePath) 'skills/README.md must exist.'

$rootReadme = Get-Content -LiteralPath $rootReadmePath -Raw
$agentsReadme = Get-Content -LiteralPath $agentsReadmePath -Raw
$skillNames = @(Get-ChildItem -LiteralPath (Join-Path $Root 'skills') -Directory | Select-Object -ExpandProperty Name | Sort-Object)
$manifestPath = Join-Path $Root 'skills/manifest.toml'

foreach ($skillName in $skillNames) {
    Assert-True ($rootReadme.Contains($skillName)) "Root README.md must list skill: $skillName"
    Assert-True ($agentsReadme.Contains($skillName)) "skills/README.md must list skill: $skillName"
}

Assert-True (Test-Path -LiteralPath $manifestPath) 'skills/manifest.toml must exist.'
$manifest = Get-Content -LiteralPath $manifestPath -Raw
foreach ($skillName in $skillNames) {
    Assert-True ($manifest.Contains("name = `"$skillName`"")) "skills/manifest.toml must contain skill: $skillName"
}

Assert-True ($rootReadme -match 'Skill Catalog Update Event') 'Root README.md must document the skill catalog update event.'
Assert-True ($agentsReadme -match 'Skill Catalog Update Event') 'skills/README.md must document the skill catalog update event.'

Write-Output 'README skill catalog tests passed.'

