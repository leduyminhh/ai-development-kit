param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

$validator = Join-Path $PSScriptRoot 'validate-naming-rule.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-naming-test-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex/agents') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex/hooks') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/java-review/subagents') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/skill-maintenance-review/scripts') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'scripts') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/workflow-validate/scripts') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'workflows/workflow-skill-maintenance-review') -Force | Out-Null

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/agents/java-review.toml') -Encoding utf8 -Value 'name = "java-review"'
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/agents/code-design-pattern.toml') -Encoding utf8 -Value 'name = "code-design-pattern"'
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/hooks/validate-workflow.ps1') -Encoding utf8 -Value '# valid hook'
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/java-review/SKILL.md') -Encoding utf8 -Value @'
---
name: java-review
description: Use when reviewing Java backend code.
---

# Java Review
'@
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/java-review/subagents/java-api-contract-review.md') -Encoding utf8 -Value '# Valid subagent'
    Set-Content -LiteralPath (Join-Path $tempRoot 'scripts/run-workflow-validate.ps1') -Encoding utf8 -Value '# valid script'
    Set-Content -LiteralPath (Join-Path $tempRoot 'workflows/workflow-skill-maintenance-review/WORKFLOW.md') -Encoding utf8 -Value @'
---
name: workflow-skill-maintenance-review
description: Valid workflow wrapper for skill maintenance review.
---

# Workflow Skill Maintenance Review
'@
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/skill-maintenance-review/scripts/add-skill-feedback.ps1') -Encoding utf8 -Value '# valid add script'
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/skill-maintenance-review/scripts/apply-skill-upgrade-proposal.py') -Encoding utf8 -Value '# valid apply script'
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/workflow-validate/scripts/validate-workflow.ps1') -Encoding utf8 -Value '# valid skill-local script'
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/diagram-wireframe-generate') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/diagram-wireframe-generate/SKILL.md') -Encoding utf8 -Value @'
---
name: diagram-wireframe-generate
description: Use when generating wireframe diagrams.
---

# Diagram Wireframe Generate
'@
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/test-automation-validate') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/test-automation-validate/SKILL.md') -Encoding utf8 -Value @'
---
name: test-automation-validate
description: Use when validating automated tests.
---

# Test Automation Validate
'@
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/java-analyze') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/java-analyze/SKILL.md') -Encoding utf8 -Value @'
---
name: java-analyze
description: Use when analyzing Java backend architecture.
---

# Java Analyze
'@
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/architecture-onion-design') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/architecture-onion-design/SKILL.md') -Encoding utf8 -Value @'
---
name: architecture-onion-design
description: Use when designing Onion Architecture.
---

# Architecture Onion Design
'@
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/code-design-pattern') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/code-design-pattern/SKILL.md') -Encoding utf8 -Value @'
---
name: code-design-pattern
description: Use when advising on code design patterns.
---

# Code Design Pattern
'@
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/skill-maintenance-review') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/skill-maintenance-review/SKILL.md') -Encoding utf8 -Value @'
---
name: skill-maintenance-review
description: Use when reviewing skill maintenance drift.
---

# Skill Maintenance Review
'@
    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/security-code-review') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/security-code-review/SKILL.md') -Encoding utf8 -Value @'
---
name: security-code-review
description: Use when reviewing source code security.
---

# Security Code Review
'@
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/agents/security-code-review.toml') -Encoding utf8 -Value 'name = "security-code-review"'
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/java-review/subagents/skill-drift-review.md') -Encoding utf8 -Value '# Valid drift subagent'

    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -PathList '.codex/agents/java-review.toml|.codex/agents/code-design-pattern.toml|.codex/agents/security-code-review.toml|skills/java-review/SKILL.md|skills/java-review/subagents/java-api-contract-review.md|skills/java-review/subagents/skill-drift-review.md|.codex/hooks/validate-workflow.ps1|scripts/run-workflow-validate.ps1|skills/skill-maintenance-review/scripts/add-skill-feedback.ps1|skills/skill-maintenance-review/scripts/apply-skill-upgrade-proposal.py|skills/workflow-validate/scripts/validate-workflow.ps1|skills/diagram-wireframe-generate/SKILL.md|skills/test-automation-validate/SKILL.md|skills/java-analyze/SKILL.md|skills/architecture-onion-design/SKILL.md|skills/code-design-pattern/SKILL.md|skills/skill-maintenance-review/SKILL.md|skills/security-code-review/SKILL.md|workflows/workflow-skill-maintenance-review/WORKFLOW.md' | Out-Null
    Assert-True ($LASTEXITCODE -eq 0) 'Naming validator should pass valid agent, skill, subagent, workflow, hook, and script names.'

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/agents/java-reviewer.toml') -Encoding utf8 -Value 'name = "java-reviewer"'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Paths '.codex/agents/java-reviewer.toml' | Out-Null
    Assert-True ($LASTEXITCODE -eq 1) 'Naming validator should reject ambiguous role suffixes like java-reviewer.'

    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/clean-code') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/clean-code/SKILL.md') -Encoding utf8 -Value @'
---
name: clean-code
description: Invalid noun-only capability.
---

# Invalid
'@
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Paths 'skills/clean-code/SKILL.md' | Out-Null
    Assert-True ($LASTEXITCODE -eq 1) 'Naming validator should reject noun-only capability names.'

    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/wireframe-diagram-generate') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/wireframe-diagram-generate/SKILL.md') -Encoding utf8 -Value @'
---
name: wireframe-diagram-generate
description: Invalid qualifier-first capability.
---

# Invalid
'@
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Paths 'skills/wireframe-diagram-generate/SKILL.md' | Out-Null
    Assert-True ($LASTEXITCODE -eq 1) 'Naming validator should reject qualifier-domain-action ordering.'

    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/activity-diagram-generate') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/activity-diagram-generate/SKILL.md') -Encoding utf8 -Value @'
---
name: activity-diagram-generate
description: Invalid qualifier-first diagram capability.
---

# Invalid
'@
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Paths 'skills/activity-diagram-generate/SKILL.md' | Out-Null
    Assert-True ($LASTEXITCODE -eq 1) 'Naming validator should reject diagram qualifier before the diagram domain.'

    New-Item -ItemType Directory -Path (Join-Path $tempRoot 'skills/automation-test-validate') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot 'skills/automation-test-validate/SKILL.md') -Encoding utf8 -Value @'
---
name: automation-test-validate
description: Invalid automation qualifier before test domain.
---

# Invalid
'@
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Paths 'skills/automation-test-validate/SKILL.md' | Out-Null
    Assert-True ($LASTEXITCODE -eq 1) 'Naming validator should reject automation qualifier before the test domain.'

    foreach ($invalidName in @('architect-onion-design', 'java-design', 'onion-pattern-design', 'pattern-design', 'pattern-onion-design', 'qa-test-review', 'shared-code-design')) {
        New-Item -ItemType Directory -Path (Join-Path $tempRoot "skills/$invalidName") -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $tempRoot "skills/$invalidName/SKILL.md") -Encoding utf8 -Value @"
---
name: $invalidName
description: Invalid qualifier-first skill name.
---

# Invalid
"@
        & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Paths "skills/$invalidName/SKILL.md" | Out-Null
        Assert-True ($LASTEXITCODE -eq 1) "Naming validator should reject qualifier-first skill name: $invalidName."
    }

    Set-Content -LiteralPath (Join-Path $tempRoot 'scripts/run-coverage-report.ps1') -Encoding utf8 -Value '# valid script name with extra noun'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Paths 'scripts/run-coverage-report.ps1' | Out-Null
    Assert-True ($LASTEXITCODE -eq 0) 'Naming validator should allow script names that start with an approved script verb.'

    Set-Content -LiteralPath (Join-Path $tempRoot 'scripts/JavaReview.ps1') -Encoding utf8 -Value '# invalid script'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $validator -Root $tempRoot -Paths 'scripts/JavaReview.ps1' | Out-Null
    Assert-True ($LASTEXITCODE -eq 1) 'Naming validator should reject non-kebab-case script names.'

    Write-Output 'naming rule validation tests passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
