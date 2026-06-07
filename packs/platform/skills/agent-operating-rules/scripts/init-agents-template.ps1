param(
    [string]$Root = ".",
    [ValidateSet("auto", "AGENTS.md", "CLAUDE.md")]
    [string]$Target = "auto",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Reads UTF-8 text consistently across Windows PowerShell and PowerShell Core.
function Read-Utf8Text {
    param([string]$Path)

    $encoding = [System.Text.UTF8Encoding]::new($false)
    return [System.IO.File]::ReadAllText($Path, $encoding)
}

# Writes UTF-8 without BOM so Linux-facing Markdown remains clean.
function Write-Utf8Text {
    param(
        [string]$Path,
        [string]$Content
    )

    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

# Reads the canonical AGENTS.md template embedded in the skill resource file.
function Get-ProjectStartTemplate {
    param([string]$TemplatePath)

    if (-not (Test-Path -LiteralPath $TemplatePath)) {
        throw "Template resource not found: $TemplatePath"
    }

    $raw = Read-Utf8Text -Path $TemplatePath
    $match = [regex]::Match($raw, "(?ms)^~~~~md\s*(.*?)^~~~~\s*$")
    if (-not $match.Success) {
        throw "Template resource does not contain a fenced ~~~~md template block."
    }

    return ($match.Groups[1].Value.TrimEnd() + [Environment]::NewLine)
}

# Selects the instruction file that init should create or update.
function Resolve-InstructionTarget {
    param(
        [string]$ResolvedRoot,
        [string]$RequestedTarget
    )

    $agentsPath = Join-Path $ResolvedRoot "AGENTS.md"
    $claudePath = Join-Path $ResolvedRoot "CLAUDE.md"
    $hasAgents = Test-Path -LiteralPath $agentsPath
    $hasClaude = Test-Path -LiteralPath $claudePath

    if ($RequestedTarget -ne "auto") {
        return (Join-Path $ResolvedRoot $RequestedTarget)
    }

    if ($hasAgents -and $hasClaude) {
        throw "Both AGENTS.md and CLAUDE.md exist. Re-run with -Target AGENTS.md or -Target CLAUDE.md so the merge target is explicit."
    }

    if ($hasAgents) {
        return $agentsPath
    }

    if ($hasClaude) {
        return $claudePath
    }

    return $agentsPath
}

# Extracts H2 sections so project-specific existing content can be appended without changing template-owned sections.
function Get-MarkdownH2Sections {
    param([string]$Content)

    $matches = [regex]::Matches($Content, "(?m)^##\s+(.+?)\s*$")
    $sections = @()

    for ($index = 0; $index -lt $matches.Count; $index++) {
        $start = $matches[$index].Index
        $end = if ($index + 1 -lt $matches.Count) { $matches[$index + 1].Index } else { $Content.Length }
        $sectionText = $Content.Substring($start, $end - $start).Trim()

        if ($sectionText.Length -gt 0) {
            $sections += [pscustomobject]@{
                Heading = $matches[$index].Groups[1].Value.Trim()
                Text    = $sectionText
            }
        }
    }

    return $sections
}

# Builds a template-first merge and keeps old project content in a clearly separated compatibility section.
function Merge-TemplateWithExistingInstructions {
    param(
        [string]$TemplateContent,
        [string]$ExistingContent
    )

    $templateSections = Get-MarkdownH2Sections -Content $TemplateContent
    $templateHeadings = @{}
    $preservedHeading = "Existing Project-Specific Instructions"
    foreach ($section in $templateSections) {
        $templateHeadings[$section.Heading.ToLowerInvariant()] = $true
    }

    $existingSections = Get-MarkdownH2Sections -Content $ExistingContent
    $compatibleSections = @()
    $templateOwnedSections = @()

    foreach ($section in $existingSections) {
        if ($section.Heading -eq $preservedHeading) {
            continue
        }

        if ($TemplateContent.Contains($section.Text)) {
            continue
        }

        if ($templateHeadings.ContainsKey($section.Heading.ToLowerInvariant())) {
            $templateOwnedSections += $section.Heading
            continue
        }

        $compatibleSections += $section.Text
    }

    if ($compatibleSections.Count -eq 0) {
        return [pscustomobject]@{
            Content              = $TemplateContent
            MergedSectionCount   = 0
            TemplateOwnedSkipped = $templateOwnedSections
        }
    }

    $builder = [System.Text.StringBuilder]::new()
    [void]$builder.Append($TemplateContent.TrimEnd())
    [void]$builder.AppendLine()
    [void]$builder.AppendLine()
    [void]$builder.AppendLine("---")
    [void]$builder.AppendLine()
    [void]$builder.AppendLine("## $preservedHeading")
    [void]$builder.AppendLine()
    [void]$builder.AppendLine("The following non-conflicting sections were preserved from the previous instruction file. Template-owned sections above remain authoritative.")
    [void]$builder.AppendLine()

    # Keep old compatible sections verbatim so project-specific commands and policies remain reviewable.
    foreach ($sectionText in $compatibleSections) {
        [void]$builder.AppendLine($sectionText.Trim())
        [void]$builder.AppendLine()
    }

    return [pscustomobject]@{
        Content              = ($builder.ToString().TrimEnd() + [Environment]::NewLine)
        MergedSectionCount   = $compatibleSections.Count
        TemplateOwnedSkipped = $templateOwnedSections
    }
}

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillRoot = Split-Path -Parent $scriptDir
$templatePath = Join-Path $skillRoot "resources/agents-project-start-template.md"

$template = Get-ProjectStartTemplate -TemplatePath $templatePath
$targetPath = Resolve-InstructionTarget -ResolvedRoot $resolvedRoot -RequestedTarget $Target
$targetExists = Test-Path -LiteralPath $targetPath

if ($targetExists) {
    $existing = Read-Utf8Text -Path $targetPath
    $mergeResult = Merge-TemplateWithExistingInstructions -TemplateContent $template -ExistingContent $existing
    $nextContent = $mergeResult.Content
    $action = if ($existing -eq $nextContent) { "no-change" } else { "update" }
}
else {
    $mergeResult = [pscustomobject]@{
        MergedSectionCount   = 0
        TemplateOwnedSkipped = @()
    }
    $nextContent = $template
    $action = "create"
}

if (-not $DryRun -and $action -ne "no-change") {
    Write-Utf8Text -Path $targetPath -Content $nextContent
}

$result = [pscustomobject]@{
    Root                 = $resolvedRoot
    Target               = $targetPath
    ExistingFile         = $targetExists
    Action               = if ($DryRun) { "dry-run:$action" } else { $action }
    MergedSectionCount   = $mergeResult.MergedSectionCount
    TemplateOwnedSkipped = $mergeResult.TemplateOwnedSkipped
}

$result | ConvertTo-Json -Depth 4
