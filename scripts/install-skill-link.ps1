param(
    [string]$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$LinkName = 'codex-workflow-kit',
[string]$SkillsRoot = (Join-Path $env:USERPROFILE '.codex/skills'),
    [switch]$Force,
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

function Test-IsWindows {
    return $PSVersionTable.Platform -eq 'Win32NT' -or [string]::IsNullOrWhiteSpace($PSVersionTable.Platform)
}

function Remove-ExistingLink {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    if (-not $Force) {
        throw "Link target already exists: $Path. Re-run with -Force to replace it."
    }

    if ($WhatIf) {
        Write-Output "WhatIf: remove existing $Path"
        return
    }

    Remove-Item -LiteralPath $Path -Recurse -Force
}

$resolvedSource = (Resolve-Path -LiteralPath $SourceRoot).Path
$sourceSkills = Join-Path $resolvedSource '.agents/skills'
if (-not (Test-Path -LiteralPath $sourceSkills)) {
    throw "Source skills directory not found: $sourceSkills"
}

$linkPath = Join-Path $SkillsRoot $LinkName

if ($WhatIf) {
    Write-Output "WhatIf: ensure skills root $SkillsRoot"
    Write-Output "WhatIf: link $linkPath -> $sourceSkills"
    return
}

New-Item -ItemType Directory -Path $SkillsRoot -Force | Out-Null
Remove-ExistingLink -Path $linkPath

if (Test-IsWindows) {
    cmd /c mklink /J "$linkPath" "$sourceSkills" | Out-Null
} else {
    New-Item -ItemType SymbolicLink -Path $linkPath -Target $sourceSkills | Out-Null
}

Write-Output "Skill link installed: $linkPath -> $sourceSkills"
