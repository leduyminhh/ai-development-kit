param([string]$Root = (Get-Location).Path)
$ErrorActionPreference = 'Stop'

function New-Finding {
    param([string]$Severity, [string]$Message)
    [pscustomobject]@{ Severity = $Severity; Message = $Message }
}

$findings = New-Object System.Collections.Generic.List[object]
$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path

$agentsPath = Join-Path $resolvedRoot 'AGENTS.md'
if (Test-Path -LiteralPath $agentsPath) {
    $lineCount = (Get-Content -LiteralPath $agentsPath).Count
    if ($lineCount -gt 150) { $findings.Add((New-Finding 'warning' "AGENTS.md has $lineCount lines; keep it concise.")) }
    else { $findings.Add((New-Finding 'pass' "AGENTS.md exists and has $lineCount lines.")) }
} else {
    $findings.Add((New-Finding 'warning' 'AGENTS.md is missing. Add it when repository-level Codex guidance is needed.'))
}

$skillsRoot = Join-Path $resolvedRoot '.agents/skills'
if (Test-Path -LiteralPath $skillsRoot) {
    $skillFiles = Get-ChildItem -LiteralPath $skillsRoot -Recurse -Filter 'SKILL.md'
    foreach ($file in $skillFiles) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        if ($content -match '(?s)^---\s+.*?\s+---' -and $content -match '(?m)^name:\s*\S+' -and $content -match '(?m)^description:\s*\S+') {
            $findings.Add((New-Finding 'pass' "Skill frontmatter looks valid: $($file.FullName)"))
        } else {
            $findings.Add((New-Finding 'fail' "Skill frontmatter must include name and description: $($file.FullName)"))
        }
    }
} else {
    $findings.Add((New-Finding 'warning' '.agents/skills is missing. This is acceptable only before skills are introduced.'))
}

$codexAgentsRoot = Join-Path $resolvedRoot '.codex/agents'
if (Test-Path -LiteralPath $codexAgentsRoot) {
    foreach ($file in (Get-ChildItem -LiteralPath $codexAgentsRoot -Filter '*.toml')) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        if ($content -match '(?m)^name\s*=' -and $content -match '(?m)^description\s*=' -and $content -match '(?m)^developer_instructions\s*=') {
            $findings.Add((New-Finding 'pass' "Agent required fields look valid: $($file.FullName)"))
        } else {
            $findings.Add((New-Finding 'fail' "Agent is missing name, description, or developer_instructions: $($file.FullName)"))
        }
    }
} else {
    $findings.Add((New-Finding 'warning' '.codex/agents is missing. Add it when agent entry points are introduced.'))
}

$configPath = Join-Path $resolvedRoot '.codex/config.toml'
if (Test-Path -LiteralPath $configPath) {
    $config = Get-Content -LiteralPath $configPath -Raw
    if ($config -match 'sandbox_mode\s*=\s*"danger-full-access"' -and $config -match 'approval_policy\s*=\s*"never"') {
        $findings.Add((New-Finding 'fail' '.codex/config.toml combines danger-full-access with approval_policy never.'))
    } else {
        $findings.Add((New-Finding 'pass' '.codex/config.toml exists without obviously unsafe default pairing.'))
    }
} else {
    $findings.Add((New-Finding 'warning' '.codex/config.toml is missing. Add it when shared Codex configuration is needed.'))
}

Write-Output '## Codex Structure Validation'
foreach ($severity in @('fail', 'warning', 'pass')) {
    Write-Output "`n### $severity`n"
    $items = $findings | Where-Object { $_.Severity -eq $severity }
    if ($items.Count -eq 0) { Write-Output '- None' }
    foreach ($item in $items) { Write-Output "- $($item.Message)" }
}

if (($findings | Where-Object { $_.Severity -eq 'fail' }).Count -gt 0) { exit 1 }
