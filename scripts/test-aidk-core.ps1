param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Invoke-AidkJson {
    param(
        [string]$Action,
        [string]$TargetRoot,
        [string]$SourceRoot = $Root,
        [string[]]$ExtraArgs = @()
    )

    $cli = Join-Path $Root 'scripts/invoke-aidk.ps1'
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $cli `
        -Action $Action `
        -Root $SourceRoot `
        -TargetRoot $TargetRoot `
        -Json `
        @ExtraArgs
    if ($LASTEXITCODE -ne 0) {
        throw "AIDK action failed: $Action`n$($output -join "`n")"
    }

    return (@($output) -join "`n") | ConvertFrom-Json
}

$cli = Join-Path $Root 'scripts/invoke-aidk.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("aidk-core-test-" + [guid]::NewGuid().ToString())
$tempSource = Join-Path ([System.IO.Path]::GetTempPath()) ("aidk-source-test-" + [guid]::NewGuid().ToString())

try {
    Assert-True (Test-Path -LiteralPath $cli) 'AIDK CLI wrapper should exist.'

    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

    $validation = Invoke-AidkJson -Action 'validate' -TargetRoot $tempRoot
    Assert-True ($validation.status -eq 'pass') 'Repository AIDK contracts should validate.'
    Assert-True ($validation.packageCount -ge 6) 'At least six initial packages should be registered.'
    Assert-True ($validation.skillCount -ge 16) 'Package validation should resolve the current skill manifest.'

    New-Item -ItemType Directory -Path $tempSource -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempSource 'skills') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempSource '.codex') -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $Root 'aidk.config.yaml') -Destination $tempSource
    Copy-Item -LiteralPath (Join-Path $Root 'schemas') -Destination $tempSource -Recurse
    Copy-Item -LiteralPath (Join-Path $Root 'packages') -Destination $tempSource -Recurse
    Copy-Item -LiteralPath (Join-Path $Root 'skills/manifest.toml') -Destination (Join-Path $tempSource 'skills/manifest.toml')
    Copy-Item -LiteralPath (Join-Path $Root '.codex/agents') -Destination (Join-Path $tempSource '.codex') -Recurse
    Copy-Item -LiteralPath (Join-Path $Root '.codex/workflows') -Destination (Join-Path $tempSource '.codex') -Recurse

    $backendPackagePath = Join-Path $tempSource 'packages/backend/package.yaml'
    $backendPackageOriginal = Get-Content -LiteralPath $backendPackagePath -Raw
    $backendPackage = $backendPackageOriginal | ConvertFrom-Json
    $backendPackage.assets.skills += 'missing-skill'
    $backendPackageJson = $backendPackage | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($backendPackagePath, $backendPackageJson, [System.Text.UTF8Encoding]::new($false))
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $unknownSkillOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $cli `
            -Action validate `
            -Root $tempSource `
            -TargetRoot $tempRoot `
            -Json 2>&1
        $unknownSkillExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Assert-True ($unknownSkillExitCode -ne 0) 'Validation should reject a package with an unknown skill.'
    Assert-True ((@($unknownSkillOutput) -join "`n") -match 'unknown skill missing-skill') 'Unknown skill failure should identify the invalid reference.'

    [System.IO.File]::WriteAllText($backendPackagePath, $backendPackageOriginal, [System.Text.UTF8Encoding]::new($false))
    $architecturePackagePath = Join-Path $tempSource 'packages/architecture/package.yaml'
    $architecturePackage = Get-Content -LiteralPath $architecturePackagePath -Raw | ConvertFrom-Json
    $architecturePackage.dependencies.required += 'backend'
    $architecturePackageJson = $architecturePackage | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($architecturePackagePath, $architecturePackageJson, [System.Text.UTF8Encoding]::new($false))
    $ErrorActionPreference = 'Continue'
    try {
        $cycleOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $cli `
            -Action validate `
            -Root $tempSource `
            -TargetRoot $tempRoot `
            -Json 2>&1
        $cycleExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Assert-True ($cycleExitCode -ne 0) 'Validation should reject required dependency cycles.'
    Assert-True ((@($cycleOutput) -join "`n") -match 'dependency cycle') 'Cycle failure should be explicit.'

    $structureValidator = Join-Path $Root 'skills/codex-structure-validate/scripts/validate-codex-structure.ps1'
    $structureOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $structureValidator -Root $Root
    Assert-True ($LASTEXITCODE -eq 0) 'Structure validator should accept valid AIDK contracts.'
    Assert-True ((@($structureOutput) -join "`n") -match 'AIDK contracts validate') 'Structure validator should report AIDK validation evidence.'

    $plan = Invoke-AidkJson -Action 'plan' -TargetRoot $tempRoot -ExtraArgs @(
        '-Package', 'backend,security',
        '-Provider', 'codex,claude,cursor'
    )
    Assert-True ($plan.status -eq 'pass') 'Plan should succeed.'
    Assert-True (@($plan.packages) -contains 'backend') 'Plan should include backend.'
    Assert-True (@($plan.packages) -contains 'security') 'Plan should include security.'
    Assert-True (@($plan.skills) -contains 'java-analyze') 'Backend package should resolve java-analyze.'
    Assert-True (@($plan.skills) -contains 'security-code-review') 'Security package should resolve security-code-review.'
    Assert-True (@($plan.providers) -contains 'codex') 'Plan should include Codex.'
    Assert-True (@($plan.artifacts | Where-Object { $_.path -eq '.codex-plugin/plugin.json' }).Count -eq 1) 'Codex adapter should plan its plugin manifest.'
    Assert-True (@($plan.artifacts | Where-Object { $_.path -eq '.claude-plugin/plugin.json' }).Count -eq 1) 'Claude adapter should plan its plugin manifest.'
    Assert-True (@($plan.artifacts | Where-Object { $_.path -eq '.cursor-plugin/plugin.json' }).Count -eq 1) 'Cursor adapter should plan its plugin manifest.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $tempRoot '.aidk/install-state.json'))) 'Plan must not write install state.'

    $repoPlan = Invoke-AidkJson -Action 'plan' -TargetRoot $Root
    foreach ($artifact in @($repoPlan.artifacts | Where-Object { $_.path -match '^\.(codex|claude|cursor)-plugin/plugin\.json$' })) {
        $checkedInPath = Join-Path $Root $artifact.path
        Assert-True (Test-Path -LiteralPath $checkedInPath) "Checked-in provider projection should exist: $($artifact.path)"
        $checkedIn = Get-Content -LiteralPath $checkedInPath -Raw
        Assert-True ($checkedIn -eq $artifact.content) "Checked-in provider projection should match canonical AIDK metadata: $($artifact.path)"
    }

    $export = Invoke-AidkJson -Action 'export' -TargetRoot $tempRoot -ExtraArgs @(
        '-Package', 'backend,security',
        '-Provider', 'codex,claude,cursor'
    )
    Assert-True ($export.status -eq 'pass') 'Export should succeed.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex-plugin/plugin.json')) 'Codex manifest should be exported.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.claude-plugin/plugin.json')) 'Claude manifest should be exported.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.cursor-plugin/plugin.json')) 'Cursor manifest should be exported.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot 'skills/java-analyze/SKILL.md')) 'Export should include resolved backend skill assets.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot 'skills/security-code-review/SKILL.md')) 'Export should include resolved security skill assets.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $tempRoot 'skills/react-code-generate/SKILL.md'))) 'Export should not include skills outside the resolved package set.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot 'adapters/claude/hooks.json')) 'Claude export should include its hook adapter.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot 'adapters/cursor/hooks.json')) 'Cursor export should include its hook adapter.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $tempRoot '.aidk/install-state.json'))) 'Export must not write install state.'

    $install = Invoke-AidkJson -Action 'install' -TargetRoot $tempRoot -ExtraArgs @(
        '-Package', 'backend,security',
        '-Provider', 'codex,claude,cursor'
    )
    Assert-True ($install.status -eq 'pass') 'Install should succeed.'
    $statePath = Join-Path $tempRoot '.aidk/install-state.json'
    Assert-True (Test-Path -LiteralPath $statePath) 'Install should write state after generated files validate.'
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    Assert-True ($state.schemaVersion -eq 1) 'Install state should use schema version 1.'
    Assert-True ($state.packages.backend -eq '1.0.0') 'Install state should pin backend version.'
    Assert-True (@($state.generatedFiles).Count -ge 3) 'Install state should own generated adapter files.'
    Assert-True (@($state.hooks) -contains 'project-audit') 'Install state should record package hook integration.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.ai-hooks/invoke-hook.ps1')) 'Install should reuse the existing hook runtime installer.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.codex/hooks/invoke-ai-hook.ps1')) 'Install should create the Codex hook shim.'
    Assert-True (Test-Path -LiteralPath (Join-Path $tempRoot '.claude/hooks/invoke-ai-hook.ps1')) 'Install should create the Claude hook shim.'

    Set-Content -LiteralPath (Join-Path $tempRoot '.codex-plugin/plugin.json') -Encoding utf8 -Value '{"userOwned":true}'
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $conflictOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $cli `
            -Action install `
            -Root $Root `
            -TargetRoot $tempRoot `
            -Package 'backend,security' `
            -Provider 'codex,claude,cursor' `
            -Json 2>&1
        $conflictExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    Assert-True ($conflictExitCode -ne 0) 'Install should fail when a managed file has drifted under ask policy.'
    Assert-True ((@($conflictOutput) -join "`n") -match 'conflict') 'Conflict failure should be explicit.'

    $overwrite = Invoke-AidkJson -Action 'install' -TargetRoot $tempRoot -ExtraArgs @(
        '-Package', 'backend,security',
        '-Provider', 'codex,claude,cursor',
        '-OverwritePolicy', 'overwrite'
    )
    Assert-True ($overwrite.status -eq 'pass') 'Explicit overwrite should resolve managed-file drift.'
    $codexManifest = Get-Content -LiteralPath (Join-Path $tempRoot '.codex-plugin/plugin.json') -Raw | ConvertFrom-Json
    Assert-True ($codexManifest.name -eq 'ai-engineering-platform') 'Overwrite should restore generated Codex metadata.'

    $remove = Invoke-AidkJson -Action 'remove' -TargetRoot $tempRoot
    Assert-True ($remove.status -eq 'pass') 'Remove should delete only recorded generated artifacts.'
    Assert-True (-not (Test-Path -LiteralPath $statePath)) 'Remove should delete install state.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $tempRoot '.codex-plugin/plugin.json'))) 'Remove should delete recorded Codex output.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $tempRoot 'skills/java-analyze/SKILL.md'))) 'Remove should delete recorded skill assets.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $tempRoot '.ai-hooks'))) 'Remove should reuse the hook uninstaller.'

    Write-Output 'aidk core tests passed.'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
    if (Test-Path -LiteralPath $tempSource) {
        Remove-Item -LiteralPath $tempSource -Recurse -Force
    }
}
