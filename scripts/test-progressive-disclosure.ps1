param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-FileContains {
    param([string]$Path, [string]$Pattern, [string]$Message)

    Assert-True (Test-Path -LiteralPath $Path) "Missing file: $Path"
    $content = Get-Content -LiteralPath $Path -Raw
    Assert-True ($content -match $Pattern) $Message
}

function Assert-FileNotContains {
    param([string]$Path, [string]$Pattern, [string]$Message)

    Assert-True (Test-Path -LiteralPath $Path) "Missing file: $Path"
    $content = Get-Content -LiteralPath $Path -Raw
    Assert-True (-not ($content -match $Pattern)) $Message
}

$checks = @(
    @{
        Skill = '.agents/skills/react-code-generate/SKILL.md'
        Selector = '.agents/skills/react-code-generate/resources/context-loading-selector.md'
        SkillReference = 'resources/context-loading-selector.md'
        SelectorPattern = 'React Context Loading Selector'
        ForbiddenPattern = '## Must-Have Subagents'
    },
    @{
        Skill = '.agents/skills/diagram-generate/SKILL.md'
        Selector = '.agents/skills/diagram-generate/resources/diagram-prompt-selector.md'
        SkillReference = 'resources/diagram-prompt-selector.md'
        SelectorPattern = 'Diagram Prompt Selector'
        ForbiddenPattern = 'Interaction flow: `subagents/diagram-sequence-generate.md`'
    },
    @{
        Skill = '.agents/skills/test-automation-validate/SKILL.md'
        Selector = '.agents/skills/test-automation-validate/resources/test-prompt-selector.md'
        SkillReference = 'resources/test-prompt-selector.md'
        SelectorPattern = 'Test Prompt Selector'
        ForbiddenPattern = '## Must-Have Subagents'
    }
)

foreach ($check in $checks) {
    $skillPath = Join-Path $Root $check.Skill
    $selectorPath = Join-Path $Root $check.Selector

    Assert-FileContains -Path $skillPath -Pattern ([regex]::Escape($check.SkillReference)) "Skill must point to selector resource: $($check.Skill)"
    Assert-FileContains -Path $selectorPath -Pattern $check.SelectorPattern "Selector resource must describe its purpose: $($check.Selector)"
    Assert-FileNotContains -Path $skillPath -Pattern $check.ForbiddenPattern "Top-level skill should not inline broad subagent mapping: $($check.Skill)"
}

Write-Output 'progressive disclosure tests passed.'
