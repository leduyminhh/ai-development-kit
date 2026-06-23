param([string]$SkillRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-FileContainsRegex {
    param([string]$Path, [string]$Pattern, [string]$Message)

    Assert-True (Test-Path -LiteralPath $Path) "Missing file: $Path"
    $content = Get-Content -LiteralPath $Path -Encoding utf8 -Raw
    Assert-True ($content -match $Pattern) $Message
}

function Assert-FileNotContainsRegex {
    param([string]$Path, [string]$Pattern, [string]$Message)

    Assert-True (Test-Path -LiteralPath $Path) "Missing file: $Path"
    $content = Get-Content -LiteralPath $Path -Encoding utf8 -Raw
    Assert-True (-not ($content -match $Pattern)) $Message
}

$skill = Join-Path $SkillRoot 'SKILL.md'
$convention = Join-Path $SkillRoot 'resources/commit-convention.md'
$bodyRules = Join-Path $SkillRoot 'resources/commit-convention/body-rules.md'
$configEnvRules = Join-Path $SkillRoot 'resources/commit-convention/config-env-rules.md'
$aiRules = Join-Path $SkillRoot 'resources/commit-convention/ai-generation-rules.md'
$examples = Join-Path $SkillRoot 'resources/commit-convention/examples.md'
$outputTemplate = Join-Path $SkillRoot 'resources/output-template-vi.md'
$encodingCheck = Join-Path $SkillRoot 'scripts/test-commit-message-encoding.ps1'

Assert-FileContainsRegex -Path $skill -Pattern 'UTF-8 with diacritics' 'SKILL.md should require UTF-8 Vietnamese with diacritics.'
Assert-FileContainsRegex -Path $skill -Pattern 'resources/output-template-vi\.md' 'SKILL.md should link to the Vietnamese output template resource.'
Assert-FileNotContainsRegex -Path $skill -Pattern 'Branch \u0111\u1ec1 xu\u1ea5t:' 'SKILL.md should not inline Vietnamese output labels.'
Assert-FileContainsRegex -Path $outputTemplate -Pattern 'Branch \u0111\u1ec1 xu\u1ea5t:' 'Output template should use Vietnamese labels with diacritics.'
Assert-FileContainsRegex -Path $outputTemplate -Pattern '\u2022' 'Output template should use a readable detail bullet marker.'

Assert-FileContainsRegex -Path $convention -Pattern 'Use Vietnamese with diacritics unless repository instructions say otherwise\.' 'Commit convention should explicitly require Vietnamese diacritics.'
Assert-FileContainsRegex -Path $convention -Pattern 'Do not silently remove Vietnamese diacritics unless the user explicitly approves that compromise' 'Commit convention should forbid silently stripping diacritics.'
Assert-FileContainsRegex -Path $bodyRules -Pattern 'Commit Body Rules' 'Commit convention body rules should be split into a focused resource.'
Assert-FileContainsRegex -Path $configEnvRules -Pattern 'Mandatory Environment Disclosure' 'Commit convention config/env rules should be split into a focused resource.'
Assert-FileContainsRegex -Path $aiRules -Pattern 'AI Generation And Encoding Rules' 'Commit convention AI generation rules should be split into a focused resource.'
Assert-FileContainsRegex -Path $aiRules -Pattern 'git commit -F <file>' 'Commit convention AI rules should require UTF-8 file based commits.'
Assert-FileContainsRegex -Path $aiRules -Pattern 'test-commit-message-encoding\.ps1 -MessageFile <file>' 'Commit convention AI rules should require commit message encoding validation.'
Assert-FileContainsRegex -Path $examples -Pattern 'Th\u00eam c\u1ea5u h\u00ecnh reconnect cho lu\u1ed3ng RTSP qua FFmpeg\.' 'Commit convention examples should be stored as readable UTF-8 Vietnamese.'
Assert-FileContainsRegex -Path $examples -Pattern 'Script parse t\u00ean file c\u0169 c\u00f3 th\u1ec3 c\u1ea7n c\u1eadp nh\u1eadt l\u1ea1i pattern\.' 'Commit convention examples should keep Vietnamese diacritics in impact notes.'
Assert-FileContainsRegex -Path $skill -Pattern 'test-commit-message-encoding\.ps1 -MessageFile <file>' 'SKILL.md should require commit message encoding validation before commit.'
Assert-FileContainsRegex -Path $skill -Pattern 'git commit -F <file>' 'SKILL.md should require UTF-8 file based commits.'
Assert-FileContainsRegex -Path $encodingCheck -Pattern 'Generated Vietnamese commit body contains question marks' 'Encoding check script should reject suspicious question marks in generated Vietnamese commit bodies.'

$commitConventionFiles = @($convention, $bodyRules, $configEnvRules, $aiRules, $examples, $outputTemplate)

$badSnippets = @(
    'Branch de xuat:',
    'Commit de xuat:',
    'Ly do chon type/scope:',
    'Files se stage:',
    '\u00e2\u20ac\u00a2',
    'Th\u00c3',
    'C\u00e1\u00ba'
)

foreach ($snippet in $badSnippets) {
    Assert-FileNotContainsRegex -Path $skill -Pattern $snippet "SKILL.md should not contain mojibake or stripped Vietnamese marker: $snippet"
    foreach ($commitConventionFile in $commitConventionFiles) {
        Assert-FileNotContainsRegex -Path $commitConventionFile -Pattern $snippet "Commit convention resources should not contain mojibake or stripped Vietnamese marker: $snippet"
    }
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Path $tempDir | Out-Null
try {
    $goodMessage = Join-Path $tempDir 'good-commit-message.txt'
    $badMessage = Join-Path $tempDir 'bad-commit-message.txt'
    @'
feat(cli): expand interactive plugin lifecycle wizards

What changed:
- Mở rộng CLI wizard cho luồng install.

Why changed:
- Giúp người dùng kiểm chứng thay đổi.
'@ | Set-Content -LiteralPath $goodMessage -Encoding utf8
    @'
feat(cli): expand interactive plugin lifecycle wizards

What changed:
- M? r?ng CLI wizard cho lu?ng install.

Why changed:
- Gi?p ng??i d?ng ki?m ch?ng thay ??i.
'@ | Set-Content -LiteralPath $badMessage -Encoding utf8

    & powershell -NoProfile -ExecutionPolicy Bypass -File $encodingCheck -MessageFile $goodMessage | Out-Null
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $encodingCheck -MessageFile $badMessage *> $null
    $ErrorActionPreference = $previousErrorActionPreference
    Assert-True ($LASTEXITCODE -ne 0) 'Encoding check should reject generated Vietnamese commit bodies with lost diacritics.'
} finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Output 'git-workflow-design tests passed.'
