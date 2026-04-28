param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path)

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

$onionRoot = Join-Path $Root '.agents/skills/architecture-onion-design'
$sharedRoot = Join-Path $Root '.agents/skills/code-shared-design'
$javaSkill = Join-Path $Root '.agents/skills/java-analyze/SKILL.md'
$javaMetadata = Join-Path $Root '.agents/skills/java-analyze/metadata/openai.yaml'
$javaAgent = Join-Path $Root '.codex/agents/java-analyze.toml'

Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'name:\s*architecture-onion-design' 'Onion skill must have valid frontmatter.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'oeffrey Palermo|Palermo' 'Onion skill should credit Palermo source.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'independent object model' 'Onion skill must include independent object model tenet.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'Inner layers define interfaces' 'Onion skill must include interface ownership tenet.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'toward the center' 'Onion skill must enforce inward dependency direction.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'compiled and run separate from infrastructure' 'Onion skill must enforce infrastructure-independent core.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'bootstrap\s+.*controller' 'oava onion template must include bootstrap controller layer.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'bootstrap --> application --> domain' 'oava onion template must include allowed dependency direction.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'publicapi' 'oava onion template must document publicapi package naming.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'application/service/inf/<Capability>Service\.java' 'oava onion template must define service interface placement.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'application/port/out/repos/<Capability>Repository\.java' 'oava onion template must define repository outbound port placement.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'SpringData<Capability>Repository\.java' 'oava onion template must define Spring Data repository placement.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'ServiceImpl' 'oava onion template must require service implementation suffix.'
Assert-FileContains -Path (Join-Path $onionRoot 'resources/java-package-template.md') -Pattern 'Application must not import.*Spring Web.*Spring Data.*JPA' 'oava onion template must forbid framework leakage into application.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'tenant-admin-service' 'Onion skill must mention tenant-admin-service as the extracted reference source.'
Assert-FileContains -Path (Join-Path $onionRoot 'SKILL.md') -Pattern 'Only create files that the capability actually needs' 'Onion skill must prevent empty placeholder generation.'
Assert-FileContains -Path (Join-Path $onionRoot 'subagents/java-onion-design.md') -Pattern 'com\.example\.customer' 'oava onion subagent must include the provided example package shape.'

$expectedOnionSubagents = @(
    'onion-boundary-review.md',
    'onion-domain-design.md',
    'onion-application-design.md',
    'onion-infrastructure-design.md',
    'java-onion-design.md'
)
foreach ($subagent in $expectedOnionSubagents) {
    Assert-True (Test-Path -LiteralPath (Join-Path $onionRoot "subagents/$subagent")) "Missing onion subagent: $subagent"
}

Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'name:\s*code-shared-design' 'Shared module skill must have valid frontmatter.'
Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'internal api|internal API' 'Shared module skill must cover internal API modules.'
Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'contract' 'Shared module skill must cover contract modules.'
Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'Nexus' 'Shared module skill must cover publishing/importing through Nexus.'
Assert-FileContains -Path (Join-Path $sharedRoot 'SKILL.md') -Pattern 'shared logic' 'Shared module skill must cover shared logic modules.'
Assert-FileContains -Path (Join-Path $sharedRoot 'resources/module-boundary-rules.md') -Pattern 'no framework|framework-free|no infrastructure' 'Shared module boundary rules must forbid infrastructure coupling.'

Assert-FileContains -Path $javaSkill -Pattern 'architecture-onion-design' 'oava architect skill must support forcing architecture-onion-design.'
Assert-FileContains -Path $javaSkill -Pattern 'code-shared-design' 'oava architect skill must support shared module architecture.'
Assert-FileContains -Path $javaMetadata -Pattern 'display_name:\s*"Java Analyze"' 'Java skill UI metadata should display Java Analyze.'
Assert-FileContains -Path $javaAgent -Pattern 'architecture-onion-design' 'oava architect agent must route explicit onion requests to architecture-onion-design.'
Assert-FileContains -Path $javaAgent -Pattern 'code-shared-design' 'oava architect agent must route shared module requests.'

Write-Output 'architecture skill tests passed.'





