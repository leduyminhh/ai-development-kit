param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)

    if (-not $Condition) {
        throw $Message
    }
}

$installer = Join-Path $Root 'scripts/install-skill-link.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-install-skill-link-" + [guid]::NewGuid().ToString())
$tempSkillsRoot = Join-Path $tempRoot 'skills-home'

try {
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.agents/skills') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'runtime/skills') -Force | Out-Null

    Set-Content -LiteralPath (Join-Path $tempRoot '.agents/skills/manifest.toml') -Encoding utf8 -Value @'
[external_discovery]
link_name = "custom-skill-pack"
linked_source = "runtime/skills"
'@

    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $installer `
        -SourceRoot $tempRoot `
        -SkillsRoot $tempSkillsRoot `
        -WhatIf

    Assert-True ($LASTEXITCODE -eq 0) 'Installer WhatIf should succeed when manifest provides external discovery contract.'
    Assert-True ((@($output) -join "`n").Contains('skills-home\custom-skill-pack')) 'Installer should use link_name from manifest.'
    Assert-True ((@($output) -join "`n").Contains('runtime\skills')) 'Installer should use linked_source from manifest.'

    Write-Output 'install-skill-link tests passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
