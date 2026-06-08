$ErrorActionPreference = 'Stop'

if (-not (Get-Command Get-CodexHoChiMinhTimeZone -ErrorAction SilentlyContinue)) {
    . (Join-Path $PSScriptRoot 'codex-config.ps1')
}

function Get-CodexOutputTimestamp {
    param([string]$Value)

    $timeZone = Get-CodexHoChiMinhTimeZone
    if ([string]::IsNullOrWhiteSpace($Value)) {
        $instant = [DateTimeOffset]::UtcNow
    } else {
        $instant = [DateTimeOffset]::Parse($Value, [Globalization.CultureInfo]::InvariantCulture)
    }

    $local = [TimeZoneInfo]::ConvertTime($instant, $timeZone)
    return $local.ToString('yyyyMMdd_HHmm', [Globalization.CultureInfo]::InvariantCulture)
}

function Convert-ToCodexOutputSlug {
    param([string]$Value)

    $slug = $Value.Trim().ToLowerInvariant()
    $slug = $slug -replace '[^a-z0-9]+', '-'
    $slug = $slug -replace '-+', '-'
    $slug = $slug.Trim('-')
    if ([string]::IsNullOrWhiteSpace($slug)) { return 'output' }

    return $slug
}

function Normalize-CodexSubpath {
    param([string]$Value)

    return ($Value -replace '\\', '/').Trim('/')
}

function Resolve-CodexOutputExtension {
    param(
        [hashtable]$ExtensionsBySubpath,
        [string]$TargetSubpath,
        [string]$DefaultExtension
    )

    $normalizedTarget = Normalize-CodexSubpath -Value $TargetSubpath
    $bestKey = $null

    foreach ($key in $ExtensionsBySubpath.Keys) {
        $normalizedKey = Normalize-CodexSubpath -Value $key
        if ($normalizedTarget -eq $normalizedKey -or $normalizedTarget.StartsWith("$normalizedKey/")) {
            if ($null -eq $bestKey -or $normalizedKey.Length -gt (Normalize-CodexSubpath -Value $bestKey).Length) {
                $bestKey = $key
            }
        }
    }

    if ($null -ne $bestKey) {
        return $ExtensionsBySubpath[$bestKey]
    }

    return $DefaultExtension
}
