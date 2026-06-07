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
$scopeScript = Join-Path $SkillRoot 'scripts/resolve-security-scan-scope.ps1'
$reportIdScript = Join-Path $SkillRoot 'scripts/generate-security-report-id.ps1'
$scanWorkflow = Join-Path $SkillRoot 'resources/security-scan-workflow.md'
$ruleEngine = Join-Path $SkillRoot 'resources/security-rule-engine.md'
$reportContract = Join-Path $SkillRoot 'resources/security-report-contract.md'
$fixWorkflow = Join-Path $SkillRoot 'resources/security-fix-workflow.md'
$rulePackLock = Join-Path $SkillRoot 'resources/rule-pack.lock.json'
$commandReference = Join-Path $SkillRoot 'resources/security-command-reference.md'

$requiredTerms = @(
    'OWASP Top 10',
    'ASVS',
    'CWE Top 25',
    'auth',
    'dependency',
    'Java/Spring',
    '/security-scan',
    'Rule Engine',
    'Trivy',
    'SonarQube',
    'cost-log.json',
    '/fix',
    '--help'
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
Assert-FileContains -Path $scanWorkflow -Pattern 'Rule Engine is required' 'Scan workflow should require Rule Engine.'
Assert-FileContains -Path $scanWorkflow -Pattern 'SONAR_TOKEN' 'Scan workflow should document Sonar token handling.'
Assert-FileContains -Path $ruleEngine -Pattern 'Secrets Detection' 'Rule engine should cover secrets detection.'
Assert-FileContains -Path $reportContract -Pattern 'cost-log.json' 'Report contract should require cost logging.'
Assert-FileContains -Path $fixWorkflow -Pattern 'Safe Fix Policy' 'Fix workflow should document safe fix policy.'
Assert-FileContains -Path $rulePackLock -Pattern 'owasp_top10' 'Rule pack lock should include OWASP baseline.'
Assert-FileContains -Path $commandReference -Pattern '/security-scan --help' 'Command reference should document security scan help.'
Assert-FileContains -Path $commandReference -Pattern '/sec-scan -> /security-scan' 'Command reference should document scan aliases.'
Assert-FileContains -Path $commandReference -Pattern '/security-fix -> /fix' 'Command reference should document fix aliases.'
Assert-FileContains -Path $commandReference -Pattern '/security-code-review -> /security-review' 'Command reference should document legacy review alias.'
Assert-True (Test-Path -LiteralPath $scopeScript) 'Scope validation script should exist.'
Assert-True (Test-Path -LiteralPath $reportIdScript) 'Report ID script should exist.'

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("security-scan-scope-" + [guid]::NewGuid().ToString())
try {
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'backend/auth-service') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'backend/user-service') -Force | Out-Null

    $scopeJson = & powershell -NoProfile -ExecutionPolicy Bypass -File $scopeScript -Root $tempRoot -Scope 'backend/auth-service'
    $scopeResult = $scopeJson | ConvertFrom-Json
    Assert-True ($scopeResult.relative_scope -eq 'backend/auth-service') 'Scope validator should preserve requested relative scope.'
    Assert-True ($scopeResult.normalized_scope -eq 'backend-auth-service') 'Scope validator should normalize folder scope.'

    $missingScopeExitCode = 0
    try {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $scopeScript -Root $tempRoot -Scope 'backend/missing-service' 2>&1 | Out-Null
        $missingScopeExitCode = $LASTEXITCODE
    } catch {
        $missingScopeExitCode = 1
    }
    Assert-True ($missingScopeExitCode -ne 0) 'Scope validator should reject missing scope.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}

$reportJson = & powershell -NoProfile -ExecutionPolicy Bypass -File $reportIdScript -Scope 'backend/auth-service' -At ([datetime]'2026-06-02T14:52:30')
$reportResult = $reportJson | ConvertFrom-Json
Assert-True ($reportResult.report_id -eq '145230_02062026_backend-auth-service') 'Report ID should use HHmmss_ddMMyyyy_normalized-scope.'

$fixReportJson = & powershell -NoProfile -ExecutionPolicy Bypass -File $reportIdScript -Scope 'backend/auth-service' -At ([datetime]'2026-06-02T15:30:15') -Fix
$fixReportResult = $fixReportJson | ConvertFrom-Json
Assert-True ($fixReportResult.report_id -eq '153015_02062026_backend-auth-service_fix') 'Fix report ID should append _fix.'

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
