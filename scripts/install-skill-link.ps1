param(
    [string]$SourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$LinkName = 'codex-workflow-kit',
    [string]$SkillsRoot = (Join-Path $env:USERPROFILE '.codex/skills'),
    [switch]$Force,
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib/codex-config.ps1')

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

function Resolve-ExternalDiscoveryContract {
    param(
        [string]$ResolvedSourceRoot,
        [string]$DefaultLinkName
    )

    $manifestPath = Join-Path $ResolvedSourceRoot '.agents/skills/manifest.toml'
    $contract = @{
        LinkName = $DefaultLinkName
        LinkedSource = '.agents/skills'
    }

    if (-not (Test-Path -LiteralPath $manifestPath)) {
        return $contract
    }

    $manifestText = Get-Content -LiteralPath $manifestPath -Raw
    $manifestLinkName = Get-CodexTomlStringValue -TomlText $manifestText -Section 'external_discovery' -Key 'link_name'
    $manifestLinkedSource = Get-CodexTomlStringValue -TomlText $manifestText -Section 'external_discovery' -Key 'linked_source'

    if (-not [string]::IsNullOrWhiteSpace($manifestLinkName)) {
        $contract.LinkName = $manifestLinkName
    }

    if (-not [string]::IsNullOrWhiteSpace($manifestLinkedSource)) {
        $contract.LinkedSource = $manifestLinkedSource
    }

    return $contract
}

$resolvedSource = (Resolve-Path -LiteralPath $SourceRoot).Path
$externalDiscovery = Resolve-ExternalDiscoveryContract -ResolvedSourceRoot $resolvedSource -DefaultLinkName $LinkName
$sourceSkills = Join-Path $resolvedSource $externalDiscovery.LinkedSource
if (-not (Test-Path -LiteralPath $sourceSkills)) {
    throw "Source skills directory not found: $sourceSkills"
}

$linkPath = Join-Path $SkillsRoot $externalDiscovery.LinkName

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
