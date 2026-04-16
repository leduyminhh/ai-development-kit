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

function Normalize-ChangedFileArgument {
    param([string]$Value)
    return (($Value -replace '\\', '/') -replace '^[\/]+', '')
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
        Section          = $Section
        Description      = Get-CodexTomlStringValue -TomlText $MapText -Section $Section -Key 'description'
        Paths            = @(Get-CodexTomlArrayValue -TomlText $MapText -Section $Section -Key 'paths')
        Skills           = @(Get-CodexTomlArrayValue -TomlText $MapText -Section $Section -Key 'skills')
        Agents           = @(Get-CodexTomlArrayValue -TomlText $MapText -Section $Section -Key 'agents')
        Commands         = @(Get-CodexTomlArrayValue -TomlText $MapText -Section $Section -Key 'commands')
        PassChangedFiles = Get-CodexTomlBoolValue -TomlText $MapText -Section $Section -Key 'passChangedFiles' -Default $false
    }
}

function Convert-ToPowerShellSingleQuotedLiteral {
    param([string]$Value)
    return "'" + ($Value -replace "'", "''") + "'"
}

if ($FromGit) {
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $gitFiles = & git -C $Root diff --name-only HEAD 2>$null
        $gitDiffExitCode = $LASTEXITCODE
        $gitUntracked = & git -C $Root ls-files --others --exclude-standard 2>$null
        $gitUntrackedExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($gitDiffExitCode -ne 0) {
        throw "git diff --name-only HEAD failed with exit code $gitDiffExitCode"
    }

    if ($gitUntrackedExitCode -ne 0) {
        throw "git ls-files --others --exclude-standard failed with exit code $gitUntrackedExitCode"
    }

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
            Section          = $entry.Section
            Reason           = $reason
            Commands         = $entry.Commands
            PassChangedFiles = $entry.PassChangedFiles
        })
    }
}

if ($IncludeCommands) {
    $selected |
        ForEach-Object {
            foreach ($command in $_.Commands) {
                $resolvedCommand = $command
                if ($_.PassChangedFiles -and $ChangedFiles.Count -gt 0) {
                    $pathList = @($ChangedFiles | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique | ForEach-Object {
                        Normalize-ChangedFileArgument -Value $_
                    })
                    if ($pathList.Count -gt 0) {
                        $joinedPathList = $pathList -join '|'
                        if ($joinedPathList.Length -le 4000) {
                            $resolvedCommand = "$resolvedCommand -PathList $(Convert-ToPowerShellSingleQuotedLiteral -Value $joinedPathList)"
                        }
                    }
                }

                [pscustomobject]@{
                    Section = $_.Section
                    Reason  = $_.Reason
                    Command = $resolvedCommand
                }
            }
        } |
        ConvertTo-Json -Depth 4 -Compress
} else {
    $selected | ConvertTo-Json -Depth 4 -Compress
}
