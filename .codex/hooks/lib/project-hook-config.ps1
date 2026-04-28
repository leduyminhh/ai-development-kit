$ErrorActionPreference = 'Stop'

function Resolve-ProjectHookTimeZone {
    param([string]$TimeZoneId)

    if ([string]::IsNullOrWhiteSpace($TimeZoneId) -or $TimeZoneId -eq 'Asia/Saigon') {
        return Get-CodexHoChiMinhTimeZone
    }

    try {
        return [TimeZoneInfo]::FindSystemTimeZoneById($TimeZoneId)
    } catch {
        return Get-CodexHoChiMinhTimeZone
    }
}

function Get-ProjectHookSettings {
    param(
        [string]$Root,
        [string]$EventRoot,
        [string]$Format,
        [int]$RemainingDays = -1
    )

    $configPath = Join-Path $Root '.codex/config.toml'
    $configText = if (Test-Path -LiteralPath $configPath) {
        Get-Content -LiteralPath $configPath -Raw
    } else {
        ''
    }

    $configuredRoot = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'path'
    if ([string]::IsNullOrWhiteSpace($configuredRoot)) {
        $configuredRoot = 'reports/audit'
    }

    $configuredRuntimeRoot = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'runtimePath'
    if ([string]::IsNullOrWhiteSpace($configuredRuntimeRoot)) {
        $configuredRuntimeRoot = 'reports/audit/runtime'
    }

    if ($RemainingDays -lt 0) {
        $RemainingDays = Get-CodexTomlIntValue -TomlText $configText -Section 'hooks.project' -Key 'remainingDays' -Default 30
    }

    if ([string]::IsNullOrWhiteSpace($Format)) {
        $Format = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'format'
        if ([string]::IsNullOrWhiteSpace($Format)) {
            $Format = 'text'
        }
    }

    $serviceName = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'serviceName'
    if ([string]::IsNullOrWhiteSpace($serviceName)) {
        $serviceName = 'codex-workflow-kit'
    }

    $defaultLogger = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'defaultLogger'
    if ([string]::IsNullOrWhiteSpace($defaultLogger)) {
        $defaultLogger = 'codex.project'
    }

    $filenamePattern = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'filenamePattern'
    if ([string]::IsNullOrWhiteSpace($filenamePattern)) {
        $filenamePattern = 'yyyyMMdd_filename'
    }

    $timeZoneId = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'defaultTimezone'
    if ([string]::IsNullOrWhiteSpace($timeZoneId)) {
        $timeZoneId = 'Asia/Saigon'
    }

    $bindHost = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'host'
    if ([string]::IsNullOrWhiteSpace($bindHost)) {
        $bindHost = '127.0.0.1'
    }

    $port = Get-CodexTomlIntValue -TomlText $configText -Section 'hooks.project' -Key 'port' -Default 42890

    [pscustomobject]@{
        Enabled            = Get-CodexTomlBoolValue -TomlText $configText -Section 'hooks.project' -Key 'enabled' -Default $true
        EventRoot          = if ([string]::IsNullOrWhiteSpace($EventRoot)) { Join-Path $Root $configuredRoot } else { $EventRoot }
        RuntimeRoot        = Join-Path $Root $configuredRuntimeRoot
        RemainingDays      = $RemainingDays
        Format             = $Format.ToLowerInvariant()
        FilenamePattern = $filenamePattern
        ServiceName        = $serviceName
        DefaultLogger      = $defaultLogger
        TimeZoneId         = $timeZoneId
        TimeZone           = Resolve-ProjectHookTimeZone -TimeZoneId $timeZoneId
        AgentHook          = Get-CodexTomlStringValue -TomlText $configText -Section 'hooks.project' -Key 'agentHook'
        Host               = $bindHost
        Port               = $port
        ReloadOnConfigChange = Get-CodexTomlBoolValue -TomlText $configText -Section 'hooks.project' -Key 'reloadOnConfigChange' -Default $true
        ConfigPath         = $configPath
    }
}

function Get-ProjectHookAgentRegistration {
    param(
        [string]$Root,
        [string]$AgentName
    )

    $configPath = Join-Path $Root '.codex/config.toml'
    if (-not (Test-Path -LiteralPath $configPath)) {
        return [pscustomobject]@{
            Exists               = $false
            Enabled              = $false
            HooksProjectEnabled  = $false
        }
    }

    $configText = Get-Content -LiteralPath $configPath -Raw
    $sectionName = "agent_registry.$AgentName"
    $legacySectionName = "agents.$AgentName"
    $resolvedSectionName = if (-not [string]::IsNullOrWhiteSpace((Get-CodexTomlSection -TomlText $configText -Section $sectionName))) {
        $sectionName
    } elseif (-not [string]::IsNullOrWhiteSpace((Get-CodexTomlSection -TomlText $configText -Section $legacySectionName))) {
        $legacySectionName
    } else {
        $null
    }

    return [pscustomobject]@{
        Exists              = -not [string]::IsNullOrWhiteSpace($resolvedSectionName)
        Enabled             = if ($resolvedSectionName) { Get-CodexTomlBoolValue -TomlText $configText -Section $resolvedSectionName -Key 'enabled' -Default $false } else { $false }
        HooksProjectEnabled = if ($resolvedSectionName) { Get-CodexTomlBoolValue -TomlText $configText -Section $resolvedSectionName -Key 'hooks_project_enabled' -Default $false } else { $false }
    }
}

function Test-ProjectHookAgentEnabled {
    param(
        [string]$Root,
        [string]$AgentName
    )

    $registration = Get-ProjectHookAgentRegistration -Root $Root -AgentName $AgentName
    return ($registration.Exists -and $registration.Enabled -and $registration.HooksProjectEnabled)
}
