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
    Assert-True ($plainOutput.Contains('Found 15 skills')) 'skills CLI should discover all repository skills.'

    $requiredSkills = @(
        'agent-operating-rules',
        'diagram-generate',
        'doc-write',
        'git-workflow-design',
        'security-code-review'
    )

    foreach ($skill in $requiredSkills) {
        Assert-True ($plainOutput.Contains($skill)) "skills CLI should list $skill."
    }

    $manifestPath = Join-Path $Root '.agents/skills/manifest.toml'
    $manifestText = Get-Content -LiteralPath $manifestPath -Raw

    Assert-True ($manifestText.Contains('allowed_default_skills')) 'Manifest should define the default install allowlist.'
    Assert-True (-not $manifestText.Contains('install_all_command')) 'Manifest should not define an install-all command for the default flow.'
    Assert-True (-not $manifestText.Contains('install_default_command')) 'Manifest should not define a bulk default install command.'
    Assert-True ($manifestText.Contains('help_command = "npx skills --help"')) 'Manifest should document the safe skills help command.'
    Assert-True ($manifestText.Contains('alias_commands')) 'Manifest should document skills CLI aliases.'
    foreach ($skill in $requiredSkills) {
        Assert-True ($manifestText.Contains("`"$skill`"")) "Manifest allowlist should include $skill."
    }

    $readmePath = Join-Path $Root 'README.md'
    $readmeText = Get-Content -LiteralPath $readmePath -Raw
    Assert-True ($readmeText.Contains('npx skills --help')) 'README should document the safe help command.'
    Assert-True ($readmeText.Contains('npx skills -h')) 'README should document the short help alias.'
    Assert-True ($readmeText.Contains('npx skills a ')) 'README should document the add alias.'
    Assert-True ($readmeText.Contains('npx skills ls')) 'README should document the list alias.'
    Assert-True (-not $readmeText.Contains('npx skills add --help')) 'README should not document unsafe add --help usage.'
    Assert-True (-not $readmeText.Contains('npx skills add . --help')) 'README should not document unsafe local add help usage.'

    Invoke-WithTempHome -Root $Root -Script {
        param([string]$SourceRoot, [string]$TempHome)

        $allowedSkills = @(
            'agent-operating-rules',
            'diagram-generate',
            'doc-write',
            'git-workflow-design',
            'security-code-review'
        )

        $installOutput = & npx skills add $SourceRoot --skill @allowedSkills --agent codex claude-code cursor -y --copy 2>&1
        $installExitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
        Assert-True ($installExitCode -eq 0) 'skills CLI should install allowed skills for Codex, Claude Code, and Cursor.'

        $plainInstallOutput = Remove-AnsiEscape -Text (@($installOutput) -join "`n")
        Assert-True ($plainInstallOutput.Contains('Selected 5 skills')) 'Install output should select the allowlisted skills.'
        Assert-True ($plainInstallOutput.Contains('Codex')) 'Install output should include Codex target.'
        Assert-True ($plainInstallOutput.Contains('Claude Code')) 'Install output should include Claude Code target.'
        Assert-True ($plainInstallOutput.Contains('Cursor')) 'Install output should include Cursor target.'
        Assert-True ($plainInstallOutput.Contains('Installed 5 skills')) 'Install output should not install extra skills.'

        foreach ($skill in $allowedSkills) {
            $agentsSkill = Join-Path $TempHome ".agents/skills/$skill/SKILL.md"
            $claudeSkill = Join-Path $TempHome ".claude/skills/$skill/SKILL.md"
            Assert-True (Test-Path -LiteralPath $agentsSkill) "Codex/Cursor shared .agents path should contain $skill."
            Assert-True (Test-Path -LiteralPath $claudeSkill) "Claude Code path should contain $skill."

            $agentsSkillText = Get-Content -LiteralPath $agentsSkill -Raw
            $claudeSkillText = Get-Content -LiteralPath $claudeSkill -Raw
            Assert-True ($agentsSkillText.Contains("name: $skill")) "Installed Codex/Cursor $skill should preserve metadata."
            Assert-True ($claudeSkillText.Contains("name: $skill")) "Installed Claude Code $skill should preserve metadata."
        }
    }

    Write-Output 'skills CLI compatibility tests passed.'
} finally {
    Pop-Location
}
