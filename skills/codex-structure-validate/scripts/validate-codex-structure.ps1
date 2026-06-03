param(
    [string]$Root = (Get-Location).Path,
    [switch]$Fix,
    [switch]$IncludeProtectedPaths
)
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '../../../scripts/lib/codex-config.ps1')

function New-Finding {
    param([string]$Severity, [string]$Message)
    [pscustomobject]@{ Severity = $Severity; Message = $Message }
}

function Test-HasUtf8Bom {
    param([string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    return $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
}

function Get-SkillFrontmatterValue {
    param([string]$FrontmatterText, [string]$Key)

    $match = [regex]::Match($FrontmatterText, "(?m)^\s*$([regex]::Escape($Key))\s*:\s*(.+?)\s*$")
    if (-not $match.Success) {
        return $null
    }

    return $match.Groups[1].Value.Trim().Trim('"')
}

function Test-SkillNameFormat {
    param([string]$Name)

    return (
        $Name.Length -ge 1 -and
        $Name.Length -le 64 -and
        $Name -match '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
}

function Get-MarkdownSectionText {
    param([string]$Text, [string]$Heading)

    $pattern = "(?ms)^##\s+$([regex]::Escape($Heading))\s*\r?\n(.*?)(?=^##\s+|\z)"
    $match = [regex]::Match($Text, $pattern)
    if (-not $match.Success) {
        return ''
    }

    return $match.Groups[1].Value.Trim()
}

function Get-LineCountMatching {
    param([string]$Text, [string]$Pattern)

    return @(($Text -split '\r?\n') | Where-Object { $_ -match $Pattern }).Count
}

function Get-MarkdownH2Headings {
    param([string]$Text)

    return @(
        [regex]::Matches($Text, '(?m)^##\s+(.+?)\s*$') |
            ForEach-Object { $_.Groups[1].Value.Trim() }
    )
}

function Get-MarkdownH1Headings {
    param([string]$Text)

    return @(
        [regex]::Matches($Text, '(?m)^#\s+(.+?)\s*$') |
            ForEach-Object { $_.Groups[1].Value.Trim() }
    )
}

function Remove-MarkdownFencedCodeBlocks {
    param([string]$Text)

    return [regex]::Replace($Text, '(?ms)^```.*?^```', '')
}

function Get-RelativeRepoPath {
    param([string]$ResolvedRoot, [string]$FullPath)

    return ($FullPath.Substring($ResolvedRoot.Length).TrimStart('\', '/') -replace '\\', '/')
}

function Get-GitChangedRootMarkdown {
    param([string]$ResolvedRoot)

    try {
        $insideWorkTree = (& git -C $ResolvedRoot rev-parse --is-inside-work-tree 2>$null)
        if ($LASTEXITCODE -ne 0 -or $insideWorkTree -ne 'true') {
            return @()
        }

        $changed = New-Object System.Collections.Generic.HashSet[string]
        foreach ($mode in @('', '--cached')) {
            $args = @('-C', $ResolvedRoot, 'diff', '--name-only')
            if ($mode -eq '--cached') {
                $args += '--cached'
            }
            $args += @('--', 'README.md', 'README_VI.md')
            $items = & git @args 2>$null
            foreach ($item in $items) {
                if (-not [string]::IsNullOrWhiteSpace($item)) {
                    [void]$changed.Add(($item -replace '\\', '/'))
                }
            }
        }

        return @($changed)
    } catch {
        return @()
    }
}

function Get-SkillsReadmeCatalogNames {
    param([string]$ReadmeText)

    return @(
        [regex]::Matches($ReadmeText, '(?m)^\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|') |
            ForEach-Object { $_.Groups[1].Value.Trim() }
    )
}

function Test-ReadmeContainsInstallCommandContract {
    param(
        [string]$ReadmeText,
        [string[]]$AllowedSkillNames
    )

    $missing = New-Object System.Collections.Generic.List[string]
    $requiredSnippets = @(
        'leduyminhh/ai-development-kit',
        'npx skills --help',
        'npx skills -h',
        'npx skills add',
        'npx skills a',
        'npx skills ls',
        '--agent codex',
        '--agent claude-code',
        '--agent cursor',
        '--list'
    )

    foreach ($snippet in $requiredSnippets) {
        if (-not $ReadmeText.Contains($snippet)) {
            $missing.Add($snippet)
        }
    }

    foreach ($skillName in $AllowedSkillNames) {
        if (-not $ReadmeText.Contains($skillName)) {
            $missing.Add("allowlist skill: $skillName")
        }
    }

    return @($missing)
}

function Test-ProjectMarkdownQuality {
    param(
        [string]$ResolvedRoot,
        [string]$FullPath
    )

    $relativePath = Get-RelativeRepoPath -ResolvedRoot $ResolvedRoot -FullPath $FullPath
    if ($relativePath -match '^(docs|reports)/') {
        return $null
    }
    if ($relativePath -match '^skills/[^/]+/(resources|subagents)/') {
        return $null
    }
    if ($relativePath -match '^references/external/') {
        return $null
    }

    $text = Get-Content -LiteralPath $FullPath -Raw
    $textForHeadings = Remove-MarkdownFencedCodeBlocks -Text $text
    $h1Count = (Get-MarkdownH1Headings -Text $textForHeadings).Count
    return [pscustomobject]@{
        RelativePath = $relativePath
        HasBom       = (Test-HasUtf8Bom -Path $FullPath)
        H1Count      = $h1Count
    }
}

function Get-ConfiguredSkillsRoot {
    param([string]$ResolvedRoot)

    $defaultSkillsRoot = 'skills'
    $manifestPath = Join-Path $ResolvedRoot 'skills/manifest.toml'
    if (-not (Test-Path -LiteralPath $manifestPath)) {
        return $defaultSkillsRoot
    }

    $manifestText = Get-Content -LiteralPath $manifestPath -Raw
    $configuredSkillsRoot = Get-CodexTomlStringValue -TomlText $manifestText -Section 'repo_structure' -Key 'skills_root'
    if ([string]::IsNullOrWhiteSpace($configuredSkillsRoot)) {
        return $defaultSkillsRoot
    }

    return $configuredSkillsRoot
}

function Test-AgentReadOnly {
    param([string]$TomlText)

    return (
        $TomlText -match '(?m)^\s*mode\s*=\s*"read-only"\s*$' -or
        $TomlText -match '(?m)^\s*sandbox_mode\s*=\s*"read-only"\s*$' -or
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

function Get-AgentRegistryBlock {
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
# agent_registry.$AgentName $Summary
[agent_registry.$AgentName]
path = "$AgentPath"
read_only = $readOnlyValue
enabled = true
hooks_project_enabled = $hooksProjectEnabledValue
"@
}

function Sync-AgentRegistryEntry {
    param(
        [string]$ConfigText,
        [string]$AgentName,
        [string]$AgentPath,
        [bool]$ReadOnly,
        [string]$Summary,
        [bool]$HooksProjectEnabled = $false
    )

    $block = Get-AgentRegistryBlock -AgentName $AgentName -AgentPath $AgentPath -ReadOnly $ReadOnly -Summary $Summary -HooksProjectEnabled $HooksProjectEnabled
    $sectionPattern = "(?ms)(?:^#\s*(?:agent_registry|agents)\.$([regex]::Escape($AgentName)).*?\r?\n)?^\[(?:agent_registry|agents)\.$([regex]::Escape($AgentName))\]\s*.*?(?=^#\s|\z)"

    if ([regex]::IsMatch($ConfigText, $sectionPattern)) {
        return [regex]::Replace($ConfigText, $sectionPattern, ($block.TrimEnd() + [Environment]::NewLine))
    }

    $separator = if ($ConfigText.EndsWith("`r`n`r`n") -or $ConfigText.EndsWith("`n`n")) { '' } elseif ($ConfigText.EndsWith("`r`n") -or $ConfigText.EndsWith("`n")) { [Environment]::NewLine } else { [Environment]::NewLine + [Environment]::NewLine }
    return $ConfigText + $separator + $block.TrimEnd() + [Environment]::NewLine
}

function Get-AgentMetadataBlock {
    param(
        [string]$AgentName,
        [bool]$ReadOnly,
        [string]$Summary,
        [bool]$HooksProjectEnabled = $false
    )

    $readOnlyValue = if ($ReadOnly) { 'true' } else { 'false' }
    $hooksProjectEnabledValue = if ($HooksProjectEnabled) { 'true' } else { 'false' }
    if ([string]::IsNullOrWhiteSpace($Summary)) {
        $Summary = Get-AgentRegistrationSummary -AgentName $AgentName
    }

    return @"
name = "$AgentName"
summary = "$Summary"
read_only = $readOnlyValue
hooks_project_enabled = $hooksProjectEnabledValue
"@
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
validator_command = "powershell -ExecutionPolicy Bypass -File skills/codex-structure-validate/scripts/validate-codex-structure.ps1 -Root . -Fix"

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

function Get-DefaultSkillTemplateText {
    return @'
---
name: lowercase-hyphen-name
description: Third-person trigger description that says what the skill does and when to use it.
---

# Skill Name

## Overview

State what the skill does, the outcome it helps produce, and the boundary of responsibility.

## When to Use

List the user requests, project states, or signals that should trigger this skill.

## Core Process

1. Read the minimum relevant context.
2. Apply the skill-specific workflow.
3. Run the relevant deterministic checks.
4. Report the result, evidence, and remaining risk.

## Examples

- Example request or situation where the skill should be used.
- Example output, decision, or artifact the skill should produce.

## Common Rationalizations

| Rationalization | Rebuttal |
|---|---|
| "This skill can skip the standard structure." | All runtime skills must follow this template so agents can consume them consistently. |
| "A new skill only needs frontmatter." | Frontmatter triggers the skill, but the body defines the workflow contract. |

## Red Flags

- The skill omits required template headings.
- The skill mixes unrelated domain workflows into one entry point.
- The skill requires loading large references before the user request needs them.

## Verification

- YAML frontmatter includes `name` and `description`.
- The first Markdown H1 is the skill name.
- H2 headings match this template in order.
- Skill-owned resources, scripts, and subagents are referenced only when needed.

## Resource Map

- `resources/<file>.md`: when to load this reference.

## Subagent Prompts

- `subagents/<file>.md`: focused prompt and when to use it.

## Scripts

- `scripts/<file>`: deterministic helper and when to run it.

## Output Format

```text
Recommended response or artifact shape.
```

## Notes

- Keep `SKILL.md` concise and move detailed variants into `resources/`.
- Avoid duplicate headings and auxiliary README-style files inside a skill folder.
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
$agentMetadataRoot = Join-Path $resolvedRoot '.codex/agent-metadata'
Ensure-ScaffoldDirectory -Path $agentMetadataRoot -Label 'Agent metadata root' -TrackWhenEmpty $true

$agentsPath = Join-Path $resolvedRoot 'AGENTS.md'
if (Test-Path -LiteralPath $agentsPath) {
    $lineCount = (Get-Content -LiteralPath $agentsPath).Count
    if ($lineCount -gt 150) { $findings.Add((New-Finding 'warning' "AGENTS.md has $lineCount lines; keep it concise.")) }
    else { $findings.Add((New-Finding 'pass' "AGENTS.md exists and has $lineCount lines.")) }

    $agentsText = Get-Content -LiteralPath $agentsPath -Raw
    if ($agentsText.Contains('README.md') -and $agentsText.Contains('README_VI.md')) {
        $findings.Add((New-Finding 'pass' 'AGENTS.md documents the README_VI.md sync rule.'))
    } else {
        $findings.Add((New-Finding 'warning' 'AGENTS.md should state that README_VI.md must be updated when README.md changes.'))
    }
} else {
    $findings.Add((New-Finding 'warning' 'AGENTS.md is missing. Add it when repository-level Codex guidance is needed.'))
}

$readmePath = Join-Path $resolvedRoot 'README.md'
$readmeViPath = Join-Path $resolvedRoot 'README_VI.md'
if (Test-Path -LiteralPath $readmePath) {
    if (Test-Path -LiteralPath $readmeViPath) {
        $findings.Add((New-Finding 'pass' 'README_VI.md exists as the Vietnamese README companion.'))
    } else {
        $findings.Add((New-Finding 'fail' 'README_VI.md is required when README.md exists.'))
    }

    $readmeText = Get-Content -LiteralPath $readmePath -Raw
    $defaultInstallAllowlist = @(
        'agent-operating-rules',
        'diagram-generate',
        'doc-write',
        'git-workflow-design',
        'security-code-review'
    )
    $missingInstallContract = Test-ReadmeContainsInstallCommandContract -ReadmeText $readmeText -AllowedSkillNames $defaultInstallAllowlist
    if ($missingInstallContract.Count -eq 0) {
        $findings.Add((New-Finding 'pass' 'README.md documents the required npx skills install command contract.'))
    } else {
        $findings.Add((New-Finding 'fail' "README.md must document repo URI, allowlist, help, alias, and Codex/Claude/Cursor install commands. Missing: $($missingInstallContract -join ', ')"))
    }

    $changedRootReadmes = @(Get-GitChangedRootMarkdown -ResolvedRoot $resolvedRoot)
    if (($changedRootReadmes -contains 'README.md') -and -not ($changedRootReadmes -contains 'README_VI.md')) {
        $findings.Add((New-Finding 'fail' 'README.md changed without README_VI.md in the same git diff. Update README_VI.md in the same change.'))
    } elseif (($changedRootReadmes -contains 'README.md') -and ($changedRootReadmes -contains 'README_VI.md')) {
        $findings.Add((New-Finding 'pass' 'README.md and README_VI.md are changing together in the current git diff.'))
    } else {
        $findings.Add((New-Finding 'pass' 'No pending README.md change requires README_VI.md sync.'))
    }
}

$skillTemplatePath = Join-Path $resolvedRoot 'skills/SKILL_TEMPLATE.md'
if (Test-Path -LiteralPath $skillTemplatePath) {
    $findings.Add((New-Finding 'pass' 'Skill template exists: skills/SKILL_TEMPLATE.md'))
} elseif ($Fix) {
    $skillTemplateParent = Split-Path -Parent $skillTemplatePath
    New-Item -ItemType Directory -Path $skillTemplateParent -Force | Out-Null
    [System.IO.File]::WriteAllText($skillTemplatePath, (Get-DefaultSkillTemplateText), [System.Text.UTF8Encoding]::new($false))
    $findings.Add((New-Finding 'pass' 'Skill template scaffold created: skills/SKILL_TEMPLATE.md'))
} else {
    $findings.Add((New-Finding 'fail' 'Skill template is required: skills/SKILL_TEMPLATE.md'))
}

$skillNames = New-Object System.Collections.Generic.HashSet[string]
$skillsRootRelative = Get-ConfiguredSkillsRoot -ResolvedRoot $resolvedRoot
$skillsRoot = Join-Path $resolvedRoot $skillsRootRelative
Ensure-ScaffoldDirectory -Path $skillsRoot -Label 'Skills root' -TrackWhenEmpty $true
if (Test-Path -LiteralPath $skillsRoot) {
    $skillFiles = Get-ChildItem -LiteralPath $skillsRoot -Filter 'SKILL.md' -Recurse
    foreach ($file in $skillFiles) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        if (Test-HasUtf8Bom -Path $file.FullName) {
            $findings.Add((New-Finding 'fail' "Skill file must not start with UTF-8 BOM: $($file.FullName)"))
        }
        $frontmatterMatch = [regex]::Match($content, '(?s)\A---\s*(.*?)\s*---')
        $name = $null
        $description = $null
        if ($frontmatterMatch.Success) {
            $name = Get-SkillFrontmatterValue -FrontmatterText $frontmatterMatch.Groups[1].Value -Key 'name'
            $description = Get-SkillFrontmatterValue -FrontmatterText $frontmatterMatch.Groups[1].Value -Key 'description'
        }

        if ($frontmatterMatch.Success -and -not [string]::IsNullOrWhiteSpace($name) -and -not [string]::IsNullOrWhiteSpace($description)) {
            [void]$skillNames.Add($name)
            $findings.Add((New-Finding 'pass' "Skill frontmatter includes name and description: $($file.FullName)"))
        } else {
            $findings.Add((New-Finding 'fail' "Skill frontmatter must include name and description: $($file.FullName)"))
        }

        if (-not [string]::IsNullOrWhiteSpace($name)) {
            if (Test-SkillNameFormat -Name $name) {
                $findings.Add((New-Finding 'pass' "Skill name format is valid: $name"))
            } else {
                $findings.Add((New-Finding 'fail' "Skill name must be 1-64 lowercase alphanumeric or hyphen chars without leading, trailing, or consecutive hyphens: $($file.FullName)"))
            }

            if ($name -eq $file.Directory.Name) {
                $findings.Add((New-Finding 'pass' "Skill name matches directory: $name"))
            } else {
                $findings.Add((New-Finding 'fail' "Skill name '$name' must match directory '$($file.Directory.Name)': $($file.FullName)"))
            }
        }

        if (-not [string]::IsNullOrWhiteSpace($description)) {
            if ($description.Length -le 1024) {
                $findings.Add((New-Finding 'pass' "Skill description length OK ($($description.Length) chars): $($file.FullName)"))
            } else {
                $findings.Add((New-Finding 'fail' "Skill description must be 1-1024 characters: $($file.FullName)"))
            }
        }

        if ($file.Directory.Parent.FullName -eq $skillsRoot) {
            $findings.Add((New-Finding 'pass' "Skill directory is flat under $skillsRootRelative/: $($file.Directory.Name)"))
        } else {
            $findings.Add((New-Finding 'fail' "Runtime skills must be flat under $skillsRootRelative/<name>/SKILL.md: $($file.FullName)"))
        }

        $bodyLineCount = @($content -split "\r?\n").Count
        if ($bodyLineCount -le 500) {
            $findings.Add((New-Finding 'pass' "Skill body length OK ($bodyLineCount lines): $($file.FullName)"))
        } else {
            $findings.Add((New-Finding 'warning' "Skill body should stay under 500 lines for Claude Code best practices ($bodyLineCount lines): $($file.FullName)"))
        }

        $requiredSections = @(
            'Overview',
            'When to Use',
            'Core Process',
            'Examples',
            'Common Rationalizations',
            'Red Flags',
            'Verification',
            'Resource Map',
            'Subagent Prompts',
            'Scripts',
            'Output Format',
            'Notes'
        )

        $h2Headings = Get-MarkdownH2Headings -Text $content
        $actualTemplateOrder = $h2Headings -join ' | '
        $expectedTemplateOrder = $requiredSections -join ' | '
        if ($actualTemplateOrder -eq $expectedTemplateOrder) {
            $findings.Add((New-Finding 'pass' "Skill H2 headings match template order: $($file.FullName)"))
        } else {
            $findings.Add((New-Finding 'fail' "Skill H2 headings must match skills/SKILL_TEMPLATE.md order. Expected: $expectedTemplateOrder. Actual: $actualTemplateOrder. File: $($file.FullName)"))
        }

        $sectionTexts = @{}
        foreach ($section in $requiredSections) {
            $sectionText = Get-MarkdownSectionText -Text $content -Heading $section
            $sectionTexts[$section] = $sectionText
            if ([string]::IsNullOrWhiteSpace($sectionText)) {
                $findings.Add((New-Finding 'fail' "Skill section is required and must not be empty: $section in $($file.FullName)"))
            } else {
                $findings.Add((New-Finding 'pass' "Skill section exists: $section in $($file.FullName)"))
            }
        }

        if (-not [string]::IsNullOrWhiteSpace($sectionTexts['Core Process']) -and (Get-LineCountMatching -Text $sectionTexts['Core Process'] -Pattern '^\s*\d+\.') -lt 3) {
            $findings.Add((New-Finding 'fail' "Skill Core Process must contain at least 3 numbered steps: $($file.FullName)"))
        }
        if (-not [string]::IsNullOrWhiteSpace($sectionTexts['Examples']) -and (Get-LineCountMatching -Text $sectionTexts['Examples'] -Pattern '^\s*-') -lt 2) {
            $findings.Add((New-Finding 'fail' "Skill Examples must contain at least 2 concrete bullets: $($file.FullName)"))
        }
        if (-not [string]::IsNullOrWhiteSpace($sectionTexts['Common Rationalizations'])) {
            $rationalizationRows = Get-LineCountMatching -Text $sectionTexts['Common Rationalizations'] -Pattern '^\|'
            if ($sectionTexts['Common Rationalizations'] -notmatch '\|\s*Rationalization\s*\|\s*Rebuttal\s*\|' -or $rationalizationRows -lt 4) {
                $findings.Add((New-Finding 'fail' "Skill Common Rationalizations must be a populated Rationalization/Rebuttal table: $($file.FullName)"))
            }
        }
        if (-not [string]::IsNullOrWhiteSpace($sectionTexts['Red Flags']) -and (Get-LineCountMatching -Text $sectionTexts['Red Flags'] -Pattern '^\s*-') -lt 3) {
            $findings.Add((New-Finding 'fail' "Skill Red Flags must contain at least 3 bullets: $($file.FullName)"))
        }
        if (-not [string]::IsNullOrWhiteSpace($sectionTexts['Verification']) -and (Get-LineCountMatching -Text $sectionTexts['Verification'] -Pattern '^\s*-') -lt 3) {
            $findings.Add((New-Finding 'fail' "Skill Verification must contain at least 3 checklist bullets: $($file.FullName)"))
        }

        $agentsDir = Join-Path $file.Directory.FullName 'agents'
        $metadataDir = Join-Path $file.Directory.FullName 'metadata'
        $agentsOpenAiYaml = Join-Path $agentsDir 'openai.yaml'
        $metadataOpenAiYaml = Join-Path $metadataDir 'openai.yaml'
        if (Test-Path -LiteralPath $metadataOpenAiYaml) {
            $findings.Add((New-Finding 'fail' "Skill UI metadata must live at agents/openai.yaml, not metadata/openai.yaml: $metadataOpenAiYaml"))
        } elseif (Test-Path -LiteralPath $agentsOpenAiYaml) {
            $findings.Add((New-Finding 'pass' "Skill UI metadata path looks valid: $agentsOpenAiYaml"))
        }

        $subagentsPath = Join-Path $file.Directory.FullName 'subagents'
        Ensure-ScaffoldDirectory -Path $subagentsPath -Label "Skill subagents root for $($file.Directory.Name)" -TrackWhenEmpty $true
    }

    $skillsReadmePath = Join-Path $skillsRoot 'README.md'
    if (Test-Path -LiteralPath $skillsReadmePath) {
        $skillsReadmeText = Get-Content -LiteralPath $skillsReadmePath -Raw
        $catalogNames = @(Get-SkillsReadmeCatalogNames -ReadmeText $skillsReadmeText | Sort-Object -Unique)
        $actualSkillNames = @($skillNames | Sort-Object)
        $missingCatalogNames = @($actualSkillNames | Where-Object { $catalogNames -notcontains $_ })
        $extraCatalogNames = @($catalogNames | Where-Object { $actualSkillNames -notcontains $_ })
        if ($catalogNames.Count -eq $actualSkillNames.Count -and $missingCatalogNames.Count -eq 0 -and $extraCatalogNames.Count -eq 0) {
            $findings.Add((New-Finding 'pass' "skills/README.md catalog matches runtime skills ($($actualSkillNames.Count) skills)."))
        } else {
            $findings.Add((New-Finding 'fail' "skills/README.md catalog must match $skillsRootRelative/*/SKILL.md. Expected $($actualSkillNames.Count), found $($catalogNames.Count). Missing: $($missingCatalogNames -join ', '). Extra: $($extraCatalogNames -join ', ')."))
        }
    } elseif ($skillNames.Count -gt 0) {
        $findings.Add((New-Finding 'fail' 'skills/README.md is required to catalog runtime skills.'))
    } else {
        $findings.Add((New-Finding 'pass' 'skills/README.md catalog check skipped because no runtime skills exist yet.'))
    }
} else {
    $findings.Add((New-Finding 'warning' 'skills is missing. This is acceptable only before skills are introduced.'))
}

$projectMarkdownFiles = @(Get-ChildItem -LiteralPath $resolvedRoot -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\.git\\' })
$projectMarkdownChecked = 0
foreach ($markdownFile in $projectMarkdownFiles) {
    $quality = Test-ProjectMarkdownQuality -ResolvedRoot $resolvedRoot -FullPath $markdownFile.FullName
    if ($null -eq $quality) {
        continue
    }

    $projectMarkdownChecked++
    if ($quality.HasBom) {
        $findings.Add((New-Finding 'fail' "Project markdown must not start with UTF-8 BOM: $($quality.RelativePath)"))
    }
    if ($quality.H1Count -eq 0) {
        $findings.Add((New-Finding 'warning' "Project markdown should include one H1 heading: $($quality.RelativePath)"))
    } elseif ($quality.H1Count -gt 1) {
        $findings.Add((New-Finding 'warning' "Project markdown should include only one H1 heading: $($quality.RelativePath)"))
    }
}
if ($projectMarkdownChecked -gt 0) {
    $findings.Add((New-Finding 'pass' "Project markdown quality checked for $projectMarkdownChecked files; protected paths and skill resources/subagents were excluded."))
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
                MetadataPath        = ".codex/agent-metadata/$($file.BaseName).toml"
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
        $metadataRelativePath = $registration.MetadataPath
        $metadataAbsolutePath = Join-Path $resolvedRoot $metadataRelativePath
        $summary = $registration.Summary
        $readOnly = [bool]$registration.ReadOnly
        $hooksProjectEnabled = [bool]$registration.HooksProjectEnabled

        if (Test-Path -LiteralPath $metadataAbsolutePath) {
            $metadataText = Get-Content -LiteralPath $metadataAbsolutePath -Raw
            $metadataName = Get-CodexTomlStringValue -TomlText $metadataText -Key 'name'
            if ([string]::IsNullOrWhiteSpace($metadataName)) {
                $findings.Add((New-Finding 'fail' "Agent metadata is missing name: $metadataRelativePath"))
                continue
            }
            if ($metadataName -ne $registration.Name) {
                $findings.Add((New-Finding 'fail' "Agent metadata name '$metadataName' must match agent entry '$($registration.Name)': $metadataRelativePath"))
                continue
            }

            $readOnly = Get-CodexTomlBoolValue -TomlText $metadataText -Key 'read_only' -Default $readOnly
            $hooksProjectEnabled = Get-CodexTomlBoolValue -TomlText $metadataText -Key 'hooks_project_enabled' -Default $hooksProjectEnabled
            $metadataSummary = Get-CodexTomlStringValue -TomlText $metadataText -Key 'summary'
            if (-not [string]::IsNullOrWhiteSpace($metadataSummary)) {
                $summary = $metadataSummary
            }
            $findings.Add((New-Finding 'pass' "Agent metadata exists: $metadataRelativePath"))
        } elseif ($Fix) {
            $metadataContent = Get-AgentMetadataBlock -AgentName $registration.Name -ReadOnly $readOnly -Summary $summary -HooksProjectEnabled $hooksProjectEnabled
            Set-Content -LiteralPath $metadataAbsolutePath -Value ($metadataContent.TrimEnd() + [Environment]::NewLine) -Encoding utf8
            $findings.Add((New-Finding 'pass' "Agent metadata scaffold created: $metadataRelativePath"))
        } else {
            $findings.Add((New-Finding 'warning' "Agent metadata missing: $metadataRelativePath. Run validator with -Fix to create it."))
        }

        $registrationPattern = "(?ms)^\[agent_registry\.$([regex]::Escape($registration.Name))\]\s*.*?path\s*=\s*`"$([regex]::Escape($registration.Path))`""
        if ($config -match $registrationPattern) {
            $findings.Add((New-Finding 'pass' "Agent registry entry exists: $($registration.Name)"))
        } elseif ($Fix) {
            $config = Sync-AgentRegistryEntry -ConfigText $config -AgentName $registration.Name -AgentPath $registration.Path -ReadOnly $readOnly -Summary $summary -HooksProjectEnabled $hooksProjectEnabled
            $findings.Add((New-Finding 'pass' "Agent registry entry synced: $($registration.Name)"))
        } else {
            $findings.Add((New-Finding 'warning' "Agent registry entry missing: $($registration.Name). Run validator with -Fix to sync .codex/config.toml."))
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
            $metadataPath = Join-Path $resolvedRoot $registration.MetadataPath
            if (-not (Test-Path -LiteralPath $metadataPath)) {
                $metadataContent = Get-AgentMetadataBlock -AgentName $registration.Name -ReadOnly ([bool]$registration.ReadOnly) -Summary $registration.Summary -HooksProjectEnabled ([bool]$registration.HooksProjectEnabled)
                Set-Content -LiteralPath $metadataPath -Value ($metadataContent.TrimEnd() + [Environment]::NewLine) -Encoding utf8
                $findings.Add((New-Finding 'pass' "Agent metadata scaffold created: $($registration.MetadataPath)"))
            }
            $config = Sync-AgentRegistryEntry -ConfigText $config -AgentName $registration.Name -AgentPath $registration.Path -ReadOnly $registration.ReadOnly -Summary $registration.Summary -HooksProjectEnabled $registration.HooksProjectEnabled
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



