param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

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

$onionRoot = Join-Path $Root '.agents/skills/onion-architecture'
$sharedRoot = Join-Path $Root '.agents/skills/shared-module-architecture'
$javaSkill = Join-Path $Root '.agents/skills/java-architect/SKILL.md'
$javaAgent = Join-Path $Root '.codex/agents/java-architect.toml'

Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'name:\s*onion-architecture' 'Onion skill must have valid frontmatter.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'Jeffrey Palermo|Palermo' 'Onion skill should credit Palermo source.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'independent object model' 'Onion skill must include independent object model tenet.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'Inner layers define interfaces' 'Onion skill must include interface ownership tenet.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'toward the center' 'Onion skill must enforce inward dependency direction.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'compiled and run separate from infrastructure' 'Onion skill must enforce infrastructure-independent core.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'bootstrap\s+.*controller' 'Java onion template must include bootstrap controller layer.'
Assert-FileContains -Path (Join-Path $onionRoot 'subagents/java-onion-architecture.md') -Pattern 'com\.example\.customer' 'Java onion subagent must include the provided example package shape.'

$expectedOnionSubagents = @(
    'onion-boundary-reviewer.md',
    'onion-domain-modeler.md',
    'onion-application-service-designer.md',
    'onion-infrastructure-adapter-designer.md',
    'java-onion-architecture.md'
)
foreach ($subagent in $expectedOnionSubagents) {
    Assert-True (Test-Path -LiteralPath (Join-Path $onionRoot "subagents/$subagent")) "Missing onion subagent: $subagent"
}

Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'name:\s*shared-module-architecture' 'Shared module skill must have valid frontmatter.'
Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'internal api|internal API' 'Shared module skill must cover internal API modules.'
Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'contract' 'Shared module skill must cover contract modules.'
Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'Nexus' 'Shared module skill must cover publishing/importing through Nexus.'
Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'shared logic' 'Shared module skill must cover shared logic modules.'
Assert-FileContains -Path (Join-Path $sharedRoot 'resources/module-boundary-rules.md') -Pattern 'no framework|framework-free|no infrastructure' 'Shared module boundary rules must forbid infrastructure coupling.'

Assert-FileContains -Path $javaSkill -Pattern 'onion-architecture' 'Java architect skill must support forcing onion-architecture.'
Assert-FileContains -Path $javaSkill -Pattern 'shared-module-architecture' 'Java architect skill must support shared module architecture.'
Assert-FileContains -Path $javaAgent -Pattern 'onion-architecture' 'Java architect agent must route explicit onion requests to onion-architecture.'
Assert-FileContains -Path $javaAgent -Pattern 'shared-module-architecture' 'Java architect agent must route shared module requests.'

Write-Output 'architecture skill tests passed.'
