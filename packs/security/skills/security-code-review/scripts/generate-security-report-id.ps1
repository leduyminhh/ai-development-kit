param(
    [string]$Scope = ".",
    [datetime]$At = (Get-Date),
    [switch]$Fix
)

$ErrorActionPreference = 'Stop'

function Convert-ToNormalizedScope {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -eq '.') {
        return 'full-project'
    }

    return (($Value -replace '^[\\/]+', '') -replace '[\\/]+', '-' -replace '[^A-Za-z0-9._-]', '-').Trim('-').ToLowerInvariant()
}

$normalizedScope = Convert-ToNormalizedScope -Value $Scope
$suffix = if ($Fix) { '_fix' } else { '' }
$scanId = "{0}_{1}{2}" -f $At.ToString('HHmmss_ddMMyyyy'), $normalizedScope, $suffix

[pscustomobject]@{
    scope            = $Scope
    normalized_scope = $normalizedScope
    report_id        = $scanId
    report_dir       = "security-reports/$scanId"
} | ConvertTo-Json -Depth 3
