param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string[]]$ChangedFiles = @(),
    [string[]]$ActivatedSkill = @(),
    [string[]]$AgentName = @(),
    [switch]$FromGit,
    [switch]$IncludeCommands
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib/codex-config.ps1')

function Normalize-TestPath {
    param([string]$Value)
    return ($Value -replace '\\', '/').Trim('./')
}

function Test-PathMatch {
    param([string]$ChangedPath, [string]$MappedPath)

    $changed = Normalize-TestPath -Value $ChangedPath
    $mapped = Normalize-TestPath -Value $MappedPath
    return ($changed -eq $mapped -or $changed.StartsWith("$mapped/"))
}

function Get-TestMapEntry {
    param([string]$MapText, [string]$Section)

    [pscustomobject]@{
        Section     = $Section
        Description = Get-CodexTomlStringValue -TomlText $MapText -Section $Section -Key 'description'
        Paths       = @(Get-CodexTomlArrayValue -TomlText $MapText -Section $Section -Key 'paths')
        Skills      = @(Get-CodexTomlArrayValue -TomlText $MapText -Section $Section -Key 'skills')
        Agents      = @(Get-CodexTomlArrayValue -TomlText $MapText -Section $Section -Key 'agents')
        Commands    = @(Get-CodexTomlArrayValue -TomlText $MapText -Section $Section -Key 'commands')
    }
}

if ($FromGit) {
    $gitFiles = & git -C $Root diff --name-only HEAD
    $gitUntracked = & git -C $Root ls-files --others --exclude-standard
    $ChangedFiles = @($ChangedFiles + $gitFiles + $gitUntracked | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
}

$mapPath = Join-Path $Root '.codex/test-map.toml'
if (-not (Test-Path -LiteralPath $mapPath)) {
    throw "Test map not found: $mapPath"
}

$mapText = Get-Content -LiteralPath $mapPath -Raw
$sections = @(Get-CodexTomlSections -TomlText $mapText | Where-Object { $_ -match '^test\.(always|core|skill)\.' })
$selected = New-Object System.Collections.Generic.List[object]

foreach ($section in $sections) {
    $entry = Get-TestMapEntry -MapText $mapText -Section $section
    $reason = $null

    if ($section -match '^test\.always\.') {
        $reason = 'always'
    } elseif ($section -match '^test\.skill\.') {
        foreach ($skill in $ActivatedSkill) {
            if ($entry.Skills -contains $skill) {
                $reason = "skill:$skill"
                break
            }
        }

        if ($null -eq $reason) {
            foreach ($agent in $AgentName) {
                if ($entry.Agents -contains $agent) {
                    $reason = "agent:$agent"
                    break
                }
            }
        }
    }

    if ($null -eq $reason) {
        foreach ($changed in $ChangedFiles) {
            foreach ($mapped in $entry.Paths) {
                if (Test-PathMatch -ChangedPath $changed -MappedPath $mapped) {
                    $reason = "path:$mapped"
                    break
                }
            }
            if ($null -ne $reason) { break }
        }
    }

    if ($null -ne $reason) {
        $selected.Add([pscustomobject]@{
            Section  = $entry.Section
            Reason   = $reason
            Commands = $entry.Commands
        })
    }
}

if ($IncludeCommands) {
    $selected |
        ForEach-Object {
            foreach ($command in $_.Commands) {
                [pscustomobject]@{
                    Section = $_.Section
                    Reason  = $_.Reason
                    Command = $command
                }
            }
        } |
        ConvertTo-Json -Depth 4 -Compress
} else {
    $selected | ConvertTo-Json -Depth 4 -Compress
}
