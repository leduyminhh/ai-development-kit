param(
    [string]$TargetRoot = $(if (Test-Path (Join-Path $PSScriptRoot '../src/commands/generate-adapter.ts')) {
        (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
    } else {
        (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    }),

    [ValidateSet('install', 'repair', 'uninstall')]
    [string]$Action = 'install',

    [ValidateSet('all', 'codex', 'claude', 'none')]
    [string]$Provider = 'all',

    [ValidateSet('cli', 'http')]
    [string]$Transport = 'cli',

    [ValidateSet('observe', 'warn', 'enforce')]
    [string]$Mode = 'observe',

    [string]$HttpUrl = 'http://127.0.0.1:42890/v1/events',

    [string]$SharedTokenEnv = '',

    [switch]$Force,

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function New-HookInstallResult {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Path,
        [string]$Reason
    )

    [pscustomobject][ordered]@{
        name = $Name
        status = $Status
        path = $Path
        reason = $Reason
    }
}

function Ensure-HookDirectory {
    param([string]$Path)

    if ($DryRun) {
        return
    }

    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Copy-HookRuntime {
    param([string]$TargetRoot)

    $runtimeRoot = Join-Path $TargetRoot '.ai-hooks'
    $sourceHooks = Join-Path $PSScriptRoot 'hooks'
    $targetHooks = Join-Path $runtimeRoot 'hooks'

    Ensure-HookDirectory -Path $runtimeRoot
    Ensure-HookDirectory -Path $targetHooks
    if (-not $DryRun) {
        Copy-Item -Path (Join-Path $sourceHooks '*') -Destination $targetHooks -Recurse -Force
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'invoke-hook.ps1') -Destination (Join-Path $runtimeRoot 'invoke-hook.ps1') -Force
    }

    [pscustomobject][ordered]@{
        root = $runtimeRoot
        marker = Join-Path $runtimeRoot 'install.json'
    }
}

function Write-HookRuntimeMarker {
    param(
        [pscustomobject]$Runtime,
        [string]$Transport,
        [string]$Mode,
        [string]$HttpUrl
    )

    $marker = [ordered]@{
        schema = 'ai.hook.install.v1'
        installedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
        transport = $Transport
        mode = $Mode
        httpUrl = $HttpUrl
    }
    if (-not $DryRun) {
        $marker | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $Runtime.marker -Encoding utf8
    }
}

function Add-HookConfigSections {
    param(
        [string]$TargetRoot,
        [string]$Transport,
        [string]$Mode,
        [string]$HttpUrl,
        [string]$SharedTokenEnv
    )

    $configPath = Join-Path $TargetRoot '.codex/config.toml'
    Ensure-HookDirectory -Path (Split-Path -Parent $configPath)
    $configText = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw } else { '' }
    $append = New-Object 'System.Collections.Generic.List[string]'

    if ($configText -notmatch '(?m)^\[hooks\.core\]\s*$') {
        $append.Add('')
        $append.Add('[hooks.core]')
        $append.Add('enabled = true')
        $append.Add("mode = `"$Mode`"")
        $append.Add("transport = `"$Transport`"")
        $append.Add('timeoutMs = 1500')
        $append.Add('failureMode = "abstain"')
    }

    if ($configText -notmatch '(?m)^\[hooks\.http\]\s*$') {
        $append.Add('')
        $append.Add('[hooks.http]')
        $append.Add("url = `"$HttpUrl`"")
        $append.Add("sharedTokenEnv = `"$SharedTokenEnv`"")
        $append.Add('teamId = ""')
        $append.Add('projectId = ""')
        $append.Add('clientName = ""')
        $append.Add('maxRequestBytes = 262144')
    }

    if ($append.Count -eq 0) {
        return New-HookInstallResult -Name 'config' -Status 'skipped' -Path $configPath -Reason 'hooks.core and hooks.http already exist.'
    }

    if (-not $DryRun) {
        $newText = $configText.TrimEnd() + (($append.ToArray() -join [Environment]::NewLine)) + [Environment]::NewLine
        Set-Content -LiteralPath $configPath -Value $newText -Encoding utf8
    }
    return New-HookInstallResult -Name 'config' -Status $(if ($DryRun) { 'planned' } else { 'installed' }) -Path $configPath -Reason 'missing hook config sections appended.'
}

function Test-ProviderHookConflict {
    param([string]$HookRoot)

    if (-not (Test-Path -LiteralPath $HookRoot)) {
        return $false
    }

    $files = @(Get-ChildItem -LiteralPath $HookRoot -File -ErrorAction SilentlyContinue)
    if ($files.Count -eq 0) {
        return $false
    }

    return $true
}

function Install-ProviderShim {
    param(
        [string]$TargetRoot,
        [string]$ProviderName,
        [string]$HookRoot
    )

    if ((Test-ProviderHookConflict -HookRoot $HookRoot) -and -not $Force) {
        return New-HookInstallResult -Name $ProviderName -Status 'skipped' -Path $HookRoot -Reason 'existing provider hook files detected.'
    }

    Ensure-HookDirectory -Path $HookRoot
    $shimPath = Join-Path $HookRoot 'invoke-ai-hook.ps1'
    $relativeUp = if ($ProviderName -ceq 'codex') { '..\..' } else { '..\..' }
    $content = @"
param()

`$ErrorActionPreference = 'Stop'
`$targetRoot = (Resolve-Path (Join-Path `$PSScriptRoot '$relativeUp')).Path
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path `$targetRoot '.ai-hooks/invoke-hook.ps1')
"@
    if (-not $DryRun) {
        Set-Content -LiteralPath $shimPath -Value $content -Encoding utf8
    }
    return New-HookInstallResult -Name $ProviderName -Status $(if ($DryRun) { 'planned' } else { 'installed' }) -Path $shimPath -Reason 'provider shim installed.'
}

function Remove-HookRuntime {
    param([string]$TargetRoot)

    $runtimeRoot = Join-Path $TargetRoot '.ai-hooks'
    if (-not (Test-Path -LiteralPath $runtimeRoot)) {
        return New-HookInstallResult -Name 'runtime' -Status 'skipped' -Path $runtimeRoot -Reason 'hook runtime is not installed.'
    }

    if (-not $DryRun) {
        Remove-Item -LiteralPath $runtimeRoot -Recurse -Force
    }

    return New-HookInstallResult -Name 'runtime' -Status $(if ($DryRun) { 'planned' } else { 'removed' }) -Path $runtimeRoot -Reason 'hook runtime removed.'
}

function Remove-ProviderShim {
    param(
        [string]$ProviderName,
        [string]$HookRoot
    )

    $shimPath = Join-Path $HookRoot 'invoke-ai-hook.ps1'
    if (-not (Test-Path -LiteralPath $shimPath)) {
        return New-HookInstallResult -Name $ProviderName -Status 'skipped' -Path $shimPath -Reason 'provider shim is not installed.'
    }

    if (-not $DryRun) {
        Remove-Item -LiteralPath $shimPath -Force
    }

    return New-HookInstallResult -Name $ProviderName -Status $(if ($DryRun) { 'planned' } else { 'removed' }) -Path $shimPath -Reason 'provider shim removed.'
}

$resolvedTargetRoot = if (Test-Path -LiteralPath $TargetRoot) {
    (Resolve-Path $TargetRoot).Path
} elseif ($DryRun) {
    [System.IO.Path]::GetFullPath($TargetRoot)
} else {
    New-Item -ItemType Directory -Path $TargetRoot -Force | Out-Null
    (Resolve-Path $TargetRoot).Path
}

$results = New-Object 'System.Collections.Generic.List[object]'
if ($Action -ceq 'uninstall') {
    $results.Add((Remove-HookRuntime -TargetRoot $resolvedTargetRoot))
    if ($Provider -in @('all', 'codex')) {
        $results.Add((Remove-ProviderShim -ProviderName 'codex' -HookRoot (Join-Path $resolvedTargetRoot '.codex/hooks')))
    }
    if ($Provider -in @('all', 'claude')) {
        $results.Add((Remove-ProviderShim -ProviderName 'claude' -HookRoot (Join-Path $resolvedTargetRoot '.claude/hooks')))
    }
    $results.Add((New-HookInstallResult -Name 'config' -Status 'skipped' -Path (Join-Path $resolvedTargetRoot '.codex/config.toml') -Reason 'config is preserved by uninstall.'))
} else {
    $runtime = Copy-HookRuntime -TargetRoot $resolvedTargetRoot
    Write-HookRuntimeMarker -Runtime $runtime -Transport $Transport -Mode $Mode -HttpUrl $HttpUrl
    $results.Add((New-HookInstallResult -Name 'runtime' -Status $(if ($DryRun) { 'planned' } else { 'installed' }) -Path $runtime.root -Reason 'hook runtime copied.'))
    $results.Add((Add-HookConfigSections -TargetRoot $resolvedTargetRoot -Transport $Transport -Mode $Mode -HttpUrl $HttpUrl -SharedTokenEnv $SharedTokenEnv))

    if ($Provider -in @('all', 'codex')) {
        $results.Add((Install-ProviderShim -TargetRoot $resolvedTargetRoot -ProviderName 'codex' -HookRoot (Join-Path $resolvedTargetRoot '.codex/hooks')))
    }

    if ($Provider -in @('all', 'claude')) {
        $results.Add((Install-ProviderShim -TargetRoot $resolvedTargetRoot -ProviderName 'claude' -HookRoot (Join-Path $resolvedTargetRoot '.claude/hooks')))
    }
}

$results.ToArray() | ConvertTo-Json -Depth 6
