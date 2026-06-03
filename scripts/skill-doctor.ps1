param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$OutputPath = '',
    [switch]$Json,
    [switch]$NoReportFile,
    [int]$MinimumScore = 0
)

$ErrorActionPreference = 'Stop'

function Get-MarkdownH2Headings {
    param([string]$Text)

    return @(
        [regex]::Matches($Text, '(?m)^##\s+(.+?)\s*$') |
            ForEach-Object { $_.Groups[1].Value.Trim() }
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

function Get-SkillFrontmatter {
    param([string]$Text)

    $match = [regex]::Match($Text, '(?ms)^---\s*\r?\n(.*?)\r?\n---')
    if (-not $match.Success) {
        return $null
    }

    return $match.Groups[1].Value
}

function Get-FrontmatterValue {
    param([string]$FrontmatterText, [string]$Key)

    if ([string]::IsNullOrWhiteSpace($FrontmatterText)) {
        return $null
    }

    $match = [regex]::Match($FrontmatterText, "(?m)^\s*$([regex]::Escape($Key))\s*:\s*(.+?)\s*$")
    if (-not $match.Success) {
        return $null
    }

    return $match.Groups[1].Value.Trim().Trim('"')
}

function Get-RelativeRepoPath {
    param([string]$ResolvedRoot, [string]$FullPath)

    return ($FullPath.Substring($ResolvedRoot.Length).TrimStart('\', '/') -replace '\\', '/')
}

function Get-TemplateHeadings {
    param([string]$ResolvedRoot)

    $fallback = @(
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

    $templatePath = Join-Path $ResolvedRoot 'skills/SKILL_TEMPLATE.md'
    if (-not (Test-Path -LiteralPath $templatePath)) {
        return $fallback
    }

    $templateText = Get-Content -LiteralPath $templatePath -Raw
    $headings = Get-MarkdownH2Headings -Text $templateText
    if ($headings.Count -eq 0) {
        return $fallback
    }

    return $headings
}

function Test-NameFormat {
    param([string]$Name)

    return (
        -not [string]::IsNullOrWhiteSpace($Name) -and
        $Name.Length -le 64 -and
        $Name -match '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
}

function Get-ReferencedRelativePaths {
    param([string]$SkillText)

    $paths = New-Object System.Collections.Generic.List[string]
    foreach ($match in [regex]::Matches($SkillText, '\[[^\]]+\]\(([^)]+)\)|`((?:resources|subagents|scripts)/[^`]+)`')) {
        $candidate = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
        if ($candidate -match '^(resources|subagents|scripts)/') {
            $paths.Add($candidate)
        }
    }

    return @($paths | Select-Object -Unique)
}

function Test-ReferencedPathsExist {
    param([string]$SkillDir, [string[]]$ReferencedPaths)

    $missing = New-Object System.Collections.Generic.List[string]
    foreach ($relativePath in $ReferencedPaths) {
        if ($relativePath -match '[\*\?\(\)\|]') {
            continue
        }
        if ([string]::IsNullOrWhiteSpace([System.IO.Path]::GetExtension($relativePath))) {
            continue
        }

        $targetPath = Join-Path $SkillDir ($relativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $targetPath)) {
            $missing.Add($relativePath)
        }
    }

    return @($missing)
}

function New-QualityCheck {
    param(
        [string]$Name,
        [string]$Category,
        [double]$Weight,
        [bool]$Pass,
        [string]$Evidence,
        [string]$Impact,
        [string]$Suggestion
    )

    return [pscustomobject]@{
        Name       = $Name
        Category   = $Category
        Weight     = $Weight
        Pass       = $Pass
        Evidence   = $Evidence
        Impact     = $Impact
        Suggestion = $Suggestion
    }
}

function Get-SkillQuality {
    param(
        [string]$ResolvedRoot,
        [System.IO.DirectoryInfo]$SkillDirectory,
        [string[]]$TemplateHeadings,
        [string]$ManifestText,
        [string]$ConfigText,
        [string]$TestMapText
    )

    $skillName = $SkillDirectory.Name
    $skillPath = Join-Path $SkillDirectory.FullName 'SKILL.md'
    $skillText = if (Test-Path -LiteralPath $skillPath) { Get-Content -LiteralPath $skillPath -Raw } else { '' }
    $frontmatter = Get-SkillFrontmatter -Text $skillText
    $frontmatterName = Get-FrontmatterValue -FrontmatterText $frontmatter -Key 'name'
    $description = Get-FrontmatterValue -FrontmatterText $frontmatter -Key 'description'
    $headings = Get-MarkdownH2Headings -Text $skillText
    $referencedPaths = Get-ReferencedRelativePaths -SkillText $skillText
    $missingReferencedPaths = Test-ReferencedPathsExist -SkillDir $SkillDirectory.FullName -ReferencedPaths $referencedPaths
    $missingSections = @($TemplateHeadings | Where-Object { [string]::IsNullOrWhiteSpace((Get-MarkdownSectionText -Text $skillText -Heading $_)) })
    $workflowMissingSections = @('When to Use', 'Core Process', 'Verification' | Where-Object { [string]::IsNullOrWhiteSpace((Get-MarkdownSectionText -Text $skillText -Heading $_)) })
    $descriptionLength = if ($null -eq $description) { 0 } else { $description.Length }
    $manifestHasName = $ManifestText.Contains("name = `"$skillName`"")
    $manifestHasPath = $ManifestText.Contains("skill_path = `"skills/$skillName/SKILL.md`"")
    $resourceDir = Join-Path $SkillDirectory.FullName 'resources'
    $subagentDir = Join-Path $SkillDirectory.FullName 'subagents'
    $scriptDir = Join-Path $SkillDirectory.FullName 'scripts'
    $resourceFiles = @()
    if (Test-Path -LiteralPath $resourceDir) {
        $resourceFiles = @(Get-ChildItem -LiteralPath $resourceDir -Recurse -File | Where-Object { $_.Name -ne '.gitkeep' })
    }
    $subagentFiles = @()
    if (Test-Path -LiteralPath $subagentDir) {
        $subagentFiles = @(Get-ChildItem -LiteralPath $subagentDir -Recurse -File | Where-Object { $_.Name -ne '.gitkeep' })
    }
    $testScripts = @()
    if (Test-Path -LiteralPath $scriptDir) {
        $testScripts = @(Get-ChildItem -LiteralPath $scriptDir -Recurse -File -Filter '*test*.ps1')
    }

    $checks = @(
        New-QualityCheck `
            -Name 'frontmatter' `
            -Category 'discoverability' `
            -Weight 1.0 `
            -Pass ((Test-Path -LiteralPath $skillPath) -and -not [string]::IsNullOrWhiteSpace($frontmatterName) -and -not [string]::IsNullOrWhiteSpace($description)) `
            -Evidence "name='$frontmatterName'; descriptionLength=$descriptionLength" `
            -Impact 'Agents and installers may fail to discover or describe the skill reliably.' `
            -Suggestion 'Add YAML frontmatter with name and description.'

        New-QualityCheck `
            -Name 'name-contract' `
            -Category 'discoverability' `
            -Weight 1.0 `
            -Pass ((Test-NameFormat -Name $frontmatterName) -and $frontmatterName -eq $skillName) `
            -Evidence "directory='$skillName'; frontmatterName='$frontmatterName'" `
            -Impact 'Skill identity can drift between folder, manifest, installer, and runtime references.' `
            -Suggestion 'Make frontmatter name lowercase-hyphen and match the skill directory.'

        New-QualityCheck `
            -Name 'template-order' `
            -Category 'template-compliance' `
            -Weight 1.0 `
            -Pass (($headings -join '|') -eq ($TemplateHeadings -join '|')) `
            -Evidence "actualH2=$($headings.Count); expectedH2=$($TemplateHeadings.Count)" `
            -Impact 'Readers and validators lose predictable navigation across skills.' `
            -Suggestion 'Align top-level H2 headings with skills/SKILL_TEMPLATE.md.'

        New-QualityCheck `
            -Name 'required-sections' `
            -Category 'template-compliance' `
            -Weight 1.5 `
            -Pass ($missingSections.Count -eq 0) `
            -Evidence $(if ($missingSections.Count -eq 0) { 'all template sections have content' } else { 'empty sections: ' + ($missingSections -join ', ') }) `
            -Impact 'A skill can appear compliant while missing the instruction content agents need.' `
            -Suggestion 'Fill all required template sections with non-empty content.'

        New-QualityCheck `
            -Name 'workflow-sections' `
            -Category 'runtime-usability' `
            -Weight 1.5 `
            -Pass ($workflowMissingSections.Count -eq 0) `
            -Evidence $(if ($workflowMissingSections.Count -eq 0) { 'trigger, process, and verification sections are present' } else { 'empty workflow sections: ' + ($workflowMissingSections -join ', ') }) `
            -Impact 'Agents may invoke the skill without knowing when, how, or how to verify completion.' `
            -Suggestion 'Fill core workflow sections: When to Use, Core Process, and Verification.'

        New-QualityCheck `
            -Name 'progressive-disclosure-links' `
            -Category 'runtime-usability' `
            -Weight 1.0 `
            -Pass ($missingReferencedPaths.Count -eq 0) `
            -Evidence $(if ($missingReferencedPaths.Count -eq 0) { "referencedPaths=$($referencedPaths.Count); missing=0" } else { 'missing linked files: ' + ($missingReferencedPaths -join ', ') }) `
            -Impact 'Agents may follow a referenced resource, script, or prompt and hit a dead path.' `
            -Suggestion ('Fix missing linked skill-owned files: ' + (($missingReferencedPaths -join ', ')))

        New-QualityCheck `
            -Name 'resource-map' `
            -Category 'progressive-disclosure' `
            -Weight 0.8 `
            -Pass (($resourceFiles.Count -eq 0) -or (Get-MarkdownSectionText -Text $skillText -Heading 'Resource Map').Contains('resources/')) `
            -Evidence $(if ($resourceFiles.Count -gt 0) { "resourceFiles=$($resourceFiles.Count); Resource Map should point to resources/" } else { 'no resource files' }) `
            -Impact 'Supplementary files exist but are not discoverable from the skill entry point.' `
            -Suggestion 'List owned resources in the Resource Map section.'

        New-QualityCheck `
            -Name 'subagent-map' `
            -Category 'progressive-disclosure' `
            -Weight 0.8 `
            -Pass (($subagentFiles.Count -eq 0) -or (Get-MarkdownSectionText -Text $skillText -Heading 'Subagent Prompts').Contains('subagents/')) `
            -Evidence $(if ($subagentFiles.Count -gt 0) { "subagentFiles=$($subagentFiles.Count); Subagent Prompts should point to subagents/" } else { 'no subagent prompt files' }) `
            -Impact 'Delegation prompts exist but are not exposed to agents using progressive disclosure.' `
            -Suggestion 'List owned subagent prompts in the Subagent Prompts section.'

        New-QualityCheck `
            -Name 'manifest-entry' `
            -Category 'distribution' `
            -Weight 1.0 `
            -Pass ($manifestHasName -and $manifestHasPath) `
            -Evidence "manifest has name entry=$manifestHasName; path entry=$manifestHasPath" `
            -Impact 'Catalog or installer flows may omit the skill even when the folder exists.' `
            -Suggestion 'Add or fix the skill entry in skills/manifest.toml.'

        New-QualityCheck `
            -Name 'test-map' `
            -Category 'verification' `
            -Weight 0.8 `
            -Pass (($testScripts.Count -eq 0) -or @($testScripts | Where-Object { -not $TestMapText.Contains((Get-RelativeRepoPath -ResolvedRoot $ResolvedRoot -FullPath $_.FullName)) }).Count -eq 0) `
            -Evidence "skillTestScripts=$($testScripts.Count)" `
            -Impact 'Changed skill tests may not run through selected verification.' `
            -Suggestion 'Map each skill-owned *test*.ps1 in .codex/test-map.toml.'

        New-QualityCheck `
            -Name 'output-template-boundary' `
            -Category 'runtime-usability' `
            -Weight 0.6 `
            -Pass ((-not $skillText.Contains('output-template-vi.md')) -or (Test-Path -LiteralPath (Join-Path $SkillDirectory.FullName 'resources/output-template-vi.md'))) `
            -Evidence $(if ($skillText.Contains('output-template-vi.md')) { 'SKILL.md references output-template-vi.md' } else { 'no Vietnamese output template reference' }) `
            -Impact 'Vietnamese response templates can be referenced without a concrete reusable file.' `
            -Suggestion 'Create resources/output-template-vi.md when SKILL.md references it.'
    )

    $totalWeight = ($checks | Measure-Object -Property Weight -Sum).Sum
    $passedWeight = (@($checks | Where-Object { $_.Pass }) | Measure-Object -Property Weight -Sum).Sum
    $score = [math]::Round((($passedWeight / [double]$totalWeight) * 10), 1)
    $missing = @($checks | Where-Object { -not $_.Pass } | ForEach-Object { $_.Name })
    $suggestions = @($checks | Where-Object { -not $_.Pass } | ForEach-Object { $_.Suggestion } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $registeredAgent = $ConfigText.Contains("[agent_registry.$skillName]")

    return [pscustomobject]@{
        Skill            = $skillName
        Score            = $score
        Grade            = if ($score -ge 9) { 'strong' } elseif ($score -ge 7) { 'ok' } elseif ($score -ge 5) { 'weak' } else { 'at-risk' }
        Missing          = $missing
        Suggestions      = $suggestions
        Checks           = $checks
        PassedWeight     = [math]::Round($passedWeight, 1)
        TotalWeight      = [math]::Round($totalWeight, 1)
        HasResources     = $resourceFiles.Count -gt 0
        HasSubagents     = $subagentFiles.Count -gt 0
        HasScripts       = Test-Path -LiteralPath $scriptDir
        TestScriptCount  = $testScripts.Count
        RegisteredAgent  = $registeredAgent
    }
}

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$skillsRoot = Join-Path $resolvedRoot 'skills'
if (-not (Test-Path -LiteralPath $skillsRoot)) {
    throw "Missing skills root: $skillsRoot"
}

$manifestPath = Join-Path $resolvedRoot 'skills/manifest.toml'
$configPath = Join-Path $resolvedRoot '.codex/config.toml'
$testMapPath = Join-Path $resolvedRoot '.codex/test-map.toml'

$manifestText = if (Test-Path -LiteralPath $manifestPath) { Get-Content -LiteralPath $manifestPath -Raw } else { '' }
$configText = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw } else { '' }
$testMapText = if (Test-Path -LiteralPath $testMapPath) { Get-Content -LiteralPath $testMapPath -Raw } else { '' }
$templateHeadings = Get-TemplateHeadings -ResolvedRoot $resolvedRoot

$results = @(
    Get-ChildItem -LiteralPath $skillsRoot -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } |
        Sort-Object Name |
        ForEach-Object {
            Get-SkillQuality `
                -ResolvedRoot $resolvedRoot `
                -SkillDirectory $_ `
                -TemplateHeadings $templateHeadings `
                -ManifestText $manifestText `
                -ConfigText $configText `
                -TestMapText $testMapText
        }
)

if ($Json) {
    $outputText = $results | ConvertTo-Json -Depth 8
} else {
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('# Skill Doctor')
    $lines.Add('')
    $lines.Add('## Scoring Basis')
    $lines.Add('')
    $lines.Add('Score is weighted from 0 to 10. The doctor checks whether each skill is discoverable, follows the shared template, exposes progressive-disclosure assets, is distributable through the manifest, and has selected-test coverage when it owns tests.')
    $lines.Add('')
    $lines.Add('| Check | Category | Weight | What It Proves |')
    $lines.Add('|---|---|---:|---|')
    $rubric = @(
        [pscustomobject]@{ Check = 'frontmatter'; Category = 'discoverability'; Weight = 1.0; Proves = 'Skill has name and description metadata.' },
        [pscustomobject]@{ Check = 'name-contract'; Category = 'discoverability'; Weight = 1.0; Proves = 'Directory name, skill name, and runtime identity match.' },
        [pscustomobject]@{ Check = 'template-order'; Category = 'template-compliance'; Weight = 1.0; Proves = 'H2 sections follow skills/SKILL_TEMPLATE.md.' },
        [pscustomobject]@{ Check = 'required-sections'; Category = 'template-compliance'; Weight = 1.5; Proves = 'All required template sections contain content.' },
        [pscustomobject]@{ Check = 'workflow-sections'; Category = 'runtime-usability'; Weight = 1.5; Proves = 'Trigger, process, and verification sections are usable.' },
        [pscustomobject]@{ Check = 'progressive-disclosure-links'; Category = 'runtime-usability'; Weight = 1.0; Proves = 'Referenced resources, scripts, and prompts resolve.' },
        [pscustomobject]@{ Check = 'resource-map'; Category = 'progressive-disclosure'; Weight = 0.8; Proves = 'Owned resources are discoverable from SKILL.md.' },
        [pscustomobject]@{ Check = 'subagent-map'; Category = 'progressive-disclosure'; Weight = 0.8; Proves = 'Owned subagent prompts are discoverable from SKILL.md.' },
        [pscustomobject]@{ Check = 'manifest-entry'; Category = 'distribution'; Weight = 1.0; Proves = 'Skill is present in skills/manifest.toml.' },
        [pscustomobject]@{ Check = 'test-map'; Category = 'verification'; Weight = 0.8; Proves = 'Owned test scripts are selected by .codex/test-map.toml.' },
        [pscustomobject]@{ Check = 'output-template-boundary'; Category = 'runtime-usability'; Weight = 0.6; Proves = 'Vietnamese output template references have a concrete resource file.' }
    )
    foreach ($row in $rubric) {
        $lines.Add("| $($row.Check) | $($row.Category) | $($row.Weight) | $($row.Proves) |")
    }
    $lines.Add('')
    $lines.Add('## Summary')
    $lines.Add('')
    $lines.Add('| Skill | Score | Grade | Missing |')
    $lines.Add('|---|---:|---|---|')
    foreach ($item in $results) {
        $missingText = if ($item.Missing.Count -eq 0) { '-' } else { $item.Missing -join ', ' }
        $lines.Add("| $($item.Skill) | $($item.Score) | $($item.Grade) | $missingText |")
    }
    $lines.Add('')
    $lines.Add('## Upgrade Plan')
    $lines.Add('')
    $upgradeItems = @($results | Where-Object { $_.Missing.Count -gt 0 } | Sort-Object Score, Skill)
    if ($upgradeItems.Count -eq 0) {
        $lines.Add('All skills are strong. No upgrade actions required.')
    } else {
        foreach ($item in $upgradeItems) {
            $lines.Add("### $($item.Skill) ($($item.Score)/10, $($item.Grade))")
            foreach ($check in @($item.Checks | Where-Object { -not $_.Pass } | Sort-Object Category, Name)) {
                $lines.Add("- Missing: $($check.Name) [$($check.Category), weight $($check.Weight)]")
                $lines.Add("  Evidence: $($check.Evidence)")
                $lines.Add("  Impact: $($check.Impact)")
                $lines.Add("  Upgrade: $($check.Suggestion)")
            }
            $lines.Add('')
        }
    }

    $outputText = $lines -join [Environment]::NewLine
}

if ([string]::IsNullOrWhiteSpace($OutputPath) -and -not $Json -and -not $NoReportFile) {
    $timestamp = Get-Date -Format 'HHmmss_ddMMyyyy'
    $OutputPath = "reports/skills/${timestamp}_skill-doctor.md"
}

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
    $resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
        $OutputPath
    } else {
        Join-Path $resolvedRoot $OutputPath
    }

    $outputDir = Split-Path -Parent $resolvedOutputPath
    if (-not [string]::IsNullOrWhiteSpace($outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($resolvedOutputPath, $outputText, [System.Text.UTF8Encoding]::new($false))
    Write-Output "Skill doctor report written: $resolvedOutputPath"
} else {
    Write-Output $outputText
}

if ($MinimumScore -gt 0) {
    $failed = @($results | Where-Object { $_.Score -lt $MinimumScore })
    if ($failed.Count -gt 0) {
        $names = $failed | ForEach-Object { "$($_.Skill)=$($_.Score)" }
        throw "Skill doctor minimum score failed: $($names -join ', ')"
    }
}
