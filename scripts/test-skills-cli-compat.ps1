param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)

    if (-not $Condition) {
        throw $Message
    }
}

function Remove-AnsiEscape {
    param([string]$Text)

    $escape = [regex]::Escape([string][char]27)
    return [regex]::Replace($Text, "$escape\[[0-9;?]*[ -/]*[@-~]", '')
}

. (Join-Path $Root 'scripts/lib/codex-config.ps1')

function Get-ManifestPath {
    param([string]$Root)

    $defaultManifestPath = Join-Path $Root 'skills/manifest.toml'
    Assert-True (Test-Path -LiteralPath $defaultManifestPath) "Manifest should exist: $defaultManifestPath"
    return $defaultManifestPath
}

function Get-SkillsRoot {
    param([string]$Root, [string]$ManifestText)

    $configuredSkillsRoot = Get-CodexTomlStringValue -TomlText $ManifestText -Section 'repo_structure' -Key 'skills_root'
    if ([string]::IsNullOrWhiteSpace($configuredSkillsRoot)) {
        $configuredSkillsRoot = 'skills'
    }

    return (Join-Path $Root $configuredSkillsRoot)
}

function Invoke-WithTempHome {
    param(
        [string]$Root,
        [scriptblock]$Script
    )

    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("skills-cli-compat-" + [guid]::NewGuid().ToString())
    $oldHome = $env:HOME
    $oldUserProfile = $env:USERPROFILE

    try {
        New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
        $env:HOME = $tempRoot
        $env:USERPROFILE = $tempRoot

        Push-Location $tempRoot
        & $Script $Root $tempRoot
        Pop-Location
    } finally {
        $env:HOME = $oldHome
        $env:USERPROFILE = $oldUserProfile

        if ((Get-Location).Path -eq $tempRoot) {
            Pop-Location
        }

        if (Test-Path -LiteralPath $tempRoot) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force
        }
    }
}

Push-Location $Root
try {
    $output = & npx skills add . --list 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
    Assert-True ($exitCode -eq 0) 'npx skills add . --list should complete successfully.'

    $plainOutput = Remove-AnsiEscape -Text (@($output) -join "`n")

    $manifestPath = Get-ManifestPath -Root $Root
    $manifestText = Get-Content -LiteralPath $manifestPath -Raw
    $skillsRoot = Get-SkillsRoot -Root $Root -ManifestText $manifestText
    $expectedSkillCount = @(Get-ChildItem -LiteralPath $skillsRoot -Directory | Where-Object {
        Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md')
    }).Count
    Assert-True ($plainOutput.Contains("Found $expectedSkillCount skills")) 'skills CLI should discover all repository skills.'

    $requiredSkills = Get-CodexTomlArrayValue -TomlText $manifestText -Section 'skills_cli' -Key 'allowed_default_skills'
    Assert-True ($requiredSkills.Count -gt 0) 'Manifest should define at least one allowed default skill.'
    $repoSlug = Get-CodexTomlStringValue -TomlText $manifestText -Section 'repository' -Key 'github'
    Assert-True (-not [string]::IsNullOrWhiteSpace($repoSlug)) 'Manifest should define repository.github.'
    $codexTargetRoot = Get-CodexTomlStringValue -TomlText $manifestText -Section 'skills_cli.target_paths' -Key 'codex'
    $claudeTargetRoot = Get-CodexTomlStringValue -TomlText $manifestText -Section 'skills_cli.target_paths' -Key 'claude_code'
    Assert-True (-not [string]::IsNullOrWhiteSpace($codexTargetRoot)) 'Manifest should define Codex target path.'
    Assert-True (-not [string]::IsNullOrWhiteSpace($claudeTargetRoot)) 'Manifest should define Claude Code target path.'

    foreach ($skill in $requiredSkills) {
        Assert-True ($plainOutput.Contains($skill)) "skills CLI should list $skill."
    }

    Assert-True ($manifestText.Contains('allowed_default_skills')) 'Manifest should define the default install allowlist.'
    Assert-True (-not $manifestText.Contains('install_all_command')) 'Manifest should not define an install-all command for the default flow.'
    Assert-True (-not $manifestText.Contains('install_default_command')) 'Manifest should not define a bulk default install command.'
    Assert-True ($manifestText.Contains('help_command = "npx skills --help"')) 'Manifest should document the safe skills help command.'
    Assert-True ($manifestText.Contains('alias_commands')) 'Manifest should document skills CLI aliases.'
    Assert-True ($manifestText.Contains('install_claude_code_global_command')) 'Manifest should document Claude Code global install command.'
    foreach ($skill in $requiredSkills) {
        Assert-True ($manifestText.Contains("`"$skill`"")) "Manifest allowlist should include $skill."
    }

    $readmePath = Join-Path $Root 'README.md'
    $readmeText = Get-Content -LiteralPath $readmePath -Raw
    Assert-True ($readmeText.Contains('npx skills --help')) 'README should document the safe help command.'
    Assert-True ($readmeText.Contains('npx skills -h')) 'README should document the short help alias.'
    Assert-True ($readmeText.Contains('npx skills a ')) 'README should document the add alias.'
    Assert-True ($readmeText.Contains('npx skills ls')) 'README should document the list alias.'
    Assert-True ($readmeText.Contains("`$repo = `"$repoSlug`"")) 'README should use the repository slug from manifest.'
    Assert-True (-not $readmeText.Contains('$repo:')) 'README should not use invalid PowerShell repo syntax.'
    Assert-True ($readmeText.Contains('--agent claude-code -g -y --copy')) 'README should document Claude Code global install flags.'
    Assert-True ($readmeText.Contains('~\.claude\skills\security-code-review\SKILL.md')) 'README should document the expected Claude Code skill path.'
    Assert-True (-not $readmeText.Contains('npx skills add --help')) 'README should not document unsafe add --help usage.'
    Assert-True (-not $readmeText.Contains('npx skills add . --help')) 'README should not document unsafe local add help usage.'

    Invoke-WithTempHome -Root $Root -Script {
        param([string]$SourceRoot, [string]$TempHome)

        $manifestText = Get-Content -LiteralPath (Get-ManifestPath -Root $SourceRoot) -Raw
        $allowedSkills = Get-CodexTomlArrayValue -TomlText $manifestText -Section 'skills_cli' -Key 'allowed_default_skills'
        $codexTargetRoot = Get-CodexTomlStringValue -TomlText $manifestText -Section 'skills_cli.target_paths' -Key 'codex'
        $claudeTargetRoot = Get-CodexTomlStringValue -TomlText $manifestText -Section 'skills_cli.target_paths' -Key 'claude_code'

        $installOutput = & npx skills add $SourceRoot --skill @allowedSkills --agent codex claude-code cursor -y --copy 2>&1
        $installExitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
        Assert-True ($installExitCode -eq 0) 'skills CLI should install allowed skills for Codex, Claude Code, and Cursor.'

        $plainInstallOutput = Remove-AnsiEscape -Text (@($installOutput) -join "`n")
        Assert-True ($plainInstallOutput.Contains("Selected $($allowedSkills.Count) skills")) 'Install output should select the allowlisted skills.'
        Assert-True ($plainInstallOutput.Contains('Codex')) 'Install output should include Codex target.'
        Assert-True ($plainInstallOutput.Contains('Claude Code')) 'Install output should include Claude Code target.'
        Assert-True ($plainInstallOutput.Contains('Cursor')) 'Install output should include Cursor target.'
        Assert-True ($plainInstallOutput.Contains("Installed $($allowedSkills.Count) skills")) 'Install output should not install extra skills.'

        foreach ($skill in $allowedSkills) {
            $agentsSkill = Join-Path $TempHome "$codexTargetRoot/$skill/SKILL.md"
            $claudeSkill = Join-Path $TempHome "$claudeTargetRoot/$skill/SKILL.md"
            Assert-True (Test-Path -LiteralPath $agentsSkill) "Codex/Cursor shared .agents path should contain $skill."
            Assert-True (Test-Path -LiteralPath $claudeSkill) "Claude Code path should contain $skill."

            $agentsSkillText = Get-Content -LiteralPath $agentsSkill -Raw
            $claudeSkillText = Get-Content -LiteralPath $claudeSkill -Raw
            Assert-True ($agentsSkillText.Contains("name: $skill")) "Installed Codex/Cursor $skill should preserve metadata."
            Assert-True ($claudeSkillText.Contains("name: $skill")) "Installed Claude Code $skill should preserve metadata."
        }
    }

    Invoke-WithTempHome -Root $Root -Script {
        param([string]$SourceRoot, [string]$TempHome)

        $manifestText = Get-Content -LiteralPath (Get-ManifestPath -Root $SourceRoot) -Raw
        $allowedSkills = Get-CodexTomlArrayValue -TomlText $manifestText -Section 'skills_cli' -Key 'allowed_default_skills'
        $singleSkill = $allowedSkills | Where-Object { $_ -eq 'security-code-review' } | Select-Object -First 1
        Assert-True (-not [string]::IsNullOrWhiteSpace($singleSkill)) 'Manifest allowlist should include security-code-review for single-skill install test.'
        $codexTargetRoot = Get-CodexTomlStringValue -TomlText $manifestText -Section 'skills_cli.target_paths' -Key 'codex'
        $claudeTargetRoot = Get-CodexTomlStringValue -TomlText $manifestText -Section 'skills_cli.target_paths' -Key 'claude_code'

        $installOutput = & npx skills add $SourceRoot --skill $singleSkill --agent claude-code -g -y --copy 2>&1
        $installExitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
        Assert-True ($installExitCode -eq 0) 'skills CLI should install one skill globally for Claude Code.'

        $plainInstallOutput = Remove-AnsiEscape -Text (@($installOutput) -join "`n")
        Assert-True ($plainInstallOutput.Contains("Selected 1 skill: $singleSkill")) 'Claude Code install should select exactly one requested skill.'
        Assert-True ($plainInstallOutput.Contains('Claude Code')) 'Claude Code install output should include Claude Code target.'
        Assert-True ($plainInstallOutput.Contains('Installed 1 skill')) 'Claude Code install should not install extra skills.'

        $claudeSkill = Join-Path $TempHome "$claudeTargetRoot/$singleSkill/SKILL.md"
        $agentsSkill = Join-Path $TempHome "$codexTargetRoot/$singleSkill/SKILL.md"
        Assert-True (Test-Path -LiteralPath $claudeSkill) 'Claude Code global install should create ~/.claude/skills/<skill>/SKILL.md.'
        Assert-True (-not (Test-Path -LiteralPath $agentsSkill)) 'Claude Code-only global install should not rely on ~/.agents/skills.'

        $claudeSkillText = Get-Content -LiteralPath $claudeSkill -Raw
        Assert-True ($claudeSkillText.Contains("name: $singleSkill")) 'Claude Code global SKILL.md should preserve metadata.'
    }

    Write-Output 'skills CLI compatibility tests passed.'
} finally {
    Pop-Location
}
