param(
    [Parameter(Mandatory = $true)]
    [string]$MessageFile
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $MessageFile)) {
    throw "Missing commit message file: $MessageFile"
}

$content = Get-Content -LiteralPath $MessageFile -Encoding utf8 -Raw

$mojibakePatterns = @(
    [string]([char]0xfffd),
    ([string]([char]0x00c3) + [string]([char]0x0192)),
    ([string]([char]0x00c3) + [string]([char]0x201a)),
    ([string]([char]0x00c3) + [string]([char]0x00a2) + [string]([char]0x00e2) + [string]([char]0x201a) + [string]([char]0x00ac) + [string]([char]0x00c2) + [string]([char]0x00a2))
)

foreach ($pattern in $mojibakePatterns) {
    if ($content.Contains($pattern)) {
        throw 'Commit message appears to contain mojibake. Fix UTF-8 handling before committing.'
    }
}

$lostDiacriticPatterns = @(
    'Th\?',
    'M\?',
    'r\?ng',
    'lu\?ng',
    'ch\?n',
    'x\?c nh\?n',
    'ng\?i d\?ng',
    'ki\?m ch\?ng'
)

foreach ($pattern in $lostDiacriticPatterns) {
    if ($content -match $pattern) {
        throw "Commit message appears to contain lost Vietnamese diacritics: $pattern"
    }
}

$usesGeneratedVietnameseSections = $content -match '(?m)^What changed:$' -and $content -match '(?m)^Why changed:$'
if ($usesGeneratedVietnameseSections -and $content -match '\?') {
    throw 'Generated Vietnamese commit body contains question marks; verify UTF-8 handling before committing.'
}

if ($content -match '(?im)^Co-Authored-By:') {
    throw 'Commit message must not contain Co-Authored-By trailers when using git-workflow-design.'
}

Write-Output 'commit message encoding check passed.'
