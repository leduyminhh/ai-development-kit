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

Assert-FileContainsRegex -Path $skill -Pattern 'UTF-8 with diacritics' 'SKILL.md should require UTF-8 Vietnamese with diacritics.'
Assert-FileContainsRegex -Path $skill -Pattern 'Branch \u0111\u1ec1 xu\u1ea5t:' 'SKILL.md should use Vietnamese labels with diacritics in the output format.'
Assert-FileContainsRegex -Path $skill -Pattern '\u2022' 'SKILL.md should use a readable detail bullet marker.'

Assert-FileContainsRegex -Path $convention -Pattern 'Use Vietnamese with diacritics unless repository instructions say otherwise\.' 'Commit convention should explicitly require Vietnamese diacritics.'
Assert-FileContainsRegex -Path $convention -Pattern 'Do not silently remove Vietnamese diacritics unless the user explicitly approves that compromise' 'Commit convention should forbid silently stripping diacritics.'
Assert-FileContainsRegex -Path $convention -Pattern 'Th\u00eam installer \u0111\u1ec3 t\u1ea1o link skill t\u1eeb repo v\u00e0o th\u01b0 m\u1ee5c Codex local\.' 'Commit convention examples should be stored as readable UTF-8 Vietnamese.'
Assert-FileContainsRegex -Path $convention -Pattern 'C\u00e1c job ho\u1eb7c script ngo\u00e0i repo \u0111ang parse t\u00ean file c\u0169 c\u00f3 th\u1ec3 c\u1ea7n c\u1eadp nh\u1eadt l\u1ea1i pattern\.' 'Commit convention examples should keep Vietnamese diacritics in impact notes.'

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
    Assert-FileNotContainsRegex -Path $convention -Pattern $snippet "Commit convention should not contain mojibake or stripped Vietnamese marker: $snippet"
}

Write-Output 'git-workflow-design tests passed.'
