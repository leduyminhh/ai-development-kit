param(
    [string]$Root = (Get-Location).Path,
    [switch]$Fix,
    [switch]$IncludeProtectedPaths
)
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '../../../../scripts/lib/codex-config.ps1')

function New-Finding {
    param([string]$Severity, [string]$Message)
    [pscustomobject]@{ Severity = $Severity; Message = $Message }
}

function Test-AgentReadOnly {
    param([string]$TomlText)

    return (
        $TomlText -match '(?m)^\s*mode\s*=\s*"read-only"\s*$' -or
        $TomlText -match '(?m)^\s*can_write\s*=\s*false\s*$' -or
        $TomlText -match '(?m)^\s*must_remain_read_only\s*=\s*true\s*$'
    )
}

function Get-AgentRegistrationSummary {
    param([string]$AgentName)

    switch ($AgentName) {
        'codex-structure-validate' { return 'Structure validator agent' }
        'test-automation-validate' { return 'Test automation agent' }
        'code-design-pattern' { return 'Design pattern agent' }
        'diagram-generate' { return 'PlantUML diagram agent' }
        'doc-write' { return 'Documentation writer agent' }
        'git-workflow-design' { return 'Git workflow agent' }
        'java-analyze' { return 'oava architecture agent' }
        'security-code-review' { return 'Security review agent' }
        'test-qa-review' { return 'QA reviewer agent' }
        'react-code-generate' { return 'React implementation agent' }
        default { return 'Registered Codex agent' }
    }
}

function Get-AgentRegistrationBlock {
    param(
        [string]$AgentName,
        [string]$AgentPath,
        [bool]$ReadOnly,
        [string]$Summary,
        [bool]$HooksProjectEnabled = $false
    )

    $readOnlyValue = if ($ReadOnly) { 'true' } else { 'false' }
    $hooksProjectEnabledValue = if ($HooksProjectEnabled) { 'true' } else { 'false' }
    if ([string]::IsNullOrWhiteSpace($Summary)) {
        $Summary = 'Registered Codex agent'
    }

    return @"
# agents.$AgentName $Summary
[agents.$AgentName]
path = "$AgentPath"
read_only = $readOnlyValue
enabled = true
hooks_project_enabled = $hooksProjectEnabledValue
"@
}

function Sync-AgentRegistration {
    param(
        [string]$ConfigText,
        [string]$AgentName,
        [string]$AgentPath,
        [bool]$ReadOnly,
        [string]$Summary,
        [bool]$HooksProjectEnabled = $false
    )

    $block = Get-AgentRegistrationBlock -AgentName $AgentName -AgentPath $AgentPath -ReadOnly $ReadOnly -Summary $Summary -HooksProjectEnabled $HooksProjectEnabled
    $sectionPattern = "(?ms)(?:^#\s*agents\.$([regex]::Escape($AgentName)).*?\r?\n)?^\[agents\.$([regex]::Escape($AgentName))\]\s*.*?(?=^#\s|\z)"

    if ([regex]::IsMatch($ConfigText, $sectionPattern)) {
        return [regex]::Replace($ConfigText, $sectionPattern, ($block.TrimEnd() + [Environment]::NewLine))
    }

    $separator = if ($ConfigText.EndsWith("`r`n`r`n") -or $ConfigText.EndsWith("`n`n")) { '' } elseif ($ConfigText.EndsWith("`r`n") -or $ConfigText.EndsWith("`n")) { [Environment]::NewLine } else { [Environment]::NewLine + [Environment]::NewLine }
    return $ConfigText + $separator + $block.TrimEnd() + [Environment]::NewLine
}

function Get-DefaultConfigText {
    return @'
# environment Global runtime access
[environment]
network_access = true

# behavior Global assistant behavior
[behavior]
default_language = "vi"
prefer_inline_output_over_file_write = true
confirm_before_protected_write = true
protected_paths = ["docs/", "reports/"]
disallow_unsafe_destructive_actions = true
avoid_unrelated_file_changes = true
require_pre_write_summary = true

# validation Global structure validation
[validation]
run_after_structure_change = true
validator_command = "powershell -ExecutionPolicy Bypass -File .agents/skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix"

# scan.policy Global scan scope
[scan.policy]
skipProtectedPathsByDefault = true
protectedScanPaths = ["docs/", "reports/"]
requireExplicitAllow = true

# output.file Global response file naming
[output.file]
filenamePattern = "filename_yyyyMMdd_HHmm"
timezone = "Asia/Saigon"
requireConfirmationForProtectedPaths = true

# output.file.extensionsBySubpath Global extension resolver
[output.file.extensionsBySubpath]
"docs/diagram" = "puml"
"docs/specs" = "md"
"docs/plans" = "md"
"docs/reports" = "md"
"reports" = "md"
"reports/audit" = "log"

# documentation.writer Documentation output policy
[documentation.writer]
rootPath = "docs"
createRootOnConfirm = true
requireConfirmation = true

# diagram.writer PlantUML diagram output policy
[diagram.writer]
rootPath = "docs/diagram"
subagentPath = true
filenamePattern = "filename_yyyyMMdd_HHmm"
defaultExtension = "puml"
createRootOnConfirm = true
requireConfirmation = true

# hooks.project Project event logging
[hooks.project]
enabled = true
host = "127.0.0.1"
port = 42890
path = "reports/audit"
runtimePath = "reports/audit/runtime"
filenamePattern = "yyyyMMdd_filename"
remainingDays = 30
format = "text"
serviceName = "codex-workflow-kit"
defaultLogger = "codex.project"
defaultTimezone = "Asia/Saigon"
agentHook = ".codex/hooks/log-agent-event.ps1"
reloadOnConfigChange = true

# guards Safety enforcement
[guards]
block_danger_full_access = false
block_never_approval_for_normal_dev = true
require_explicit_confirmation_for_protected_paths = true
block_silent_writes_to_protected_paths = true
block_delete_without_confirmation = true
'@
}

function Ensure-ScaffoldDirectory {
    param(
        [string]$Path,
        [string]$Label,
        [bool]$TrackWhenEmpty = $true
    )

    if (Test-Path -LiteralPath $Path) {
        $script:findings.Add((New-Finding 'pass' "$Label exists: $Path"))
    } elseif ($Fix) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        $script:findings.Add((New-Finding 'pass' "$Label scaffold created: $Path"))
    } else {
        $script:findings.Add((New-Finding 'warning' "$Label is missing. Run validator with -Fix to create the scaffold: $Path"))
    }

    if ($Fix -and $TrackWhenEmpty -and (Test-Path -LiteralPath $Path)) {
        $items = @(Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue)
        if ($items.Count -eq 0) {
            $gitkeepPath = Join-Path $Path '.gitkeep'
            New-Item -ItemType File -Path $gitkeepPath -Force | Out-Null
            $script:findings.Add((New-Finding 'pass' "$Label empty scaffold marker created: $gitkeepPath"))
        }
    }
}

$findings = New-Object System.Collections.Generic.List[object]
$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$configPath = Join-Path $resolvedRoot '.codex/config.toml'
$testMapPath = Join-Path $resolvedRoot '.codex/test-map.toml'
$configText = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw } else { '' }
$protectedScanPaths = Get-CodexTomlArrayValue -TomlText $configText -Section 'scan.policy' -Key 'protectedScanPaths' -Default @('docs/', 'reports/')
$skipProtectedPathsByDefault = Get-CodexTomlBoolValue -TomlText $configText -Section 'scan.policy' -Key 'skipProtectedPathsByDefault' -Default $true
$requireExplicitProtectedScanAllow = Get-CodexTomlBoolValue -TomlText $configText -Section 'scan.policy' -Key 'requireExplicitAllow' -Default $true

$codexRoot = Join-Path $resolvedRoot '.codex'
Ensure-ScaffoldDirectory -Path $codexRoot -Label 'Codex root' -TrackWhenEmpty $false

$agentsPath = Join-Path $resolvedRoot 'AGENTS.md'
if (Test-Path -LiteralPath $agentsPath) {
    $lineCount = (Get-Content -LiteralPath $agentsPath).Count
    if ($lineCount -gt 150) { $findings.Add((New-Finding 'warning' "AGENTS.md has $lineCount lines; keep it concise.")) }
    else { $findings.Add((New-Finding 'pass' "AGENTS.md exists and has $lineCount lines.")) }
} else {
    $findings.Add((New-Finding 'warning' 'AGENTS.md is missing. Add it when repository-level Codex guidance is needed.'))
}

$skillNames = New-Object System.Collections.Generic.HashSet[string]
$skillsRoot = Join-Path $resolvedRoot '.agents/skills'
Ensure-ScaffoldDirectory -Path $skillsRoot -Label 'Skills root' -TrackWhenEmpty $true
if (Test-Path -LiteralPath $skillsRoot) {
    $skillFiles = Get-ChildItem -LiteralPath $skillsRoot -Filter 'SKILL.md' -Recurse
    foreach ($file in $skillFiles) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        $nameMatch = [regex]::Match($content, '(?m)^name:\s*(.+?)\s*$')
        if ($content -match '(?s)^---\s+.*?\s+---' -and $nameMatch.Success -and $content -match '(?m)^description:\s*\S+') {
            [void]$skillNames.Add($nameMatch.Groups[1].Value.Trim().Trim('"'))
            $findings.Add((New-Finding 'pass' "Skill frontmatter looks valid: $($file.FullName)"))
        } else {
            $findings.Add((New-Finding 'fail' "Skill frontmatter must include name and description: $($file.FullName)"))
        }

        $subagentsPath = Join-Path $file.Directory.FullName 'subagents'
        Ensure-ScaffoldDirectory -Path $subagentsPath -Label "Skill subagents root for $($file.Directory.Name)" -TrackWhenEmpty $true
    }
} else {
    $findings.Add((New-Finding 'warning' '.agents/skills is missing. This is acceptable only before skills are introduced.'))
}

$workflowsRoot = Join-Path $resolvedRoot 'workflows'
if (Test-Path -LiteralPath $workflowsRoot) {
    $findings.Add((New-Finding 'pass' "Workflows root exists: $workflowsRoot"))
    foreach ($file in @(Get-ChildItem -LiteralPath $workflowsRoot -Recurse -Filter 'WORKFLOW.md' -File -ErrorAction SilentlyContinue)) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        $nameMatch = [regex]::Match($content, '(?m)^name:\s*(.+?)\s*$')
        if ($content -match '(?s)^---\s+.*?\s+---' -and $nameMatch.Success -and $content -match '(?m)^description:\s*\S+') {
            $findings.Add((New-Finding 'pass' "Workflow frontmatter looks valid: $($file.FullName)"))
        } else {
            $findings.Add((New-Finding 'fail' "Workflow frontmatter must include name and description: $($file.FullName)"))
        }
    }
}

if ($IncludeProtectedPaths -or -not $skipProtectedPathsByDefault -or -not $requireExplicitProtectedScanAllow) {
    foreach ($protectedPath in $protectedScanPaths) {
        $resolvedProtectedPath = Join-Path $resolvedRoot $protectedPath
        if (-not (Test-Path -LiteralPath $resolvedProtectedPath)) {
            continue
        }

        foreach ($file in (Get-ChildItem -LiteralPath $resolvedProtectedPath -Recurse -Filter 'SKILL.md' -File -ErrorAction SilentlyContinue)) {
            $content = Get-Content -LiteralPath $file.FullName -Raw
            if ($content -match '(?s)^---\s+.*?\s+---' -and $content -match '(?m)^name:\s*\S+' -and $content -match '(?m)^description:\s*\S+') {
                $findings.Add((New-Finding 'pass' "Protected skill frontmatter looks valid: $($file.FullName)"))
            } else {
                $findings.Add((New-Finding 'fail' "Protected skill frontmatter must include name and description: $($file.FullName)"))
            }
        }
    }
} else {
    $findings.Add((New-Finding 'pass' "Protected scan skipped by policy: $($protectedScanPaths -join ', ')"))
}

$agentRegistrations = New-Object System.Collections.Generic.List[object]
$codexAgentsRoot = Join-Path $resolvedRoot '.codex/agents'
Ensure-ScaffoldDirectory -Path $codexAgentsRoot -Label 'Step 1 codex-agent root' -TrackWhenEmpty $true
if (Test-Path -LiteralPath $codexAgentsRoot) {
    foreach ($file in (Get-ChildItem -LiteralPath $codexAgentsRoot -Filter '*.toml')) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        $agentName = Get-CodexTomlStringValue -TomlText $content -Key 'name'
        if ($content -match '(?m)^name\s*=' -and $content -match '(?m)^description\s*=' -and $content -match '(?m)^developer_instructions\s*=') {
            $findings.Add((New-Finding 'pass' "Agent required fields look valid: $($file.FullName)"))
        } else {
            $findings.Add((New-Finding 'fail' "Agent is missing name, description, or developer_instructions: $($file.FullName)"))
        }

        if (-not [string]::IsNullOrWhiteSpace($agentName)) {
            if ($skillNames.Count -gt 0) {
                $referencedSkill = $false
                foreach ($skillName in $skillNames) {
                    if ($content -match [regex]::Escape($skillName)) {
                        $referencedSkill = $true
                        break
                    }
                }

                if ($referencedSkill) {
                    $findings.Add((New-Finding 'pass' "Agent references a known skill: $agentName"))
                } else {
                    $findings.Add((New-Finding 'warning' "Agent does not reference a known skill: $agentName"))
                }
            }

            $agentRegistrations.Add([pscustomobject]@{
                Name                = $agentName
                Path                = ".codex/agents/$($file.Name)"
                ReadOnly            = (Test-AgentReadOnly -TomlText $content)
                Summary             = (Get-AgentRegistrationSummary -AgentName $agentName)
                HooksProjectEnabled = $false
            })
        }
    }
} else {
    $findings.Add((New-Finding 'warning' '.codex/agents is missing. Add it when agent entry points are introduced.'))
}

$codexHooksRoot = Join-Path $resolvedRoot '.codex/hooks'
Ensure-ScaffoldDirectory -Path $codexHooksRoot -Label 'Step 3 codex-hook root' -TrackWhenEmpty $true

$codexMcpRoot = Join-Path $resolvedRoot '.codex/mcp'
Ensure-ScaffoldDirectory -Path $codexMcpRoot -Label 'Step 4 codex-mcp root' -TrackWhenEmpty $true

if (Test-Path -LiteralPath $testMapPath) {
    $testMapText = Get-Content -LiteralPath $testMapPath -Raw
    $findings.Add((New-Finding 'pass' '.codex/test-map.toml exists for selected test mapping.'))

    $testFiles = @(Get-ChildItem -LiteralPath $resolvedRoot -Recurse -File -Filter '*test*.ps1' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\.git\\' } |
        ForEach-Object {
            ($_.FullName.Substring($resolvedRoot.Length).TrimStart('\') -replace '\\', '/')
        })

    foreach ($testFile in $testFiles) {
        if ($testFile -eq 'scripts/test-install-skill-link.ps1') {
            continue
        }

        if ($testMapText.Contains($testFile)) {
            $findings.Add((New-Finding 'pass' "Test file is mapped: $testFile"))
        } else {
            $findings.Add((New-Finding 'fail' "Test file must be mapped in .codex/test-map.toml: $testFile"))
        }
    }
} else {
    $findings.Add((New-Finding 'warning' '.codex/test-map.toml is missing. Add it before introducing selected test routing.'))
}

if (Test-Path -LiteralPath $configPath) {
    $config = Get-Content -LiteralPath $configPath -Raw
    $originalConfig = $config
    if ($config -match 'sandbox_mode\s*=\s*"danger-full-access"' -and $config -match 'approval_policy\s*=\s*"never"') {
        $findings.Add((New-Finding 'fail' '.codex/config.toml combines danger-full-access with approval_policy never.'))
    } else {
        $findings.Add((New-Finding 'pass' '.codex/config.toml exists without obviously unsafe default pairing.'))
    }

    foreach ($registration in $agentRegistrations) {
        $registrationPattern = "(?ms)^\[agents\.$([regex]::Escape($registration.Name))\]\s*.*?path\s*=\s*`"$([regex]::Escape($registration.Path))`""
        if ($config -match $registrationPattern) {
            $findings.Add((New-Finding 'pass' "Agent config registration exists: $($registration.Name)"))
        } elseif ($Fix) {
            $config = Sync-AgentRegistration -ConfigText $config -AgentName $registration.Name -AgentPath $registration.Path -ReadOnly $registration.ReadOnly -Summary $registration.Summary -HooksProjectEnabled $registration.HooksProjectEnabled
            $findings.Add((New-Finding 'pass' "Agent config registration synced: $($registration.Name)"))
        } else {
            $findings.Add((New-Finding 'warning' "Agent config registration missing: $($registration.Name). Run validator with -Fix to sync .codex/config.toml."))
        }
    }

    if ($Fix -and $config -ne $originalConfig) {
        Set-Content -LiteralPath $configPath -Value $config -Encoding utf8
    }
} else {
    if ($Fix) {
        New-Item -ItemType Directory -Path (Split-Path -Parent $configPath) -Force | Out-Null
        $config = Get-DefaultConfigText
        foreach ($registration in $agentRegistrations) {
            $config = Sync-AgentRegistration -ConfigText $config -AgentName $registration.Name -AgentPath $registration.Path -ReadOnly $registration.ReadOnly -Summary $registration.Summary -HooksProjectEnabled $registration.HooksProjectEnabled
        }
        Set-Content -LiteralPath $configPath -Value $config -Encoding utf8
        $findings.Add((New-Finding 'pass' '.codex/config.toml was created and synced from the standard scaffold.'))
    } else {
        $findings.Add((New-Finding 'warning' '.codex/config.toml is missing. Add it when shared Codex configuration is needed.'))
    }
}

Write-Output '## Codex Structure Validation'
foreach ($severity in @('fail', 'warning', 'pass')) {
    Write-Output "`n### $severity`n"
    $items = $findings | Where-Object { $_.Severity -eq $severity }
    if ($items.Count -eq 0) { Write-Output '- None' }
    foreach ($item in $items) { Write-Output "- $($item.Message)" }
}

if (@($findings | Where-Object { $_.Severity -eq 'fail' }).Count -gt 0) { exit 1 }



