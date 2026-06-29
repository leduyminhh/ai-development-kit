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
$templates = Join-Path $SkillRoot 'resources/commit-convention/templates.md'
$examples = Join-Path $SkillRoot 'resources/commit-convention/examples.md'
$outputTemplate = Join-Path $SkillRoot 'resources/output-template-vi.md'
$encodingCheck = Join-Path $SkillRoot 'scripts/test-commit-message-encoding.ps1'

Assert-FileContainsRegex -Path $skill -Pattern 'UTF-8 with diacritics' 'SKILL.md should require UTF-8 Vietnamese with diacritics.'
Assert-FileContainsRegex -Path $skill -Pattern 'resources/output-template-vi\.md' 'SKILL.md should link to the Vietnamese output template resource.'
Assert-FileNotContainsRegex -Path $skill -Pattern 'Branch \u0111\u1ec1 xu\u1ea5t:' 'SKILL.md should not inline Vietnamese output labels.'
Assert-FileContainsRegex -Path $outputTemplate -Pattern 'Branch \u0111\u1ec1 xu\u1ea5t:' 'Output template should use Vietnamese labels with diacritics.'
Assert-FileContainsRegex -Path $outputTemplate -Pattern '\u2022' 'Output template should use a readable detail bullet marker.'

Assert-FileContainsRegex -Path $convention -Pattern 'Use Vietnamese with diacritics unless repository instructions say otherwise\.' 'Commit convention should explicitly require Vietnamese diacritics.'
Assert-FileContainsRegex -Path $aiRules -Pattern 'Do not silently strip accents unless the user explicitly approves that' 'AI generation rules should forbid silently stripping diacritics.'
Assert-FileContainsRegex -Path $bodyRules -Pattern 'Commit Body Rules' 'Commit convention body rules should be split into a focused resource.'
Assert-FileContainsRegex -Path $configEnvRules -Pattern 'Mandatory Environment Disclosure' 'Commit convention config/env rules should be split into a focused resource.'
Assert-FileContainsRegex -Path $aiRules -Pattern 'AI Generation And Encoding Rules' 'Commit convention AI generation rules should be split into a focused resource.'
Assert-FileContainsRegex -Path $aiRules -Pattern 'git commit -F <file>' 'Commit convention AI rules should require UTF-8 file based commits.'
Assert-FileContainsRegex -Path $aiRules -Pattern 'test-commit-message-encoding\.ps1 -MessageFile <file>' 'Commit convention AI rules should require commit message encoding validation.'
Assert-FileContainsRegex -Path $aiRules -Pattern 'Do not add `Co-Authored-By`' 'AI generation rules should forbid assistant co-author trailers by default.'
Assert-FileContainsRegex -Path $templates -Pattern 'Commit Size Selection' 'Commit templates should define size-based template selection.'
Assert-FileContainsRegex -Path $templates -Pattern 'Daily Commit Template' 'Commit templates should include the daily commit template.'
Assert-FileContainsRegex -Path $templates -Pattern 'Multi-Module Commit Template' 'Commit templates should include the multi-module template.'
Assert-FileContainsRegex -Path $templates -Pattern 'Refactor Commit Template' 'Commit templates should include the refactor template.'
Assert-FileContainsRegex -Path $templates -Pattern 'Fix Commit Template' 'Commit templates should include the fix template.'
Assert-FileContainsRegex -Path $templates -Pattern 'Breaking Change Template' 'Commit templates should include the breaking change template.'
Assert-FileContainsRegex -Path $templates -Pattern 'BREAKING CHANGE:' 'Breaking templates should require the BREAKING CHANGE footer.'
Assert-FileContainsRegex -Path $templates -Pattern 'Pull Request Notes Template' 'Commit templates should include PR notes guidance.'
Assert-FileNotContainsRegex -Path $templates -Pattern '## Summary' 'PR notes template should use plain labels instead of Markdown H2 headings.'
Assert-FileNotContainsRegex -Path $templates -Pattern '### Added' 'PR notes template should use plain labels instead of Markdown H3 headings.'
Assert-FileContainsRegex -Path $templates -Pattern '(?m)^Summary:$' 'PR notes template should use colon-suffixed plain labels.'
Assert-FileContainsRegex -Path $templates -Pattern '(?m)^Changes:$' 'PR notes template should use colon-suffixed section labels.'
Assert-FileContainsRegex -Path $convention -Pattern 'Detect the change size' 'Commit convention should require commit size detection.'
Assert-FileContainsRegex -Path $convention -Pattern 'English commit header' 'Commit convention should preserve the preferred English header style.'
Assert-FileContainsRegex -Path $skill -Pattern 'Detect the change size' 'SKILL.md should route commit generation through size detection.'
Assert-FileContainsRegex -Path $skill -Pattern 'first load \[resources/commit-convention\.md\]' 'SKILL.md should load the commit convention entry point before detail rules.'
Assert-FileContainsRegex -Path $skill -Pattern 'commit-convention/body-rules\.md' 'SKILL.md should route body section and bullet rules through the detail resource.'
Assert-FileContainsRegex -Path $skill -Pattern 'commit-convention/ai-generation-rules\.md' 'SKILL.md should route grounded generation and UTF-8 safety through the detail resource.'
Assert-FileContainsRegex -Path $skill -Pattern 'commit-convention/config-env-rules\.md' 'SKILL.md should route config/env changes through the detail resource.'
Assert-FileContainsRegex -Path $skill -Pattern 'resources/commit-convention/templates\.md' 'SKILL.md should link to the commit templates resource.'
Assert-FileContainsRegex -Path $skill -Pattern 'BREAKING CHANGE:' 'SKILL.md should enforce breaking-change footer guidance.'
Assert-FileContainsRegex -Path $examples -Pattern 'Th\u00eam c\u1ea5u h\u00ecnh reconnect cho lu\u1ed3ng RTSP qua FFmpeg\.' 'Commit convention examples should be stored as readable UTF-8 Vietnamese.'
Assert-FileContainsRegex -Path $examples -Pattern 'Script parse t\u00ean file c\u0169 c\u00f3 th\u1ec3 c\u1ea7n c\u1eadp nh\u1eadt l\u1ea1i pattern\.' 'Commit convention examples should keep Vietnamese diacritics in impact notes.'
Assert-FileContainsRegex -Path $skill -Pattern 'test-commit-message-encoding\.ps1 -MessageFile <file>' 'SKILL.md should require commit message encoding validation before commit.'
Assert-FileContainsRegex -Path $skill -Pattern 'git commit -F <file>' 'SKILL.md should require UTF-8 file based commits.'
Assert-FileContainsRegex -Path $skill -Pattern 'never add `Co-Authored-By` trailers' 'SKILL.md should forbid assistant co-author trailers by default.'
Assert-FileContainsRegex -Path $encodingCheck -Pattern 'Generated Vietnamese commit body contains question marks' 'Encoding check script should reject suspicious question marks in generated Vietnamese commit bodies.'
Assert-FileContainsRegex -Path $encodingCheck -Pattern 'Co-Authored-By' 'Encoding check script should reject assistant co-author trailers.'

$commitConventionFiles = @($convention, $bodyRules, $configEnvRules, $aiRules, $templates, $examples, $outputTemplate)

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
    $trailerMessage = Join-Path $tempDir 'trailer-commit-message.txt'

    [System.Text.RegularExpressions.Regex]::Unescape(@'
feat(cli): expand interactive plugin lifecycle wizards

Changed:
- M\u1edf r\u1ed9ng CLI wizard cho lu\u1ed3ng install.

Reason:
- Gi\u00fap ng\u01b0\u1eddi d\u00f9ng ki\u1ec3m ch\u1ee9ng thay \u0111\u1ed5i.
'@) | Set-Content -LiteralPath $goodMessage -Encoding utf8

    @'
feat(cli): expand interactive plugin lifecycle wizards

Changed:
- M? r?ng CLI wizard cho lu?ng install.

Reason:
- Gi?p ng??i d?ng ki?m ch?ng thay ??i.
'@ | Set-Content -LiteralPath $badMessage -Encoding utf8

    @'
feat(cli): expand interactive plugin lifecycle wizards

Changed:
- Update git workflow checks.

Reason:
- Keep commit attribution policy explicit.

Co-Authored-By: Claude Opus <noreply@example.com>
'@ | Set-Content -LiteralPath $trailerMessage -Encoding utf8

    & powershell -NoProfile -ExecutionPolicy Bypass -File $encodingCheck -MessageFile $goodMessage | Out-Null
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $encodingCheck -MessageFile $badMessage *> $null
    $badExitCode = $LASTEXITCODE
    & powershell -NoProfile -ExecutionPolicy Bypass -File $encodingCheck -MessageFile $trailerMessage *> $null
    $trailerExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    Assert-True ($badExitCode -ne 0) 'Encoding check should reject generated Vietnamese commit bodies with lost diacritics.'
    Assert-True ($trailerExitCode -ne 0) 'Encoding check should reject Co-Authored-By trailers by default.'
} finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Output 'git-workflow-design tests passed.'
