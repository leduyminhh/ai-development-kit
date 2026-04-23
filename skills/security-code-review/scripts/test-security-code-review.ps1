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

$repoRoot = (Resolve-Path (Join-Path $SkillRoot '../..')).Path
$skill = Join-Path $SkillRoot 'SKILL.md'
$agent = Join-Path $repoRoot '.codex/agents/security-code-review.toml'
$mapping = Join-Path $SkillRoot 'resources/owasp-asvs-cwe-mapping.md'
$javaResource = Join-Path $SkillRoot 'resources/java-spring-security-review.md'
$securitySubagent = Join-Path $SkillRoot 'subagents/security-review.md'
$javaSubagent = Join-Path $SkillRoot 'subagents/java-spring-security-review.md'
$detectScript = Join-Path $SkillRoot 'scripts/detect-stack-files.sh'

$requiredTerms = @(
    'OWASP Top 10',
    'ASVS',
    'CWE Top 25',
    'auth',
    'dependency',
    'Java/Spring'
)

foreach ($term in $requiredTerms) {
    Assert-FileContains -Path $skill -Pattern ([regex]::Escape($term)) "SKILL.md should mention $term."
    Assert-FileContains -Path $agent -Pattern ([regex]::Escape($term)) "Agent should advertise $term support."
}

Assert-FileContains -Path $mapping -Pattern 'Broken access control' 'Mapping resource should cover broken access control.'
Assert-FileContains -Path $mapping -Pattern 'SSRF' 'Mapping resource should cover SSRF.'
Assert-FileContains -Path $javaResource -Pattern 'Spring Security' 'Java resource should cover Spring Security.'
Assert-FileContains -Path $javaResource -Pattern 'actuator' 'Java resource should cover actuator exposure.'
Assert-FileContains -Path $securitySubagent -Pattern 'OWASP' 'Core security subagent should mention OWASP mapping.'
Assert-FileContains -Path $javaSubagent -Pattern 'Spring' 'Java subagent should mention Spring.'
Assert-True (Test-Path -LiteralPath $detectScript) 'Stack detection script should exist.'

$expectedSubagents = @(
    'security-review.md',
    'auth-review.md',
    'secrets-review.md',
    'dependency-review.md',
    'java-spring-security-review.md',
    'security-verification-review.md'
)

foreach ($subagent in $expectedSubagents) {
    $path = Join-Path $SkillRoot "subagents/$subagent"
    Assert-True (Test-Path -LiteralPath $path) "Expected security subagent missing: $subagent"
}

Write-Output 'security-code-review tests passed.'
