$ErrorActionPreference = 'Stop'

function Get-CodexTomlSection {
    param([string]$TomlText, [string]$Section)

    if ([string]::IsNullOrWhiteSpace($Section)) {
        $rootMatch = [regex]::Match($TomlText, '(?ms)\A(.*?)(?=^\[|\z)')
        if (-not $rootMatch.Success) { return '' }
        return $rootMatch.Groups[1].Value
    }

    $pattern = "(?ms)^\[$([regex]::Escape($Section))\]\s*(.*?)(?=^\[|\z)"
    $match = [regex]::Match($TomlText, $pattern)
    if (-not $match.Success) { return '' }

    return $match.Groups[1].Value
}

function Get-CodexTomlRawValue {
    param([string]$TomlText, [string]$Section, [string]$Key)

    $sectionText = Get-CodexTomlSection -TomlText $TomlText -Section $Section
    if ([string]::IsNullOrWhiteSpace($sectionText)) { return $null }

    $pattern = "(?m)^\s*$([regex]::Escape($Key))\s*=\s*(.+?)\s*$"
    $match = [regex]::Match($sectionText, $pattern)
    if (-not $match.Success) { return $null }

    return $match.Groups[1].Value.Trim()
}

function Get-CodexTomlStringValue {
    param([string]$TomlText, [string]$Section, [string]$Key)

    $raw = Get-CodexTomlRawValue -TomlText $TomlText -Section $Section -Key $Key
    if ($null -eq $raw) { return $null }

    $quoted = [regex]::Match($raw, '^"([^"]*)"$')
    if ($quoted.Success) {
        return $quoted.Groups[1].Value
    }

    return $raw.Trim('"')
}

function Get-CodexTomlBoolValue {
    param([string]$TomlText, [string]$Section, [string]$Key, [bool]$Default = $false)

    $raw = Get-CodexTomlRawValue -TomlText $TomlText -Section $Section -Key $Key
    if ([string]::IsNullOrWhiteSpace($raw)) { return $Default }
    if ($raw -match '^(true|false)$') { return $raw -eq 'true' }

    return $Default
}

function Get-CodexTomlArrayValue {
    param([string]$TomlText, [string]$Section, [string]$Key, [string[]]$Default = @())

    $sectionText = Get-CodexTomlSection -TomlText $TomlText -Section $Section
    if ([string]::IsNullOrWhiteSpace($sectionText)) {
        return $Default
    }

    $pattern = "(?ms)^\s*$([regex]::Escape($Key))\s*=\s*\[(.*?)\]"
    $match = [regex]::Match($sectionText, $pattern)
    if (-not $match.Success) { return $Default }

    $values = New-Object System.Collections.Generic.List[string]
    foreach ($item in [regex]::Matches($match.Groups[1].Value, '"([^"]+)"')) {
        $values.Add($item.Groups[1].Value)
    }

    return $values.ToArray()
}

function Get-CodexTomlStringMap {
    param([string]$TomlText, [string]$Section)

    $map = @{}
    $sectionText = Get-CodexTomlSection -TomlText $TomlText -Section $Section
    if ([string]::IsNullOrWhiteSpace($sectionText)) { return $map }

    foreach ($match in [regex]::Matches($sectionText, '(?m)^\s*"([^"]+)"\s*=\s*"([^"]+)"\s*$')) {
        $map[$match.Groups[1].Value] = $match.Groups[2].Value
    }

    return $map
}

function Get-CodexTomlSections {
    param([string]$TomlText)

    $sections = New-Object System.Collections.Generic.List[string]
    foreach ($match in [regex]::Matches($TomlText, '(?m)^\[([^\]]+)\]\s*$')) {
        $sections.Add($match.Groups[1].Value)
    }

    return $sections.ToArray()
}

function Get-CodexHoChiMinhTimeZone {
    try {
        return [TimeZoneInfo]::FindSystemTimeZoneById('SE Asia Standard Time')
    } catch {
        return [TimeZoneInfo]::CreateCustomTimeZone('Asia/Saigon', [TimeSpan]::FromHours(7), 'Asia/Saigon', 'Asia/Saigon')
    }
}
